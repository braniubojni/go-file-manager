package filesystem

import (
	"fmt"
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

// ReadTextFile reads a local text file for the built-in editor.
func ReadTextFile(path string) (string, error) {
	abs, err := Resolve(path)
	if err != nil {
		return "", err
	}
	info, err := os.Lstat(abs)
	if err != nil {
		if os.IsNotExist(err) {
			return "", fmt.Errorf("%w: %s", ErrNotFound, abs)
		}
		return "", err
	}
	if info.IsDir() {
		return "", fmt.Errorf("not a file: %s", abs)
	}
	if info.Size() > MaxTextFileBytes {
		return "", fmt.Errorf("file too large for built-in editor (max %d bytes)", MaxTextFileBytes)
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return "", err
	}
	if !utf8.Valid(data) {
		return "", fmt.Errorf("binary or unsupported encoding: %s", abs)
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
