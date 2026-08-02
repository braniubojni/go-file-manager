package filesystem

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"unicode/utf8"
)

// MaxTextFileBytes is the largest file the built-in editor will open.
const MaxTextFileBytes = 5 << 20 // 5 MiB

// CreateFile creates an empty file under parent. Name is basename only.
func CreateFile(parent, name string) (string, error) {
	if err := validateName(name); err != nil {
		return "", err
	}
	abs, err := Resolve(parent)
	if err != nil {
		return "", err
	}
	dest := filepath.Join(abs, name)
	f, err := os.OpenFile(dest, os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0o644)
	if err != nil {
		if os.IsExist(err) {
			return "", fmt.Errorf("%w: %s", ErrExists, dest)
		}
		return "", err
	}
	if err := f.Close(); err != nil {
		return "", err
	}
	return dest, nil
}

// TooLargeError is the shared "won't open" message for oversized files.
func TooLargeError() error {
	return fmt.Errorf("file too large for built-in editor (max %d bytes)", MaxTextFileBytes)
}

// EncodingError is the shared "not text" message. The frontend matches on it to
// hand the file to the OS default app, so keep it distinct from ErrExecutable.
func EncodingError(path string) error {
	return fmt.Errorf("binary or unsupported encoding: %s", path)
}

// ReadTextFile reads a local text file for the built-in editor.
// Stat, not Lstat: a symlink must be judged by what it points at, and the
// remote reader follows links too.
func ReadTextFile(path string) (string, error) {
	abs, err := Resolve(path)
	if err != nil {
		return "", err
	}
	info, err := os.Stat(abs)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("%w: %s", ErrNotFound, abs)
		}
		return "", err
	}
	if info.IsDir() {
		return "", fmt.Errorf("not a file: %s", abs)
	}
	f, err := os.Open(abs)
	if err != nil {
		return "", err
	}
	defer func() { _ = f.Close() }()

	// Format before size: an 80 MB binary should say "executable", not "too large".
	head := make([]byte, HeadBytes)
	n, err := io.ReadFull(f, head)
	if err != nil && !errors.Is(err, io.EOF) && !errors.Is(err, io.ErrUnexpectedEOF) {
		return "", err
	}
	head = head[:n]
	if IsExecutable(head) {
		return "", ErrExecutable
	}
	if info.Size() > MaxTextFileBytes {
		return "", TooLargeError()
	}
	rest, err := io.ReadAll(f)
	if err != nil {
		return "", err
	}
	data := append(head, rest...)
	if !utf8.Valid(data) {
		return "", EncodingError(abs)
	}
	return string(data), nil
}

// WriteTextFile writes text content atomically (temp + rename).
func WriteTextFile(path, content string) error {
	abs, err := Resolve(path)
	if err != nil {
		return err
	}
	info, err := os.Lstat(abs)
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("%w: %s", ErrNotFound, abs)
		}
		return err
	}
	if info.IsDir() {
		return fmt.Errorf("not a file: %s", abs)
	}
	dir := filepath.Dir(abs)
	tmp, err := os.CreateTemp(dir, ".gfm-edit-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	ok := false
	defer func() {
		if !ok {
			_ = os.Remove(tmpName)
		}
	}()
	if _, err := tmp.WriteString(content); err != nil {
		_ = tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmpName, abs); err != nil {
		return err
	}
	ok = true
	return nil
}
