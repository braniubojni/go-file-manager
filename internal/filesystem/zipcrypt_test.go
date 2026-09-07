package filesystem

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
)

func TestEncryptedZipRoundTrip(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join(root, "secret.txt")
	if err := os.WriteFile(src, []byte("top secret contents"), 0o644); err != nil {
		t.Fatal(err)
	}
	zipPath := filepath.Join(root, "out.zip")
	if err := Archive(context.Background(), []string{src}, zipPath, "zip", "hunter2", nil); err != nil {
		t.Fatal(err)
	}

	// No password: browsing names still works.
	entries, err := ListArchiveDir(zipPath, "", true)
	if err != nil {
		t.Fatalf("ListArchiveDir without password: %v", err)
	}
	if len(entries) < 2 { // ".." + secret.txt
		t.Fatalf("expected entries, got %v", entries)
	}

	// No password: reading content is refused.
	if _, err := ReadArchiveTextFile(zipPath, "secret.txt", ""); !errors.Is(err, ErrPasswordRequired) {
		t.Fatalf("expected ErrPasswordRequired, got %v", err)
	}

	// Wrong password.
	if err := CheckArchivePassword(zipPath, "wrong"); !errors.Is(err, ErrBadPassword) {
		t.Fatalf("expected ErrBadPassword, got %v", err)
	}

	// Right password: readable via editor path and extractable.
	if err := CheckArchivePassword(zipPath, "hunter2"); err != nil {
		t.Fatalf("expected valid password, got %v", err)
	}
	got, err := ReadArchiveTextFile(zipPath, "secret.txt", "hunter2")
	if err != nil {
		t.Fatal(err)
	}
	if got != "top secret contents" {
		t.Fatalf("got %q", got)
	}

	dest := filepath.Join(root, "extracted")
	if err := Extract(context.Background(), zipPath, dest, "hunter2", nil); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(dest, "secret.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "top secret contents" {
		t.Fatalf("got %q", data)
	}
}
