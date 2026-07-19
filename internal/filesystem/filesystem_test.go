package filesystem

import (
	"os"
	"path/filepath"
	"strings"
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

	if _, err := os.Create(filepath.Join(root, ".hidden")); err != nil {
		t.Fatal(err)
	}
	entries, err := ListDir(root, false)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		if e.Name == ".hidden" {
			t.Fatal("hidden file should be filtered")
		}
	}
	entries, err = ListDir(root, true)
	if err != nil {
		t.Fatal(err)
	}
	foundHidden := false
	for _, e := range entries {
		if e.Name == ".hidden" {
			foundHidden = true
		}
	}
	if !foundHidden {
		t.Fatal("expected hidden file when showHidden=true")
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

func TestListPathCompletionsRanking(t *testing.T) {
	root := t.TempDir()
	// Create mixed matches for query "git"
	mustWrite := func(name string) {
		if err := os.WriteFile(filepath.Join(root, name), []byte("x"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	mustWrite("gitignore_extra.txt") // contains git, starts with git
	mustWrite("mygit")               // contains git, not starts
	mustWrite(".gitignore")          // dot + contains git
	if err := os.Mkdir(filepath.Join(root, "git"), 0o755); err != nil {
		t.Fatal(err)
	}

	out, err := ListPathCompletions(filepath.Join(root, "git"))
	if err != nil {
		t.Fatal(err)
	}
	if len(out) < 3 {
		t.Fatalf("expected several matches, got %v", out)
	}

	// First should be non-dot startsWith; dirs preferred — "git/" before files that start with git
	firstBase := filepath.Base(stringsTrimSlash(out[0]))
	if firstBase != "git" {
		t.Fatalf("expected git dir first (startsWith + dir), got %q in %v", firstBase, out)
	}

	// Dot entries last among matches
	lastBase := filepath.Base(stringsTrimSlash(out[len(out)-1]))
	if lastBase != ".gitignore" {
		// may not be last if only one dot — ensure all dots come after non-dots
		seenDot := false
		for _, p := range out {
			base := filepath.Base(stringsTrimSlash(p))
			if strings.HasPrefix(base, ".") {
				seenDot = true
			} else if seenDot {
				t.Fatalf("non-dot %q after dot entries: %v", base, out)
			}
		}
	}
}

func stringsTrimSlash(p string) string {
	for len(p) > 1 && (p[len(p)-1] == '/' || p[len(p)-1] == '\\') {
		p = p[:len(p)-1]
	}
	return p
}

func TestListPathCompletionsContainsAndDotsLast(t *testing.T) {
	root := t.TempDir()
	_ = os.WriteFile(filepath.Join(root, "alpha"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(root, ".alpha"), []byte("x"), 0o644)
	_ = os.WriteFile(filepath.Join(root, "beta"), []byte("x"), 0o644)

	out, err := ListPathCompletions(filepath.Join(root, "alp"))
	if err != nil {
		t.Fatal(err)
	}
	if len(out) != 2 {
		t.Fatalf("expected 2 matches, got %v", out)
	}
	if filepath.Base(out[0]) != "alpha" {
		t.Fatalf("non-dot should rank first, got %v", out)
	}
	if filepath.Base(out[1]) != ".alpha" {
		t.Fatalf("dot should be last, got %v", out)
	}
}
