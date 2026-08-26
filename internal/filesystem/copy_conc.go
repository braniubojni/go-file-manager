package filesystem

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

const (
	largeCopyFileBytes = 32 << 20 // 32 MiB: one stream (HDD/DMG/huge videos)
	maxCopyWorkers     = 4        // many small files on SSD
)

type copyStats struct {
	total int64
	max   int64
	files int
}

func collectCopyStats(paths []string) (copyStats, error) {
	var st copyStats
	for _, p := range paths {
		abs, err := Resolve(p)
		if err != nil {
			return st, err
		}
		if err := addCopyStats(&st, abs); err != nil {
			return st, err
		}
	}
	return st, nil
}

func addCopyStats(st *copyStats, path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return nil
	}
	if !info.IsDir() {
		st.files++
		st.total += info.Size()
		if info.Size() > st.max {
			st.max = info.Size()
		}
		return nil
	}
	return filepath.Walk(path, func(p string, fi os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if fi.Mode()&os.ModeSymlink != 0 || fi.IsDir() {
			return nil
		}
		st.files++
		st.total += fi.Size()
		if fi.Size() > st.max {
			st.max = fi.Size()
		}
		return nil
	})
}

func copyWorkerCount(st copyStats) int {
	if st.files <= 1 || st.max >= largeCopyFileBytes {
		return 1
	}
	n := st.files
	if n > maxCopyWorkers {
		n = maxCopyWorkers
	}
	if n < 1 {
		n = 1
	}
	return n
}

type fileJob struct {
	src, dst string
	mode     os.FileMode
}

type copier struct {
	ctx     context.Context
	cancel  context.CancelFunc
	rep     *progressReporter
	jobs    chan fileJob
	wg      sync.WaitGroup
	errOnce sync.Once
	err     error
}

func (c *copier) fail(err error) {
	if err == nil {
		return
	}
	c.errOnce.Do(func() {
		c.err = err
		c.cancel()
	})
}

func (c *copier) start(workers int) {
	c.jobs = make(chan fileJob, workers*2)
	for i := 0; i < workers; i++ {
		c.wg.Add(1)
		go func() {
			defer c.wg.Done()
			for j := range c.jobs {
				if err := copyFileCtx(c.ctx, j.src, j.dst, j.mode, c.rep); err != nil {
					c.fail(preferCanceled(c.ctx, err))
				}
			}
		}()
	}
}

func (c *copier) enqueue(src, dst string, mode os.FileMode) error {
	select {
	case <-c.ctx.Done():
		return c.ctx.Err()
	case c.jobs <- fileJob{src: src, dst: dst, mode: mode}:
		return nil
	}
}

func (c *copier) finish() error {
	close(c.jobs)
	c.wg.Wait()
	if c.err != nil {
		return c.err
	}
	return c.ctx.Err()
}

func (c *copier) place(src, dst string) error {
	if err := c.ctx.Err(); err != nil {
		return err
	}
	info, err := os.Lstat(src)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		target, err := os.Readlink(src)
		if err != nil {
			return err
		}
		return os.Symlink(target, dst)
	}
	if info.IsDir() {
		return c.walkDir(src, dst, info.Mode())
	}
	return c.enqueue(src, dst, info.Mode())
}

func (c *copier) walkDir(src, dst string, mode os.FileMode) error {
	if err := clonePath(src, dst); err == nil {
		if err := c.ctx.Err(); err != nil {
			return err
		}
		n, err := pathBytes(src)
		if err != nil || n <= 0 {
			n = 1
		}
		c.rep.addAt(n, src, dst, true)
		return nil
	}
	if err := os.MkdirAll(dst, mode.Perm()); err != nil {
		return err
	}
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := c.ctx.Err(); err != nil {
			return err
		}
		if err := c.place(filepath.Join(src, e.Name()), filepath.Join(dst, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

// CopyCtx copies sources into destDir with optional progress and cancel.
// On context cancel, every dest root this call created is removed.
// Large files share one stream; batches of small files use up to 4 workers.
func CopyCtx(ctx context.Context, sources []string, destDir string, onProgress ProgressFunc) (err error) {
	if ctx == nil {
		ctx = context.Background()
	}
	destAbs, err := Resolve(destDir)
	if err != nil {
		return err
	}
	info, err := os.Stat(destAbs)
	if err != nil {
		return err
	}
	if !info.IsDir() {
		return fmt.Errorf("destination is not a directory: %s", destAbs)
	}

	st, err := collectCopyStats(sources)
	if err != nil {
		return err
	}
	rep := newProgressReporter(st.total, onProgress)
	if onProgress != nil {
		onProgress(ProgressEvent{Total: st.total})
	}

	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	c := &copier{ctx: ctx, cancel: cancel, rep: rep}
	c.start(copyWorkerCount(st))

	var created []string
	defer func() { removeCreatedOnErr(err, created) }()

	var placeErr error
	for _, src := range sources {
		if err := ctx.Err(); err != nil {
			placeErr = err
			break
		}
		srcAbs, err := Resolve(src)
		if err != nil {
			placeErr = err
			break
		}
		if srcAbs == destAbs || strings.HasPrefix(destAbs+string(os.PathSeparator), srcAbs+string(os.PathSeparator)) {
			if isDir(srcAbs) {
				placeErr = fmt.Errorf("cannot copy directory into itself: %s", srcAbs)
				break
			}
		}
		base := filepath.Base(srcAbs)
		target := UniquePath(filepath.Join(destAbs, base))
		created = append(created, target)
		rep.setDest(target, isDir(srcAbs))
		if err := c.place(srcAbs, target); err != nil {
			placeErr = preferCanceled(ctx, err)
			break
		}
	}
	if placeErr != nil {
		cancel()
	}
	waitErr := c.finish()
	if placeErr != nil {
		err = placeErr
		return err
	}
	if waitErr != nil {
		err = waitErr
		return err
	}
	rep.finish("")
	return nil
}
