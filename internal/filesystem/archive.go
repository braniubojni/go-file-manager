package filesystem

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/mholt/archives"
	yzip "github.com/yeka/zip"
)

// Create formats supported by the UI (writable archival formats).
var CreateFormats = []string{
	"zip",
	"tar",
	"tar.gz",
	"tar.bz2",
	"tar.xz",
	"tar.zst",
	"tar.lz4",
	"tar.sz",
}

// Archive creates an archive at destPath from sources.
// format is one of CreateFormats (e.g. "zip", "tar.gz").
// password is only used for zip encryption (yeka/zip); empty = unencrypted.
func Archive(ctx context.Context, sources []string, destPath, format, password string) error {
	if len(sources) == 0 {
		return fmt.Errorf("no sources to archive")
	}
	format = strings.ToLower(strings.TrimSpace(format))
	if format == "" {
		format = "zip"
	}

	destAbs, err := Resolve(destPath)
	if err != nil {
		return err
	}
	if _, err := os.Lstat(destAbs); err == nil {
		return fmt.Errorf("%w: %s", ErrExists, destAbs)
	}

	// Map disk paths → archive names
	fileMap := make(map[string]string, len(sources))
	for _, src := range sources {
		abs, err := Resolve(src)
		if err != nil {
			return err
		}
		if _, err := os.Lstat(abs); err != nil {
			return err
		}
		fileMap[abs] = filepath.Base(abs)
	}

	if format == "zip" && password != "" {
		return archiveZipEncrypted(sources, destAbs, password)
	}

	files, err := archives.FilesFromDisk(ctx, nil, fileMap)
	if err != nil {
		return err
	}

	out, err := os.Create(destAbs)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()

	archiver, err := archiverForFormat(format)
	if err != nil {
		_ = os.Remove(destAbs)
		return err
	}
	if err := archiver.Archive(ctx, out, files); err != nil {
		_ = os.Remove(destAbs)
		return err
	}
	return out.Close()
}

func archiverForFormat(format string) (archives.Archiver, error) {
	switch format {
	case "zip":
		return archives.Zip{}, nil
	case "tar":
		return archives.Tar{}, nil
	case "tar.gz", "tgz":
		return archives.CompressedArchive{Compression: archives.Gz{}, Archival: archives.Tar{}}, nil
	case "tar.bz2", "tbz2":
		return archives.CompressedArchive{Compression: archives.Bz2{}, Archival: archives.Tar{}}, nil
	case "tar.xz", "txz":
		return archives.CompressedArchive{Compression: archives.Xz{}, Archival: archives.Tar{}}, nil
	case "tar.zst", "tar.zstd":
		return archives.CompressedArchive{Compression: archives.Zstd{}, Archival: archives.Tar{}}, nil
	case "tar.lz4":
		return archives.CompressedArchive{Compression: archives.Lz4{}, Archival: archives.Tar{}}, nil
	case "tar.sz", "tar.snappy":
		return archives.CompressedArchive{Compression: archives.Sz{}, Archival: archives.Tar{}}, nil
	default:
		return nil, fmt.Errorf("unsupported create format: %s", format)
	}
}

// archiveZipEncrypted creates a password-protected zip via yeka/zip (traditional encryption).
func archiveZipEncrypted(sources []string, destAbs, password string) error {
	out, err := os.Create(destAbs)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()

	zw := yzip.NewWriter(out)
	defer func() { _ = zw.Close() }()

	for _, src := range sources {
		abs, err := Resolve(src)
		if err != nil {
			return err
		}
		info, err := os.Lstat(abs)
		if err != nil {
			return err
		}
		base := filepath.Base(abs)
		if info.IsDir() {
			if err := addZipDirEncrypted(zw, abs, base, password); err != nil {
				_ = os.Remove(destAbs)
				return err
			}
		} else {
			if err := addZipFileEncrypted(zw, abs, base, password); err != nil {
				_ = os.Remove(destAbs)
				return err
			}
		}
	}
	if err := zw.Close(); err != nil {
		_ = os.Remove(destAbs)
		return err
	}
	return out.Close()
}

func addZipFileEncrypted(zw *yzip.Writer, diskPath, nameInZip, password string) error {
	f, err := os.Open(diskPath)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()
	info, err := f.Stat()
	if err != nil {
		return err
	}
	hdr, err := yzip.FileInfoHeader(info)
	if err != nil {
		return err
	}
	hdr.Name = nameInZip
	hdr.Method = yzip.Deflate
	if password != "" {
		hdr.SetPassword(password)
		hdr.SetEncryptionMethod(yzip.StandardEncryption)
	}
	w, err := zw.CreateHeader(hdr)
	if err != nil {
		return err
	}
	_, err = io.Copy(w, f)
	return err
}

func addZipDirEncrypted(zw *yzip.Writer, diskPath, prefix, password string) error {
	return filepath.Walk(diskPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		rel, err := filepath.Rel(diskPath, path)
		if err != nil {
			return err
		}
		name := filepath.ToSlash(filepath.Join(prefix, rel))
		if info.IsDir() {
			if !strings.HasSuffix(name, "/") {
				name += "/"
			}
			hdr, err := yzip.FileInfoHeader(info)
			if err != nil {
				return err
			}
			hdr.Name = name
			if password != "" {
				hdr.SetPassword(password)
				hdr.SetEncryptionMethod(yzip.StandardEncryption)
			}
			_, err = zw.CreateHeader(hdr)
			return err
		}
		return addZipFileEncrypted(zw, path, name, password)
	})
}

// Extract unpacks archivePath into destDir (created if needed).
// Supports zip, rar, 7z, tar and compressed tar via mholt Identify.
// password is used for password-protected rar/7z when provided.
func Extract(ctx context.Context, archivePath, destDir, password string) error {
	abs, err := Resolve(archivePath)
	if err != nil {
		return err
	}
	destAbs, err := Resolve(destDir)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(destAbs, 0o755); err != nil {
		return err
	}

	f, err := os.Open(abs)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()

	format, stream, err := archives.Identify(ctx, filepath.Base(abs), f)
	if err != nil {
		return fmt.Errorf("identify archive: %w", err)
	}

	// Password-protected rar/7z
	switch t := format.(type) {
	case archives.Rar:
		if password != "" {
			t.Password = password
			format = t
		}
	case *archives.Rar:
		if password != "" {
			t.Password = password
		}
	case archives.SevenZip:
		if password != "" {
			t.Password = password
			format = t
		}
	case *archives.SevenZip:
		if password != "" {
			t.Password = password
		}
	}

	ex, ok := format.(archives.Extractor)
	if !ok {
		return fmt.Errorf("format does not support extraction: %s", format.Extension())
	}

	return ex.Extract(ctx, stream, func(ctx context.Context, fi archives.FileInfo) error {
		name := filepath.Clean(fi.NameInArchive)
		if name == "." || name == "" {
			return nil
		}
		// Zip-slip guard
		target := filepath.Join(destAbs, name)
		if !strings.HasPrefix(target, destAbs+string(os.PathSeparator)) && target != destAbs {
			return fmt.Errorf("illegal path in archive: %s", fi.NameInArchive)
		}
		if fi.IsDir() {
			return os.MkdirAll(target, 0o755)
		}
		if err := os.MkdirAll(filepath.Dir(target), 0o755); err != nil {
			return err
		}
		rc, err := fi.Open()
		if err != nil {
			return err
		}
		defer func() { _ = rc.Close() }()
		out, err := os.OpenFile(target, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, fi.Mode().Perm())
		if err != nil {
			return err
		}
		defer func() { _ = out.Close() }()
		if _, err = io.Copy(out, rc); err != nil {
			return err
		}
		return out.Close()
	})
}

// ExtensionForFormat returns the file extension including the leading dot.
func ExtensionForFormat(format string) string {
	switch strings.ToLower(format) {
	case "zip":
		return ".zip"
	case "tar":
		return ".tar"
	case "tar.gz", "tgz":
		return ".tar.gz"
	case "tar.bz2", "tbz2":
		return ".tar.bz2"
	case "tar.xz", "txz":
		return ".tar.xz"
	case "tar.zst", "tar.zstd":
		return ".tar.zst"
	case "tar.lz4":
		return ".tar.lz4"
	case "tar.sz", "tar.snappy":
		return ".tar.sz"
	default:
		return ".zip"
	}
}
