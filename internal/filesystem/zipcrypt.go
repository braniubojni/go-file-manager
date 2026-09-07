package filesystem

import (
	"context"
	"errors"
	"io"
	"io/fs"

	"github.com/mholt/archives"
	yzip "github.com/yeka/zip"
)

// ErrPasswordRequired is returned by walkArchive when a zip member is
// traditional-encrypted (ZipCrypto) and no password was supplied. Stdlib
// archive/zip (used by mholt/archives for zip) has no notion of ZipCrypto, so
// it never surfaces this on its own — we check yeka/zip's IsEncrypted bit.
var ErrPasswordRequired = errors.New("password required")

// ErrBadPassword wraps yeka/zip.ErrPassword for a friendlier caller-facing error.
var ErrBadPassword = errors.New("incorrect password")

// zipEncrypted reports whether any member of the zip at abs is encrypted.
func zipEncrypted(abs string) (bool, error) {
	rc, err := yzip.OpenReader(abs)
	if err != nil {
		return false, err
	}
	defer func() { _ = rc.Close() }()
	for _, f := range rc.File {
		if f.IsEncrypted() {
			return true, nil
		}
	}
	return false, nil
}

// zipFileHandle adapts a yeka/zip member to fs.File so it can be exposed
// through archives.FileInfo.Open.
type zipFileHandle struct {
	io.ReadCloser
	info fs.FileInfo
}

func (h *zipFileHandle) Stat() (fs.FileInfo, error) { return h.info, nil }

// CheckArchivePassword validates password against the smallest encrypted
// member of the zip at abs. Traditional ZipCrypto has no password-verification
// byte on decrypt — the only way to detect a wrong password is the CRC32
// checksum, which yeka/zip only checks once the member is read to EOF, so
// this reads the full (smallest) member rather than a byte-peek.
func CheckArchivePassword(abs, password string) error {
	rc, err := yzip.OpenReader(abs)
	if err != nil {
		return err
	}
	defer func() { _ = rc.Close() }()

	var smallest *yzip.File
	for _, f := range rc.File {
		if !f.IsEncrypted() || f.FileInfo().IsDir() {
			continue
		}
		if smallest == nil || f.FileInfo().Size() < smallest.FileInfo().Size() {
			smallest = f
		}
	}
	if smallest == nil {
		return nil
	}
	smallest.SetPassword(password)
	r, err := smallest.Open()
	if err != nil {
		if errors.Is(err, yzip.ErrPassword) {
			return ErrBadPassword
		}
		return err
	}
	defer func() { _ = r.Close() }()
	if _, err := io.Copy(io.Discard, r); err != nil {
		// A wrong ZipCrypto password decrypts to garbage: it can fail as an
		// ErrChecksum (CRC mismatch after a full read) or, more often, as a
		// deflate decompression error partway through — either way it is not
		// a real I/O problem, so treat any read error here as a bad password.
		return ErrBadPassword
	}
	return nil
}

// walkArchiveNames lists archive member metadata (name/size/modtime) without
// requiring a password — the zip central directory is always readable, only
// content (fi.Open()) needs the password. Used for browsing/listing.
func walkArchiveNames(archiveAbs string, fn func(archives.FileInfo) error) error {
	if encrypted, err := zipEncrypted(archiveAbs); err == nil && encrypted {
		rc, err := yzip.OpenReader(archiveAbs)
		if err != nil {
			return err
		}
		defer func() { _ = rc.Close() }()
		for _, f := range rc.File {
			zf := f
			fi := archives.FileInfo{
				FileInfo:      zf.FileInfo(),
				NameInArchive: zf.Name,
				Open: func() (fs.File, error) {
					return nil, ErrPasswordRequired
				},
			}
			if err := fn(fi); err != nil {
				return err
			}
		}
		return nil
	}
	return walkArchive(context.Background(), archiveAbs, "", func(_ context.Context, fi archives.FileInfo) error {
		return fn(fi)
	})
}

// walkEncryptedZip iterates a traditional-encrypted zip's members via
// yeka/zip, checking password validity per entry, and feeds them through the
// same archives.FileInfo shape walkArchive's other callers already handle.
func walkEncryptedZip(ctx context.Context, abs, password string, fn func(context.Context, archives.FileInfo) error) error {
	rc, err := yzip.OpenReader(abs)
	if err != nil {
		return err
	}
	defer func() { _ = rc.Close() }()

	for _, f := range rc.File {
		if err := ctx.Err(); err != nil {
			return err
		}
		if f.IsEncrypted() {
			f.SetPassword(password)
		}
		zf := f
		fi := archives.FileInfo{
			FileInfo:      zf.FileInfo(),
			NameInArchive: zf.Name,
			Open: func() (fs.File, error) {
				rc, err := zf.Open()
				if err != nil {
					if errors.Is(err, yzip.ErrPassword) {
						return nil, ErrBadPassword
					}
					return nil, err
				}
				return &zipFileHandle{ReadCloser: rc, info: zf.FileInfo()}, nil
			},
		}
		if err := fn(ctx, fi); err != nil {
			if errors.Is(err, yzip.ErrPassword) {
				return ErrBadPassword
			}
			return err
		}
	}
	return nil
}
