package clipboard

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestParseURIList(t *testing.T) {
	in := `# comment
file:///tmp/photo.jpg
file:///Users/me/Movie%20clip.mp4

/already/abs.png
`
	got := parseURIList(in)
	if len(got) != 3 {
		t.Fatalf("len=%d %+v", len(got), got)
	}
	if got[0] != "/tmp/photo.jpg" {
		t.Fatalf("photo: %q", got[0])
	}
	if got[1] != "/Users/me/Movie clip.mp4" {
		t.Fatalf("movie: %q", got[1])
	}
	if got[2] != "/already/abs.png" {
		t.Fatalf("abs: %q", got[2])
	}
}

func TestApplyPNG(t *testing.T) {
	dest := t.TempDir()
	now := time.Date(2026, 8, 29, 13, 15, 0, 0, time.UTC)
	if err := apply(dest, nil, []byte("png"), now); err != nil {
		t.Fatal(err)
	}
	want := filepath.Join(dest, "clipboard-20260829131500.png")
	b, err := os.ReadFile(want)
	if err != nil {
		t.Fatal(err)
	}
	if string(b) != "png" {
		t.Fatalf("got %q", b)
	}
}

func TestApplyFiles(t *testing.T) {
	srcDir := t.TempDir()
	dest := t.TempDir()
	src := filepath.Join(srcDir, "shot.png")
	if err := os.WriteFile(src, []byte("img"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := apply(dest, []string{src}, []byte("ignored-png"), time.Now()); err != nil {
		t.Fatal(err)
	}
	got, err := os.ReadFile(filepath.Join(dest, "shot.png"))
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != "img" {
		t.Fatalf("got %q", got)
	}
}

func TestApplyEmpty(t *testing.T) {
	if err := apply(t.TempDir(), nil, nil, time.Now()); !errors.Is(err, ErrEmpty) {
		t.Fatalf("got %v", err)
	}
}
