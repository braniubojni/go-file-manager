package filesystem

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

type copyStats struct {
	total int64
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

// CollectCopyStats returns file count and recursive byte size of paths.
func CollectCopyStats(paths []string) (files int, total int64, err error) {
	st, err := collectCopyStats(paths)
	if err != nil {
		return 0, 0, err
	}
	return st.files, st.total, nil
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
		return nil
	})
}

type fileJob struct {
	// ctx is this job's own top-level source's context (a child of copier.ctx),
	// so cancelling one source via FileCancelRegistry doesn't fail the batch.
	ctx      context.Context
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
				jctx := j.ctx
				if jctx == nil {
					jctx = c.ctx
				}
				if err := copyFileCtx(jctx, j.src, j.dst, j.mode, c.rep); err != nil {
					if c.ctx.Err() == nil && errors.Is(jctx.Err(), context.Canceled) {
						// only this job's own top-level source was cancelled
						// (FileCancelRegistry) — skip it, the batch keeps going.
						continue
					}
					c.fail(preferCanceled(c.ctx, err))
				}
			}
		}()
	}
}

func (c *copier) enqueue(ctx context.Context, src, dst string, mode os.FileMode) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case c.jobs <- fileJob{ctx: ctx, src: src, dst: dst, mode: mode}:
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

// place enqueues src (a file, dir, or symlink) under ctx — the calling
// top-level source's own context, so a FileCancelRegistry.Cancel for just
// that source stops walking/enqueuing without touching sibling sources.
func (c *copier) place(ctx context.Context, src, dst string) error {
	if err := ctx.Err(); err != nil {
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
		return c.walkDir(ctx, src, dst, info.Mode())
	}
	return c.enqueue(ctx, src, dst, info.Mode())
}

func (c *copier) walkDir(ctx context.Context, src, dst string, mode os.FileMode) error {
	if err := clonePath(src, dst); err == nil {
		if err := ctx.Err(); err != nil {
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
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := c.place(ctx, filepath.Join(src, e.Name()), filepath.Join(dst, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

// CopyCtx copies sources into destDir with optional progress and cancel.
// On context cancel, every dest root this call created is removed.
// Worker count comes from CPU and probed I/O class of source and dest.
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

	absSources := make([]string, 0, len(sources))
	for _, src := range sources {
		if a, err := Resolve(src); err == nil {
			absSources = append(absSources, a)
		}
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	c := &copier{ctx: ctx, cancel: cancel, rep: rep}
	c.start(copyWorkers(absSources, destAbs, st.files))

	var created []string
	var succeeded []string
	var canceled []string
	defer func() {
		removeCreatedOnErr(err, created)
		for _, p := range canceled {
			removeAllRetry(p)
		}
	}()
	registry := fileCancelRegistryFrom(ctx)
	// Per-source contexts stay registered/live until c.finish() below — a
	// directory source's files may still be copying in a worker well after
	// place() returns from walking+enqueuing it, so cancelling/unregistering
	// any earlier would close the FileCancelRegistry.Cancel window too soon.
	type srcHandle struct {
		path   string
		cancel context.CancelFunc
	}
	var srcCancels []srcHandle

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

		// Register before the setDest/addRoot progress ticks below so a
		// cancel fired from inside onProgress (as soon as it sees this
		// source start) can't race ahead of the registry entry existing.
		srcCtx, srcCancel := context.WithCancel(ctx)
		registry.register(srcAbs, srcCancel)
		srcCancels = append(srcCancels, srcHandle{srcAbs, srcCancel})

		rep.setDest(target, isDir(srcAbs))
		srcTotal, _ := pathBytes(srcAbs)
		rep.addRoot(srcAbs, target, srcTotal)
		placeThisErr := c.place(srcCtx, srcAbs, target)

		if placeThisErr != nil {
			if ctx.Err() != nil {
				placeErr = preferCanceled(ctx, placeThisErr)
				break
			}
			if errors.Is(placeThisErr, context.Canceled) {
				// only this source was cancelled via FileCancelRegistry —
				// clean up its partial dest, keep copying the rest.
				rep.setRootStatus(srcAbs, FileStatusCanceled)
				canceled = append(canceled, target)
				continue
			}
			placeErr = placeThisErr
			break
		}
		created = append(created, target)
		succeeded = append(succeeded, srcAbs)
	}
	if placeErr != nil {
		cancel()
	}
	waitErr := c.finish()
	for _, sc := range srcCancels {
		registry.remove(sc.path)
		sc.cancel()
	}
	if placeErr != nil {
		err = placeErr
		return err
	}
	if waitErr != nil {
		err = waitErr
		return err
	}
	for _, srcAbs := range succeeded {
		rep.setRootStatus(srcAbs, FileStatusDone)
	}
	rep.finish("")
	return nil
}
