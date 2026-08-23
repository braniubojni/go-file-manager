package remote

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
	"github.com/pkg/sftp"
)

// Download copies remote virtual paths into a local directory.
func (m *Manager) Download(sources []string, localDestDir string) error {
	return m.DownloadCtx(context.Background(), sources, localDestDir, nil)
}

// DownloadCtx copies remote virtual paths into a local directory with progress.
func (m *Manager) DownloadCtx(ctx context.Context, sources []string, localDestDir string, onProgress filesystem.ProgressFunc) (err error) {
	if m == nil {
		return fmt.Errorf("remote not available")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	destAbs, err := filesystem.Resolve(localDestDir)
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

	total, err := m.remoteSourcesBytes(sources)
	if err != nil {
		return err
	}
	rep := newRemoteProgress(total, onProgress)
	if onProgress != nil {
		onProgress(filesystem.ProgressEvent{Total: total})
	}

	var created []string
	defer func() {
		if errors.Is(err, context.Canceled) {
			for _, p := range created {
				_ = os.RemoveAll(p)
			}
		}
	}()

	for _, src := range sources {
		if err := ctx.Err(); err != nil {
			return err
		}
		loc, err := ParseLocation(src)
		if err != nil {
			return err
		}
		s, err := m.get(loc)
		if err != nil {
			return err
		}
		base := path.Base(strings.TrimRight(loc.RemotePath, "/"))
		if base == "" || base == "." || base == "/" {
			return fmt.Errorf("invalid remote source: %s", src)
		}
		st, err := s.sftp.Stat(loc.RemotePath)
		if err != nil {
			return err
		}
		target := filesystem.UniquePath(filepath.Join(destAbs, base))
		created = append(created, target)
		rep.setDest(target, st.IsDir())
		if err := downloadPathCtx(ctx, s.sftp, loc.RemotePath, target, rep); err != nil {
			return err
		}
	}
	rep.finish("")
	return nil
}

// Upload copies local paths into a remote virtual directory.
func (m *Manager) Upload(localSources []string, remoteDestDir string) error {
	return m.UploadCtx(context.Background(), localSources, remoteDestDir, nil)
}

// UploadCtx copies local paths into a remote virtual directory with progress.
func (m *Manager) UploadCtx(ctx context.Context, localSources []string, remoteDestDir string, onProgress filesystem.ProgressFunc) (err error) {
	if m == nil {
		return fmt.Errorf("remote not available")
	}
	if ctx == nil {
		ctx = context.Background()
	}
	dloc, err := ParseLocation(remoteDestDir)
	if err != nil {
		return err
	}
	ds, err := m.get(dloc)
	if err != nil {
		return err
	}
	st, err := ds.sftp.Stat(dloc.RemotePath)
	if err != nil {
		return err
	}
	if !st.IsDir() {
		return fmt.Errorf("destination is not a directory: %s", remoteDestDir)
	}

	total, err := filesystem.TotalBytes(localSources)
	if err != nil {
		return err
	}
	rep := newRemoteProgress(total, onProgress)
	if onProgress != nil {
		onProgress(filesystem.ProgressEvent{Total: total})
	}

	var created []string
	defer func() {
		if errors.Is(err, context.Canceled) {
			for _, p := range created {
				_ = removeAll(ds.sftp, p)
			}
		}
	}()

	for _, src := range localSources {
		if err := ctx.Err(); err != nil {
			return err
		}
		srcAbs, err := filesystem.Resolve(src)
		if err != nil {
			return err
		}
		base := filepath.Base(srcAbs)
		if base == "" || base == "." || base == string(filepath.Separator) {
			return fmt.Errorf("invalid local source: %s", src)
		}
		dest := uniqueRemotePath(ds.sftp, path.Join(dloc.RemotePath, base))
		created = append(created, dest)
		srcInfo, statErr := os.Lstat(srcAbs)
		srcIsDir := statErr == nil && srcInfo.IsDir()
		rep.setDest(dloc.JoinPath(dest), srcIsDir)
		if err := uploadPathCtx(ctx, ds.sftp, srcAbs, dest, rep); err != nil {
			return err
		}
	}
	rep.finish("")
	return nil
}

func (m *Manager) remoteSourcesBytes(sources []string) (int64, error) {
	var total int64
	for _, src := range sources {
		loc, err := ParseLocation(src)
		if err != nil {
			return 0, err
		}
		s, err := m.get(loc)
		if err != nil {
			return 0, err
		}
		n, err := remotePathBytes(s.sftp, loc.RemotePath)
		if err != nil {
			return 0, err
		}
		total += n
	}
	return total, nil
}

func remotePathBytes(c *sftp.Client, remotePath string) (int64, error) {
	st, err := c.Lstat(remotePath)
	if err != nil {
		return 0, err
	}
	if st.Mode()&os.ModeSymlink != 0 {
		return 0, nil
	}
	if !st.IsDir() {
		return st.Size(), nil
	}
	var total int64
	var walk func(string) error
	walk = func(p string) error {
		entries, err := c.ReadDir(p)
		if err != nil {
			return err
		}
		for _, e := range entries {
			child := path.Join(p, e.Name())
			if e.Mode()&os.ModeSymlink != 0 {
				continue
			}
			if e.IsDir() {
				if err := walk(child); err != nil {
					return err
				}
				continue
			}
			total += e.Size()
		}
		return nil
	}
	if err := walk(remotePath); err != nil {
		return 0, err
	}
	return total, nil
}

type remoteProgress struct {
	mu        sync.Mutex
	done      int64
	total     int64
	destPath  string
	destSize  int64
	destIsDir bool
	on        filesystem.ProgressFunc
	lastEmit  time.Time
	force     bool
}

func newRemoteProgress(total int64, on filesystem.ProgressFunc) *remoteProgress {
	return &remoteProgress{total: total, on: on, force: true}
}

func (r *remoteProgress) eventLocked(currentPath string) filesystem.ProgressEvent {
	return filesystem.ProgressEvent{
		Done:        r.done,
		Total:       r.total,
		CurrentPath: currentPath,
		DestPath:    r.destPath,
		DestSize:    r.destSize,
		DestIsDir:   r.destIsDir,
	}
}

func (r *remoteProgress) setDest(path string, isDir bool) {
	if r == nil || r.on == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.destPath = path
	r.destSize = 0
	r.destIsDir = isDir
	r.lastEmit = time.Now()
	r.force = false
	r.on(r.eventLocked(""))
}

func (r *remoteProgress) add(n int64, currentPath string) {
	if r == nil || r.on == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.done += n
	r.destSize += n
	if r.total > 0 && r.done > r.total {
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

func (r *remoteProgress) finish(currentPath string) {
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

type ctxCountingReader struct {
	r      io.Reader
	path   string
	report *remoteProgress
	ctx    context.Context
}

func (c *ctxCountingReader) Read(p []byte) (int, error) {
	if err := c.ctx.Err(); err != nil {
		return 0, err
	}
	n, err := c.r.Read(p)
	if n > 0 {
		c.report.add(int64(n), c.path)
	}
	return n, err
}

func downloadPathCtx(ctx context.Context, c *sftp.Client, remotePath, localPath string, rep *remoteProgress) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	st, err := c.Stat(remotePath)
	if err != nil {
		return err
	}
	if st.IsDir() {
		return downloadDirCtx(ctx, c, remotePath, localPath, st.Mode(), rep)
	}
	return downloadFileCtx(ctx, c, remotePath, localPath, st.Mode(), rep)
}

func downloadDirCtx(ctx context.Context, c *sftp.Client, remotePath, localPath string, mode os.FileMode, rep *remoteProgress) error {
	perm := mode.Perm()
	if perm == 0 {
		perm = 0o755
	}
	if err := os.MkdirAll(localPath, perm); err != nil {
		return err
	}
	entries, err := c.ReadDir(remotePath)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := ctx.Err(); err != nil {
			return err
		}
		name := e.Name()
		if err := downloadPathCtx(ctx, c, path.Join(remotePath, name), filepath.Join(localPath, name), rep); err != nil {
			return err
		}
	}
	return nil
}

func downloadFileCtx(ctx context.Context, c *sftp.Client, remotePath, localPath string, mode os.FileMode, rep *remoteProgress) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	in, err := c.Open(remotePath)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()

	perm := mode.Perm()
	if perm == 0 {
		perm = 0o644
	}
	out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, perm)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()

	reader := io.Reader(in)
	if rep != nil && rep.on != nil {
		reader = &ctxCountingReader{r: in, path: remotePath, report: rep, ctx: ctx}
	}
	if _, err := io.Copy(out, reader); err != nil {
		return err
	}
	return out.Close()
}

func uploadPathCtx(ctx context.Context, c *sftp.Client, localPath, remotePath string, rep *remoteProgress) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	info, err := os.Lstat(localPath)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		info, err = os.Stat(localPath)
		if err != nil {
			return err
		}
	}
	if info.IsDir() {
		return uploadDirCtx(ctx, c, localPath, remotePath, info.Mode(), rep)
	}
	return uploadFileCtx(ctx, c, localPath, remotePath, info.Mode(), rep)
}

func uploadDirCtx(ctx context.Context, c *sftp.Client, localPath, remotePath string, mode os.FileMode, rep *remoteProgress) error {
	if err := c.MkdirAll(remotePath); err != nil {
		return err
	}
	_ = c.Chmod(remotePath, mode.Perm())
	entries, err := os.ReadDir(localPath)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := ctx.Err(); err != nil {
			return err
		}
		name := e.Name()
		if err := uploadPathCtx(ctx, c, filepath.Join(localPath, name), path.Join(remotePath, name), rep); err != nil {
			return err
		}
	}
	return nil
}

func uploadFileCtx(ctx context.Context, c *sftp.Client, localPath, remotePath string, mode os.FileMode, rep *remoteProgress) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	in, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()

	out, err := c.OpenFile(remotePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC)
	if err != nil {
		out, err = c.Create(remotePath)
		if err != nil {
			return err
		}
	}
	defer func() { _ = out.Close() }()

	reader := io.Reader(in)
	if rep != nil && rep.on != nil {
		reader = &ctxCountingReader{r: in, path: localPath, report: rep, ctx: ctx}
	}
	if _, err := io.Copy(out, reader); err != nil {
		return err
	}
	if err := out.Close(); err != nil {
		return err
	}
	_ = c.Chmod(remotePath, mode.Perm())
	return nil
}

func uniqueRemotePath(c *sftp.Client, p string) string {
	if !remoteExists(c, p) {
		return p
	}
	dir := path.Dir(p)
	base := path.Base(p)
	ext := path.Ext(base)
	name := strings.TrimSuffix(base, ext)
	for i := 1; ; i++ {
		candidate := path.Join(dir, fmt.Sprintf("%s (%d)%s", name, i, ext))
		if !remoteExists(c, candidate) {
			return candidate
		}
	}
}

func remoteExists(c *sftp.Client, p string) bool {
	_, err := c.Lstat(p)
	if err == nil {
		return true
	}
	if os.IsNotExist(err) {
		return false
	}
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "not exist") || strings.Contains(msg, "no such file") {
		return false
	}
	return true
}
