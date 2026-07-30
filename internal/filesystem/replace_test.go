package filesystem

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestReplaceOccurrence(t *testing.T) {
	root := t.TempDir()
	p := filepath.Join(root, "a.txt")
	_ = os.WriteFile(p, []byte("one hello two\nhello three\n"), 0o644)

	// Second line "hello" starts at column 1
	if err := ReplaceOccurrence(p, "hello", "hi", 2, 1, true); err != nil {
		t.Fatal(err)
	}
	data, _ := os.ReadFile(p)
	got := string(data)
	if !strings.Contains(got, "one hello two") || !strings.Contains(got, "hi three") {
		t.Fatalf("got %q", got)
	}
	if strings.Count(got, "hello") != 1 {
		t.Fatalf("should leave first hello: %q", got)
	}
}

func TestReplaceAllInFileCaseInsensitive(t *testing.T) {
	root := t.TempDir()
	p := filepath.Join(root, "a.txt")
	_ = os.WriteFile(p, []byte("Hello HELLO hello\n"), 0o644)
	n, err := ReplaceAllInFile(p, "hello", "x", false)
	if err != nil {
		t.Fatal(err)
	}
	if n != 3 {
		t.Fatalf("want 3 replacements, got %d", n)
	}
	data, _ := os.ReadFile(p)
	if strings.Contains(strings.ToLower(string(data)), "hello") {
		t.Fatalf("got %q", data)
	}
}

func TestReplaceAllInPaths(t *testing.T) {
	root := t.TempDir()
	p1 := filepath.Join(root, "a.txt")
	p2 := filepath.Join(root, "b.txt")
	_ = os.WriteFile(p1, []byte("foo bar foo\n"), 0o644)
	_ = os.WriteFile(p2, []byte("foo\n"), 0o644)
	files, reps, err := ReplaceAllInPaths([]string{p1, p2, p1}, "foo", "baz", true)
	if err != nil {
		t.Fatal(err)
	}
	if files != 2 || reps != 3 {
		t.Fatalf("files=%d reps=%d", files, reps)
	}
}
