package filesystem

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"
)

func TestCopyManySmallFiles(t *testing.T) {
	root := t.TempDir()
	src := filepath.Join(root, "src")
	dst := filepath.Join(root, "dst")
	if err := os.MkdirAll(src, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dst, 0o755); err != nil {
		t.Fatal(err)
	}
	want := map[string][]byte{}
	for i := 0; i < 12; i++ {
		base := string(rune('a'+i)) + ".txt"
		b := bytes.Repeat([]byte{byte(i + 1)}, 64)
		if err := os.WriteFile(filepath.Join(src, base), b, 0o644); err != nil {
			t.Fatal(err)
		}
		want[base] = b
	}
	if err := CopyCtx(context.Background(), []string{src}, dst, nil); err != nil {
		t.Fatal(err)
	}
	copied := filepath.Join(dst, "src")
	for name, body := range want {
		got, err := os.ReadFile(filepath.Join(copied, name))
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(got, body) {
			t.Fatalf("%s: mismatch", name)
		}
	}
}

func TestCopyCancelDeletesReportedDest(t *testing.T) {
	root := t.TempDir()
	srcDir := filepath.Join(root, "src")
	dstDir := filepath.Join(root, "dst")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		t.Fatal(err)
	}
	payload := bytes.Repeat([]byte("x"), 64*1024)
	var sources []string
	for i := 0; i < 6; i++ {
		p := filepath.Join(srcDir, string(rune('a'+i))+".bin")
		if err := os.WriteFile(p, payload, 0o644); err != nil {
			t.Fatal(err)
		}
		sources = append(sources, p)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	err := CopyCtx(ctx, sources, dstDir, func(ev ProgressEvent) {
		if ev.DestPath != "" {
			cancel()
		}
	})
	if err != nil && !isCanceled(err) {
		t.Fatalf("unexpected: %v", err)
	}
	ents, rdErr := os.ReadDir(dstDir)
	if rdErr != nil {
		t.Fatal(rdErr)
	}
	if err == nil {
		return // finished before cancel landed
	}
	if len(ents) != 0 {
		t.Fatalf("copy cancel should remove dest artifacts, leftover %v", names(ents))
	}
}

func names(ents []os.DirEntry) []string {
	out := make([]string, len(ents))
	for i, e := range ents {
		out[i] = e.Name()
	}
	return out
}

// TestCopyPerFileCancel: cancelling one source via FileCancelRegistry skips
// only that source (its partial dest removed) — sibling sources still copy.
func TestCopyPerFileCancel(t *testing.T) {
	root := t.TempDir()
	srcDir := filepath.Join(root, "src")
	dstDir := filepath.Join(root, "dst")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		t.Fatal(err)
	}
	payload := bytes.Repeat([]byte("x"), 64*1024)
	var sources []string
	for i := 0; i < 4; i++ {
		p := filepath.Join(srcDir, string(rune('a'+i))+".bin")
		if err := os.WriteFile(p, payload, 0o644); err != nil {
			t.Fatal(err)
		}
		sources = append(sources, p)
	}
	target := sources[1] // "b.bin" — cancel this one specifically

	reg := NewFileCancelRegistry()
	ctx := WithFileCancelRegistry(context.Background(), reg)
	err := CopyCtx(ctx, sources, dstDir, func(ev ProgressEvent) {
		if ev.DestPath != "" && filepath.Base(ev.DestPath) == filepath.Base(target) {
			reg.Cancel(target)
		}
	})
	if err != nil {
		t.Fatalf("batch should not fail from a per-file cancel: %v", err)
	}
	if _, statErr := os.Stat(filepath.Join(dstDir, "b.bin")); !os.IsNotExist(statErr) {
		t.Fatalf("cancelled source should not have a dest file, got err=%v", statErr)
	}
	for _, name := range []string{"a.bin", "c.bin", "d.bin"} {
		if _, statErr := os.Stat(filepath.Join(dstDir, name)); statErr != nil {
			t.Fatalf("sibling %s should have copied: %v", name, statErr)
		}
	}
}
