package filesystem

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
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
	written   map[string]int64
	emitAt    map[string]time.Time
	on        ProgressFunc
	lastEmit  time.Time
	force     bool
}

func newProgressReporter(total int64, on ProgressFunc) *progressReporter {
	return &progressReporter{
		total:   total,
		on:      on,
		force:   true,
		written: make(map[string]int64),
		emitAt:  make(map[string]time.Time),
	}
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
	r.destIsDir = isDir
	r.destSize = r.written[path]
	r.lastEmit = time.Now()
	r.force = true
	r.on(r.eventLocked(""))
}

func (r *progressReporter) add(n int64, currentPath string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	destPath, destIsDir := r.destPath, r.destIsDir
	r.mu.Unlock()
	r.addAt(n, currentPath, destPath, destIsDir)
}

func (r *progressReporter) addAt(n int64, currentPath, destPath string, destIsDir bool) {
	if r == nil || r.on == nil || n == 0 && currentPath == "" && destPath == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.done += n
	if destPath != "" {
		r.written[destPath] += n
		r.destPath = destPath
		r.destSize = r.written[destPath]
		r.destIsDir = destIsDir
	} else {
		r.destSize += n
	}
	if r.done > r.total && r.total > 0 {
		r.done = r.total
	}
	r.emitLocked(currentPath, destPath, false)
}

// resetDest un-counts bytes already attributed to destPath, for callers that
// restart a file copy from scratch after a partial-write failure (e.g. the
// copy_file_range/kernel fast path failing mid-transfer before falling back
// to the byte-copy path) so the retry doesn't double-count.
func (r *progressReporter) resetDest(destPath string) {
	if r == nil || destPath == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if n := r.written[destPath]; n > 0 {
		r.done -= n
		if r.done < 0 {
			r.done = 0
		}
		r.written[destPath] = 0
		if r.destPath == destPath {
			r.destSize = 0
		}
	}
}

func (r *progressReporter) flushDest(currentPath, destPath string, destIsDir bool) {
	if r == nil || r.on == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if destPath != "" {
		r.destPath = destPath
		r.destSize = r.written[destPath]
		r.destIsDir = destIsDir
	}
	r.emitLocked(currentPath, destPath, true)
}

func (r *progressReporter) emitLocked(currentPath, destKey string, force bool) {
	now := time.Now()
	if destKey == "" {
		destKey = r.destPath
	}
	last := r.emitAt[destKey]
	if !force && !r.force && !last.IsZero() && now.Sub(last) < 100*time.Millisecond && r.done < r.total {
		return
	}
	r.force = false
	r.lastEmit = now
	if destKey != "" {
		r.emitAt[destKey] = now
	}
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

// removeCreatedOnErr removes every dest root the caller created once the
// overall operation failed for any reason — cancellation or a real error
// (e.g. ENOSPC from a concurrent worker) — so a failed CopyCtx never leaves
// partial or completed dest files behind, matching MoveCtx's cleanup.
func removeCreatedOnErr(err error, created []string) {
	if err == nil {
		return
	}
	for _, p := range created {
		removeAllRetry(p)
	}
}

func removeAllRetry(p string) {
	if p == "" {
		return
	}
	for i := 0; i < 8; i++ {
		_ = os.RemoveAll(p)
		if _, err := os.Lstat(p); os.IsNotExist(err) {
			return
		}
		time.Sleep(time.Duration(15*(i+1)) * time.Millisecond)
	}
	_ = os.RemoveAll(p)
}

func preferCanceled(ctx context.Context, err error) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	return err
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
				removeAllRetry(target)
				return preferCanceled(ctx, err)
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
	if err := clonePath(src, dst); err == nil {
		if err := ctx.Err(); err != nil {
			return err
		}
		n, err := pathBytes(src)
		if err != nil || n <= 0 {
			n = 1
		}
		rep.addAt(n, src, dst, true)
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
		if err := copyPathCtx(ctx, filepath.Join(src, e.Name()), filepath.Join(dst, e.Name()), rep); err != nil {
			return err
		}
	}
	return nil
}
