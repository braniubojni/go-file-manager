package filesystem

import (
	"os"
	"path/filepath"
	"testing"
)

func TestListDirAndMkdir(t *testing.T) {
	root := t.TempDir()
	sub, err := Mkdir(root, "docs")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := os.Create(filepath.Join(sub, "a.txt")); err != nil {
		t.Fatal(err)
	}

	entries, err := ListDir(root)
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, e := range entries {
		if e.Name == "docs" && e.IsDir {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected docs dir in listing: %+v", entries)
	}
}

func TestCopyMoveRenameDelete(t *testing.T) {
	root := t.TempDir()
	left := filepath.Join(root, "left")
	right := filepath.Join(root, "right")
	if err := os.MkdirAll(left, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(right, 0o755); err != nil {
		t.Fatal(err)
	}

	srcFile := filepath.Join(left, "note.txt")
	if err := os.WriteFile(srcFile, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := Copy([]string{srcFile}, right); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(right, "note.txt")); err != nil {
		t.Fatal(err)
	}

	renamed, err := Rename(filepath.Join(right, "note.txt"), "note2.txt")
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Base(renamed) != "note2.txt" {
		t.Fatalf("unexpected rename result: %s", renamed)
	}

	if err := Move([]string{renamed}, left); err != nil {
		t.Fatal(err)
	}
	moved := filepath.Join(left, "note2.txt")
	if _, err := os.Stat(moved); err != nil {
		t.Fatal(err)
	}

	if err := Delete([]string{moved}); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(moved); !os.IsNotExist(err) {
		t.Fatalf("expected file deleted, err=%v", err)
	}
}

func TestValidateName(t *testing.T) {
	if _, err := Mkdir(t.TempDir(), "../evil"); err == nil {
		t.Fatal("expected invalid name error")
	}
}
