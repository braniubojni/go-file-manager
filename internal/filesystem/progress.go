package filesystem

import (
	"context"
	"errors"
	"fmt"
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
	Files       []FileProgress // one entry per top-level source, for per-file UI + cancel
}

// FileProgress is one top-level source's own progress within a batch job.
type FileProgress struct {
	Path   string // resolved source path (FileCancelRegistry key)
	Dest   string // UniquePath dest root for this source
	Done   int64
	Total  int64
	Status string // active | done | canceled
}

const (
	FileStatusActive   = "active"
	FileStatusDone     = "done"
	FileStatusCanceled = "canceled"
)

type fileRoot struct {
	path, dest string
	total      int64
	done       int64
	status     string
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
	roots     []*fileRoot
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
	files := make([]FileProgress, len(r.roots))
	for i, root := range r.roots {
		files[i] = FileProgress{
			Path: root.path, Dest: root.dest,
			Done: root.done, Total: root.total, Status: root.status,
		}
	}
	return ProgressEvent{
		Done:        r.done,
		Total:       r.total,
		CurrentPath: currentPath,
		DestPath:    r.destPath,
		DestSize:    r.destSize,
		DestIsDir:   r.destIsDir,
		Files:       files,
	}
}

// addRoot registers src as a new top-level source for per-file progress/cancel
// UI. total <= 0 (unknown size, e.g. a directory not yet walked) still gets an
// entry so the file list can show it as active.
func (r *progressReporter) addRoot(src, dest string, total int64) {
	if r == nil {
		return
	}
	r.mu.Lock()
	r.roots = append(r.roots, &fileRoot{path: src, dest: dest, total: total, status: FileStatusActive})
	r.force = true
	ev := r.eventLocked("")
	on := r.on
	r.mu.Unlock()
	if on != nil {
		on(ev)
	}
}

func (r *progressReporter) findRootLocked(destPath string) *fileRoot {
	if destPath == "" {
		return nil
	}
	for _, root := range r.roots {
		if root.dest == destPath || strings.HasPrefix(destPath, root.dest+string(os.PathSeparator)) {
			return root
		}
	}
	return nil
}

// setRootStatus marks src's root row done/canceled and emits immediately so
// the UI reflects it without waiting for the next throttled byte tick.
func (r *progressReporter) setRootStatus(src, status string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	for _, root := range r.roots {
		if root.path == src {
			root.status = status
			if status == FileStatusDone && root.total > 0 {
				root.done = root.total
			}
			break
		}
	}
	r.force = true
	ev := r.eventLocked("")
	on := r.on
	r.mu.Unlock()
	if on != nil {
		on(ev)
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
		if root := r.findRootLocked(destPath); root != nil {
			root.done += n
			if root.total > 0 && root.done > root.total {
				root.done = root.total
			}
		}
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

	type copyJob struct{ src, dst string }
	var toCopy []copyJob
	var created []string

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
		rep.addRoot(srcAbs, target, weights[i])

		if err := os.Rename(srcAbs, target); err != nil {
			created = append(created, target)
			toCopy = append(toCopy, copyJob{srcAbs, target})
			continue
		}
		rep.add(weights[i], srcAbs)
		rep.setRootStatus(srcAbs, FileStatusDone)
	}

	if len(toCopy) == 0 {
		rep.finish("")
		return nil
	}

	copySrcs := make([]string, len(toCopy))
	for i, j := range toCopy {
		copySrcs[i] = j.src
	}
	st, err := collectCopyStats(copySrcs)
	if err != nil {
		removeCreatedOnErr(err, created)
		return err
	}
	workers := copyWorkers(copySrcs, destAbs, st.files)

	// Copy+delete one source at a time: caps extra disk usage at one source's
	// worth of data instead of requiring 2x space for the whole batch (a low
	// disk failure case that used to succeed with copy-then-delete per file).
	registry := fileCancelRegistryFrom(ctx)
	remaining := created
	for i, j := range toCopy {
		jctx, cancel := context.WithCancel(ctx)
		registry.register(j.src, cancel)
		c := &copier{ctx: jctx, cancel: cancel, rep: rep}
		c.start(workers)
		placeErr := c.place(jctx, j.src, j.dst)
		if placeErr != nil {
			placeErr = preferCanceled(jctx, placeErr)
		}
		waitErr := c.finish()
		registry.remove(j.src)
		cancel()

		if errors.Is(placeErr, context.Canceled) && ctx.Err() == nil {
			// only this source was cancelled via FileCancelRegistry — the
			// rename never happened, so the source file is untouched; just
			// drop the partial dest and move on to the rest of the batch.
			rep.setRootStatus(j.src, FileStatusCanceled)
			removeAllRetry(j.dst)
			remaining = created[i+1:]
			continue
		}
		if placeErr != nil {
			removeCreatedOnErr(placeErr, remaining)
			return placeErr
		}
		if waitErr != nil {
			removeCreatedOnErr(waitErr, remaining)
			return waitErr
		}
		if err := Delete([]string{j.src}); err != nil {
			removeCreatedOnErr(err, remaining)
			return err
		}
		rep.setRootStatus(j.src, FileStatusDone)
		remaining = created[i+1:]
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
