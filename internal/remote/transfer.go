package remote

import (
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
	"github.com/pkg/sftp"
)

// Download copies remote virtual paths into a local directory.
func (m *Manager) Download(sources []string, localDestDir string) error {
	if m == nil {
		return fmt.Errorf("remote not available")
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

	for _, src := range sources {
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
		target := filesystem.UniquePath(filepath.Join(destAbs, base))
		if err := downloadPath(s.sftp, loc.RemotePath, target); err != nil {
			return err
		}
	}
	return nil
}

// Upload copies local paths into a remote virtual directory.
func (m *Manager) Upload(localSources []string, remoteDestDir string) error {
	if m == nil {
		return fmt.Errorf("remote not available")
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

	for _, src := range localSources {
		srcAbs, err := filesystem.Resolve(src)
		if err != nil {
			return err
		}
		base := filepath.Base(srcAbs)
		if base == "" || base == "." || base == string(filepath.Separator) {
			return fmt.Errorf("invalid local source: %s", src)
		}
		// Remote paths use POSIX separators.
		dest := uniqueRemotePath(ds.sftp, path.Join(dloc.RemotePath, base))
		if err := uploadPath(ds.sftp, srcAbs, dest); err != nil {
			return err
		}
	}
	return nil
}

func downloadPath(c *sftp.Client, remotePath, localPath string) error {
	st, err := c.Stat(remotePath)
	if err != nil {
		return err
	}
	if st.IsDir() {
		return downloadDir(c, remotePath, localPath, st.Mode())
	}
	return downloadFile(c, remotePath, localPath, st.Mode())
}

func downloadDir(c *sftp.Client, remotePath, localPath string, mode os.FileMode) error {
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
		name := e.Name()
		if err := downloadPath(c, path.Join(remotePath, name), filepath.Join(localPath, name)); err != nil {
			return err
		}
	}
	return nil
}

func downloadFile(c *sftp.Client, remotePath, localPath string, mode os.FileMode) error {
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

	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func uploadPath(c *sftp.Client, localPath, remotePath string) error {
	info, err := os.Lstat(localPath)
	if err != nil {
		return err
	}
	// Follow symlinks for type/content (best-effort).
	if info.Mode()&os.ModeSymlink != 0 {
		info, err = os.Stat(localPath)
		if err != nil {
			return err
		}
	}
	if info.IsDir() {
		return uploadDir(c, localPath, remotePath, info.Mode())
	}
	return uploadFile(c, localPath, remotePath, info.Mode())
}

func uploadDir(c *sftp.Client, localPath, remotePath string, mode os.FileMode) error {
	if err := c.MkdirAll(remotePath); err != nil {
		return err
	}
	_ = c.Chmod(remotePath, mode.Perm())
	entries, err := os.ReadDir(localPath)
	if err != nil {
		return err
	}
	for _, e := range entries {
		name := e.Name()
		if err := uploadPath(c, filepath.Join(localPath, name), path.Join(remotePath, name)); err != nil {
			return err
		}
	}
	return nil
}

func uploadFile(c *sftp.Client, localPath, remotePath string, mode os.FileMode) error {
	in, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()

	out, err := c.OpenFile(remotePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC)
	if err != nil {
		// Fallback for servers that reject flags combination.
		out, err = c.Create(remotePath)
		if err != nil {
			return err
		}
	}
	defer func() { _ = out.Close() }()

	if _, err := io.Copy(out, in); err != nil {
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
	// pkg/sftp often wraps status messages
	msg := strings.ToLower(err.Error())
	if strings.Contains(msg, "not exist") || strings.Contains(msg, "no such file") {
		return false
	}
	// Unknown error: treat as exists to avoid overwriting.
	return true
}
