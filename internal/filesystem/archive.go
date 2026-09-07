package filesystem

import (
	"context"
	"fmt"
	"io"
	"os"
	"path"
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
// onProgress (may be nil) is reported against the total uncompressed source
// size — for compressed formats the written archive is smaller, so progress
// eases off near the end rather than being byte-exact; good enough for a bar.
func Archive(ctx context.Context, sources []string, destPath, format, password string, onProgress ProgressFunc) error {
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

	total, _ := TotalBytes(sources) // best-effort; 0 just means an indeterminate bar
	rep := newProgressReporter(total, onProgress)
	defer rep.finish(destAbs)

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
		return archiveZipEncrypted(ctx, sources, destAbs, password, rep)
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
	if err := archiver.Archive(ctx, &countingWriter{w: out, rep: rep, path: destAbs}, files); err != nil {
		_ = os.Remove(destAbs)
		return err
	}
	return out.Close()
}

// countingWriter reports bytes written to w through a progressReporter; used
// as a stand-in for per-source progress when the archiver library (mholt)
// doesn't expose one of its own.
type countingWriter struct {
	w    io.Writer
	rep  *progressReporter
	path string
}

func (c *countingWriter) Write(p []byte) (int, error) {
	n, err := c.w.Write(p)
	if n > 0 {
		c.rep.add(int64(n), c.path)
	}
	return n, err
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
func archiveZipEncrypted(ctx context.Context, sources []string, destAbs, password string, rep *progressReporter) error {
	out, err := os.Create(destAbs)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()

	zw := yzip.NewWriter(out)
	defer func() { _ = zw.Close() }()

	for _, src := range sources {
		if err := ctx.Err(); err != nil {
			_ = os.Remove(destAbs)
			return err
		}
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
			if err := addZipDirEncrypted(ctx, zw, abs, base, password, rep); err != nil {
				_ = os.Remove(destAbs)
				return err
			}
		} else {
			if err := addZipFileEncrypted(ctx, zw, abs, base, password, rep); err != nil {
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

func addZipFileEncrypted(ctx context.Context, zw *yzip.Writer, diskPath, nameInZip, password string, rep *progressReporter) error {
	if err := ctx.Err(); err != nil {
		return err
	}
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
	_, err = copyCtx(ctx, w, f, rep, diskPath)
	return err
}

func addZipDirEncrypted(ctx context.Context, zw *yzip.Writer, diskPath, prefix, password string, rep *progressReporter) error {
	return filepath.Walk(diskPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if ctxErr := ctx.Err(); ctxErr != nil {
			return ctxErr
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
		return addZipFileEncrypted(ctx, zw, path, name, password, rep)
	})
}

// copyCtx copies src into dst in chunks, aborting with ctx.Err() as soon as
// the context is cancelled instead of running an io.Copy to completion. r may
// be nil (progressReporter.add is nil-safe); cur labels the reported path.
func copyCtx(ctx context.Context, dst io.Writer, src io.Reader, r *progressReporter, cur string) (int64, error) {
	buf := make([]byte, 1<<20) // 1 MiB, matches copy_fast's chunk size
	var total int64
	for {
		if err := ctx.Err(); err != nil {
			return total, err
		}
		n, rerr := src.Read(buf)
		if n > 0 {
			if _, werr := dst.Write(buf[:n]); werr != nil {
				return total, werr
			}
			total += int64(n)
			r.add(int64(n), cur)
		}
		if rerr != nil {
			if rerr == io.EOF {
				return total, nil
			}
			return total, rerr
		}
	}
}

// Extract unpacks archivePath into destDir (created if needed).
// Supports zip, rar, 7z, tar and compressed tar via mholt Identify.
// password is used for password-protected rar/7z/zip when provided.
// onProgress (may be nil) reports bytes written across all members.
func Extract(ctx context.Context, archivePath, destDir, password string, onProgress ProgressFunc) error {
	return ExtractBatch(ctx, []ExtractJob{{ArchivePath: archivePath, DestDir: destDir}}, password, onProgress)
}

// ExtractJob pairs one archive with its own destination directory for a
// multi-select extract handled by ExtractBatch.
type ExtractJob struct {
	ArchivePath string
	DestDir     string
}

// ExtractBatch unpacks each job in turn, sharing a single progress total
// across the whole batch so a multi-select extract's transfer-bar row
// progresses monotonically instead of resetting to a new (often smaller)
// total each time the next archive starts.
func ExtractBatch(ctx context.Context, jobs []ExtractJob, password string, onProgress ProgressFunc) error {
	if len(jobs) == 0 {
		return nil
	}
	abss := make([]string, len(jobs))
	destAbss := make([]string, len(jobs))
	var total int64
	for i, j := range jobs {
		abs, err := Resolve(j.ArchivePath)
		if err != nil {
			return err
		}
		destAbs, err := Resolve(j.DestDir)
		if err != nil {
			return err
		}
		abss[i], destAbss[i] = abs, destAbs
		// Fail fast on a missing password before sinking time into sizing a
		// progress bar for a batch that can't fully proceed.
		if strings.HasSuffix(strings.ToLower(abs), ".zip") && password == "" {
			if encrypted, encErr := zipEncrypted(abs); encErr == nil && encrypted {
				return ErrPasswordRequired
			}
		}
		total += archiveMemberBytes(abs) // best-effort; 0 contribution = indeterminate share
	}

	rep := newProgressReporter(total, onProgress)
	defer rep.finish(destAbss[len(destAbss)-1])

	for i, abs := range abss {
		destAbs := destAbss[i]
		if err := os.MkdirAll(destAbs, 0o755); err != nil {
			return err
		}
		if err := walkArchive(ctx, abs, password, func(ctx context.Context, fi archives.FileInfo) error {
			return writeArchiveMember(ctx, destAbs, "", fi, rep)
		}); err != nil {
			return err
		}
	}
	return nil
}

// archiveMemberBytes sums member sizes for a progress-bar total, without
// opening (or needing the password for) any member — same funnel ListArchiveDir
// uses. Errors are swallowed; the caller falls back to an indeterminate bar.
func archiveMemberBytes(archiveAbs string) int64 {
	var total int64
	_ = walkArchiveNames(archiveAbs, func(fi archives.FileInfo) error {
		if !fi.IsDir() {
			total += fi.Size()
		}
		return nil
	})
	return total
}

func applyArchivePassword(format archives.Format, password string) archives.Format {
	if password == "" {
		return format
	}
	switch t := format.(type) {
	case archives.Rar:
		t.Password = password
		return t
	case *archives.Rar:
		t.Password = password
		return t
	case archives.SevenZip:
		t.Password = password
		return t
	case *archives.SevenZip:
		t.Password = password
		return t
	default:
		return format
	}
}

func walkArchive(ctx context.Context, archiveAbs, password string, fn func(context.Context, archives.FileInfo) error) error {
	var zipOpenErr error
	if strings.HasSuffix(strings.ToLower(archiveAbs), ".zip") {
		encrypted, err := zipEncrypted(archiveAbs)
		if err == nil {
			if encrypted {
				if password == "" {
					return ErrPasswordRequired
				}
				return walkEncryptedZip(ctx, archiveAbs, password, fn)
			}
		} else {
			// yzip couldn't open it (e.g. truncated/corrupt file). Keep the
			// error so a subsequent mholt/archives failure below can report
			// it instead of a less specific one.
			zipOpenErr = err
		}
	}

	f, err := os.Open(archiveAbs)
	if err != nil {
		return err
	}
	defer func() { _ = f.Close() }()

	format, stream, err := archives.Identify(ctx, filepath.Base(archiveAbs), f)
	if err != nil {
		if zipOpenErr != nil {
			return fmt.Errorf("identify archive: %w (zip open also failed: %v)", err, zipOpenErr)
		}
		return fmt.Errorf("identify archive: %w", err)
	}
	format = applyArchivePassword(format, password)
	ex, ok := format.(archives.Extractor)
	if !ok {
		return fmt.Errorf("format does not support extraction: %s", format.Extension())
	}
	return ex.Extract(ctx, stream, fn)
}

func writeArchiveMember(ctx context.Context, destAbs, destName string, fi archives.FileInfo, rep *progressReporter) error {
	name := destName
	if name == "" {
		name = filepath.FromSlash(path.Clean("/" + strings.ReplaceAll(fi.NameInArchive, `\`, `/`)))
		name = strings.TrimPrefix(name, string(os.PathSeparator))
	}
	if name == "." || name == "" {
		return nil
	}
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
	if _, err = copyCtx(ctx, out, rc, rep, target); err != nil {
		_ = out.Close()
		_ = os.Remove(target)
		return err
	}
	return out.Close()
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
