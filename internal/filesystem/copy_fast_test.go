package filesystem

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestCopyFileBytesMatch(t *testing.T) {
	root := t.TempDir()
	srcDir := filepath.Join(root, "src")
	dstDir := filepath.Join(root, "dst")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		t.Fatal(err)
	}
	payload := bytes.Repeat([]byte("gfm-copy-"), 8000)
	src := filepath.Join(srcDir, "blob.bin")
	if err := os.WriteFile(src, payload, 0o644); err != nil {
		t.Fatal(err)
	}
	if err := CopyCtx(context.Background(), []string{src}, dstDir, nil); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(dstDir, "blob.bin"))
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(got, payload) {
		t.Fatalf("copied %d bytes, want %d", len(got), len(payload))
	}
}

func TestCopyDirectoryTree(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join(root, "tree")
	dst := filepath.Join(root, "out")
	nested := filepath.Join(src, "a", "b")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dst, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(nested, "c.txt"), []byte("nested"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(src, "root.txt"), []byte("root"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := CopyCtx(context.Background(), []string{src}, dst, nil); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(dst, "tree", "a", "b", "c.txt"))
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "nested" {
		t.Fatalf("got %q", got)
	}
}
