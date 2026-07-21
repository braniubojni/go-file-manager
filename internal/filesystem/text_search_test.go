package filesystem

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCreateFileAndReadWrite(t *testing.T) {
	root := t.TempDir()
	p, err := CreateFile(root, "hello.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := CreateFile(root, "hello.txt"); err == nil {
		t.Fatal("expected exists error")
	}
	if err := WriteTextFile(p, "hi there"); err != nil {
		t.Fatal(err)
	}
	got, err := ReadTextFile(p)
	if err != nil {
		t.Fatal(err)
	}
	if got != "hi there" {
		t.Fatalf("got %q", got)
	}
}

func TestCreateFileBadName(t *testing.T) {
	if _, err := CreateFile(t.TempDir(), "../x"); err == nil {
		t.Fatal("expected invalid name")
	}
}

func TestSearchTree(t *testing.T) {
	root := t.TempDir()
	_ = os.MkdirAll(filepath.Join(root, "docs", "nested"), 0o755)
	_ = os.WriteFile(filepath.Join(root, "main.go"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(root, "docs", "main.md"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(root, "docs", "nested", "note.txt"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(root, ".hidden"), []byte("x"), 0o644)

	hits, err := SearchTree(root, "main", false, 20)
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) < 2 {
		t.Fatalf("expected >=2 hits, got %d", len(hits))
	}
	for _, h := range hits {
		if !strings.Contains(strings.ToLower(h.Name), "main") {
			t.Fatalf("unexpected hit %v", h)
		}
	}

	// hidden skipped
	for _, h := range hits {
		if strings.HasPrefix(h.Name, ".") {
			t.Fatal("hidden should be skipped")
		}
	}

	// empty query: immediate children only
	top, err := SearchTree(root, "", false, 50)
	if err != nil {
		t.Fatal(err)
	}
	for _, h := range top {
		if strings.Contains(h.RelPath, "/") {
			t.Fatalf("empty query should be top-level only: %s", h.RelPath)
		}
	}
}
