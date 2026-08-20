package remote

import (
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/cloudsoda/go-smb2"
	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
)

// Download copies SMB virtual paths into a local directory.
func (m *SMBManager) Download(sources []string, localDestDir string) error {
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
		if loc.ShareName() == "" {
			return fmt.Errorf("invalid remote source: %s", src)
		}
		fs, err := m.shareFS(loc)
		if err != nil {
			return err
		}
		rel := smbRel(loc)
		base := path.Base(rel)
		if rel == "." {
			base = loc.ShareName()
		}
		if base == "" || base == "." || base == "/" {
			return fmt.Errorf("invalid remote source: %s", src)
		}
		target := filesystem.UniquePath(filepath.Join(destAbs, base))
		if err := smbDownloadPath(fs, rel, target); err != nil {
			return err
		}
	}
	return nil
}

// Upload copies local paths into an SMB virtual directory.
func (m *SMBManager) Upload(localSources []string, remoteDestDir string) error {
	if m == nil {
		return fmt.Errorf("remote not available")
	}
	dloc, err := ParseLocation(remoteDestDir)
	if err != nil {
		return err
	}
	if dloc.ShareName() == "" {
		return fmt.Errorf("destination is not a directory: %s", remoteDestDir)
	}
	fs, err := m.shareFS(dloc)
	if err != nil {
		return err
	}
	rel := smbRel(dloc)
	st, err := fs.Stat(rel)
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
		dest := uniqueSMBPath(fs, path.Join(rel, base))
		if err := smbUploadPath(fs, srcAbs, dest); err != nil {
			return err
		}
	}
	return nil
}

// CopyWithin copies sources into destDir on the same SMB host.
func (m *SMBManager) CopyWithin(sources []string, destDir string) error {
	dloc, err := ParseLocation(destDir)
	if err != nil {
		return err
	}
	if dloc.ShareName() == "" {
		return fmt.Errorf("destination is not a directory: %s", destDir)
	}
	if _, err := m.shareFS(dloc); err != nil {
		return err
	}
	for _, src := range sources {
		sloc, err := ParseLocation(src)
		if err != nil {
			return err
		}
		if sloc.SessionKey() != dloc.SessionKey() {
			return fmt.Errorf("cross-host copy not supported")
		}
		if sloc.ShareName() != dloc.ShareName() {
			return fmt.Errorf("cross-share copy not supported")
		}
		sfs, err := m.shareFS(sloc)
		if err != nil {
			return err
		}
		base := path.Base(smbRel(sloc))
		dest := path.Join(smbRel(dloc), base)
		if err := smbCopyRemote(sfs, smbRel(sloc), dest); err != nil {
			return err
		}
	}
	return nil
}

// MoveWithin moves sources into destDir on the same SMB host.
func (m *SMBManager) MoveWithin(sources []string, destDir string) error {
	dloc, err := ParseLocation(destDir)
	if err != nil {
		return err
	}
	if dloc.ShareName() == "" {
		return fmt.Errorf("destination is not a directory: %s", destDir)
	}
	for _, src := range sources {
		sloc, err := ParseLocation(src)
		if err != nil {
			return err
		}
		if sloc.SessionKey() != dloc.SessionKey() {
			return fmt.Errorf("cross-host move not supported")
		}
		if sloc.ShareName() != dloc.ShareName() {
			return fmt.Errorf("cross-share move not supported")
		}
		sfs, err := m.shareFS(sloc)
		if err != nil {
			return err
		}
		base := path.Base(smbRel(sloc))
		dest := path.Join(smbRel(dloc), base)
		if err := sfs.Rename(smbRel(sloc), dest); err != nil {
			if err2 := smbCopyRemote(sfs, smbRel(sloc), dest); err2 != nil {
				return err2
			}
			if err2 := sfs.RemoveAll(smbRel(sloc)); err2 != nil {
				return err2
			}
		}
	}
	return nil
}

func smbDownloadPath(fs *smb2.Share, remotePath, localPath string) error {
	st, err := fs.Stat(remotePath)
	if err != nil {
		return err
	}
	if st.IsDir() {
		return smbDownloadDir(fs, remotePath, localPath)
	}
	return smbDownloadFile(fs, remotePath, localPath)
}

func smbDownloadDir(fs *smb2.Share, remotePath, localPath string) error {
	if err := os.MkdirAll(localPath, 0o755); err != nil {
		return err
	}
	entries, err := fs.ReadDir(remotePath)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := smbDownloadPath(fs, path.Join(remotePath, e.Name()), filepath.Join(localPath, e.Name())); err != nil {
			return err
		}
	}
	return nil
}

func smbDownloadFile(fs *smb2.Share, remotePath, localPath string) error {
	in, err := fs.Open(remotePath)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()
	out, err := os.OpenFile(localPath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func smbUploadPath(fs *smb2.Share, localPath, remotePath string) error {
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
		if err := fs.MkdirAll(remotePath, 0o755); err != nil {
			return err
		}
		entries, err := os.ReadDir(localPath)
		if err != nil {
			return err
		}
		for _, e := range entries {
			if err := smbUploadPath(fs, filepath.Join(localPath, e.Name()), path.Join(remotePath, e.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	in, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()
	out, err := fs.Create(remotePath)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func smbCopyRemote(fs *smb2.Share, src, dst string) error {
	st, err := fs.Stat(src)
	if err != nil {
		return err
	}
	if st.IsDir() {
		if err := fs.MkdirAll(dst, 0o755); err != nil {
			return err
		}
		entries, err := fs.ReadDir(src)
		if err != nil {
			return err
		}
		for _, e := range entries {
			if err := smbCopyRemote(fs, path.Join(src, e.Name()), path.Join(dst, e.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	in, err := fs.Open(src)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()
	out, err := fs.Create(dst)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()
	if _, err := io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func uniqueSMBPath(fs *smb2.Share, p string) string {
	if !smbPathExists(fs, p) {
		return p
	}
	dir := path.Dir(p)
	base := path.Base(p)
	ext := path.Ext(base)
	name := strings.TrimSuffix(base, ext)
	for i := 1; ; i++ {
		candidate := path.Join(dir, fmt.Sprintf("%s (%d)%s", name, i, ext))
		if !smbPathExists(fs, candidate) {
			return candidate
		}
	}
}

func smbPathExists(fs *smb2.Share, p string) bool {
	_, err := fs.Lstat(p)
	if err == nil {
		return true
	}
	if os.IsNotExist(err) || smbNotExist(err) {
		return false
	}
	return true
}
