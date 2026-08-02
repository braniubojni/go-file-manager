package filesystem

import (
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestArchiveZipAndExtract(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join(root, "hello.txt")
	if err := os.WriteFile(src, []byte("hello archive"), 0o644); err != nil {
		t.Fatal(err)
	}
	sub := filepath.Join(root, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(sub, "a.txt"), []byte("a"), 0o644); err != nil {
		t.Fatal(err)
	}

	zipPath := filepath.Join(root, "out.zip")
	ctx := context.Background()
	if err := Archive(ctx, []string{src, sub}, zipPath, "zip", ""); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(zipPath); err != nil {
		t.Fatal(err)
	}

	dest := filepath.Join(root, "extracted")
	if err := Extract(ctx, zipPath, dest, ""); err != nil {
		t.Fatal(err)
	}
	data, err := os.ReadFile(filepath.Join(dest, "hello.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(data) != "hello archive" {
		t.Fatalf("got %q", data)
	}
	if _, err := os.Stat(filepath.Join(dest, "sub", "a.txt")); err != nil {
		t.Fatal(err)
	}
}

func TestArchiveTarGz(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join(root, "f.txt")
	if err := os.WriteFile(src, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	out := filepath.Join(root, "out.tar.gz")
	if err := Archive(context.Background(), []string{src}, out, "tar.gz", ""); err != nil {
		t.Fatal(err)
	}
	dest := filepath.Join(root, "ex")
	if err := Extract(context.Background(), out, dest, ""); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dest, "f.txt")); err != nil {
		t.Fatal(err)
	}
}

func TestDirChildSizes(t *testing.T) {
	root := t.TempDir()
	d1 := filepath.Join(root, "d1")
	if err := os.Mkdir(d1, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(d1, "a.bin"), make([]byte, 100), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "file.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	sizes, err := DirChildSizes(root)
	if err != nil {
		t.Fatal(err)
	}
	if sizes.Sizes[d1] < 100 {
		t.Fatalf("expected size >= 100, got %v", sizes)
	}
	if _, ok := sizes.Sizes[filepath.Join(root, "file.txt")]; ok {
		t.Fatal("files should not be in DirChildSizes")
	}
}

func TestDeletePermissionMessage(t *testing.T) {
	// Just ensure ErrPermission string is usable
	if ErrPermission.Error() != "permission denied" {
		t.Fatal(ErrPermission)
	}
}
