package filesystem

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

// ProgressEvent is one throttled transfer-progress tick.
type ProgressEvent struct {
	Done        int64
	Total       int64
	CurrentPath string // source path being read
	DestPath    string // UniquePath dest root for the current source
	DestSize    int64  // bytes written into DestPath so far
	DestIsDir   bool
}

// ProgressFunc reports transfer progress.
type ProgressFunc func(ProgressEvent)

// TotalBytes returns the recursive byte size of paths (symlinks count as 0).
func TotalBytes(paths []string) (int64, error) {
	var total int64
	for _, p := range paths {
		abs, err := Resolve(p)
		if err != nil {
			return 0, err
		}
		n, err := pathBytes(abs)
		if err != nil {
			return 0, err
		}
		total += n
	}
	return total, nil
}

func pathBytes(path string) (int64, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return 0, err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return 0, nil
	}
	if !info.IsDir() {
		return info.Size(), nil
	}
	var total int64
	err = filepath.Walk(path, func(p string, fi os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if fi.Mode()&os.ModeSymlink != 0 {
			return nil
		}
		if !fi.IsDir() {
			total += fi.Size()
		}
		return nil
	})
	return total, err
}

type progressReporter struct {
	mu        sync.Mutex
	done      int64
	total     int64
	destPath  string
	destSize  int64
	destIsDir bool
	on        ProgressFunc
	lastEmit  time.Time
	force     bool
}

func newProgressReporter(total int64, on ProgressFunc) *progressReporter {
	return &progressReporter{total: total, on: on, force: true}
}

func (r *progressReporter) eventLocked(currentPath string) ProgressEvent {
	return ProgressEvent{
		Done:        r.done,
		Total:       r.total,
		CurrentPath: currentPath,
		DestPath:    r.destPath,
		DestSize:    r.destSize,
		DestIsDir:   r.destIsDir,
	}
}

func (r *progressReporter) setDest(path string, isDir bool) {
	if r == nil || r.on == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.destPath = path
	r.destSize = 0
	r.destIsDir = isDir
	r.lastEmit = time.Now()
	r.force = true
	r.on(r.eventLocked(""))
}

func (r *progressReporter) add(n int64, currentPath string) {
	if r == nil || r.on == nil || n == 0 && currentPath == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.done += n
	r.destSize += n
	if r.done > r.total && r.total > 0 {
		r.done = r.total
	}
	now := time.Now()
	if !r.force && now.Sub(r.lastEmit) < 100*time.Millisecond && r.done < r.total {
		return
	}
	r.force = false
	r.lastEmit = now
	r.on(r.eventLocked(currentPath))
}

func (r *progressReporter) finish(currentPath string) {
	if r == nil || r.on == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.total > 0 {
		r.done = r.total
	}
	r.on(r.eventLocked(currentPath))
}

func removeCreatedOnCancel(err error, created []string) {
	if !errors.Is(err, context.Canceled) {
		return
	}
	for _, p := range created {
		_ = os.RemoveAll(p)
	}
}

type countingReader struct {
	r      io.Reader
	path   string
	report *progressReporter
	ctx    context.Context
}

func (c *countingReader) Read(p []byte) (int, error) {
	if err := c.ctx.Err(); err != nil {
		return 0, err
	}
	n, err := c.r.Read(p)
	if n > 0 {
		c.report.add(int64(n), c.path)
	}
	return n, err
}

// CopyCtx copies sources into destDir with optional progress and cancel.
// On context cancel, every dest root this call created is removed.
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

	total, err := TotalBytes(sources)
	if err != nil {
		return err
	}
	rep := newProgressReporter(total, onProgress)
	if onProgress != nil {
		onProgress(ProgressEvent{Total: total})
	}

	var created []string
	defer func() { removeCreatedOnCancel(err, created) }()

	for _, src := range sources {
		if err := ctx.Err(); err != nil {
			return err
		}
		srcAbs, err := Resolve(src)
		if err != nil {
			return err
		}
		if srcAbs == destAbs || strings.HasPrefix(destAbs+string(os.PathSeparator), srcAbs+string(os.PathSeparator)) {
			if isDir(srcAbs) {
				return fmt.Errorf("cannot copy directory into itself: %s", srcAbs)
			}
		}
		base := filepath.Base(srcAbs)
		target := UniquePath(filepath.Join(destAbs, base))
		created = append(created, target)
		rep.setDest(target, isDir(srcAbs))
		if err := copyPathCtx(ctx, srcAbs, target, rep); err != nil {
			return err
		}
	}
	rep.finish("")
	return nil
}

// MoveCtx moves sources into destDir with optional progress and cancel.
// Same-volume renames report size-weighted progress (min 1 byte per source).
// Cross-volume falls back to copy+delete with byte progress.
func MoveCtx(ctx context.Context, sources []string, destDir string, onProgress ProgressFunc) error {
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

	var total int64
	weights := make([]int64, len(sources))
	for i, src := range sources {
		abs, err := Resolve(src)
		if err != nil {
			return err
		}
		n, err := pathBytes(abs)
		if err != nil {
			return err
		}
		if n == 0 {
			n = 1
		}
		weights[i] = n
		total += n
	}
	rep := newProgressReporter(total, onProgress)
	if onProgress != nil {
		onProgress(ProgressEvent{Total: total})
	}

	for i, src := range sources {
		if err := ctx.Err(); err != nil {
			return err
		}
		srcAbs, err := Resolve(src)
		if err != nil {
			return err
		}
		if filepath.Dir(srcAbs) == destAbs {
			return ErrSamePath
		}
		base := filepath.Base(srcAbs)
		target := UniquePath(filepath.Join(destAbs, base))
		srcIsDir := isDir(srcAbs)
		rep.setDest(target, srcIsDir)

		if err := os.Rename(srcAbs, target); err != nil {
			if err := copyPathCtx(ctx, srcAbs, target, rep); err != nil {
				return err
			}
			if err := Delete([]string{srcAbs}); err != nil {
				return err
			}
			continue
		}
		rep.add(weights[i], srcAbs)
	}
	rep.finish("")
	return nil
}

func copyPathCtx(ctx context.Context, src, dst string, rep *progressReporter) error {
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
		return copyDirCtx(ctx, src, dst, info.Mode(), rep)
	}
	return copyFileCtx(ctx, src, dst, info.Mode(), rep)
}

func copyDirCtx(ctx context.Context, src, dst string, mode os.FileMode, rep *progressReporter) error {
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
		if err := copyPathCtx(ctx, filepath.Join(src, e.Name()), filepath.Join(dst, e.Name()), rep); err != nil {
			return err
		}
	}
	return nil
}

func copyFileCtx(ctx context.Context, src, dst string, mode os.FileMode, rep *progressReporter) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode.Perm())
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()

	reader := io.Reader(in)
	if rep != nil && rep.on != nil {
		reader = &countingReader{r: in, path: src, report: rep, ctx: ctx}
	} else if err := ctx.Err(); err != nil {
		return err
	}

	if _, err := io.Copy(out, reader); err != nil {
		return err
	}
	return out.Close()
}
