package filesystem

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func writeFile(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
}

func TestTrashRoundTrip(t *testing.T) {
	t.Parallel()
	work := t.TempDir()
	tr := NewTrash(filepath.Join(work, "trash"))

	file := filepath.Join(work, "note.txt")
	writeFile(t, file, "hello")
	dir := filepath.Join(work, "sub")
	if err := os.Mkdir(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	writeFile(t, filepath.Join(dir, "inner.txt"), "inner")

	id, err := tr.MoveToTrash([]string{file, dir})
	if err != nil {
		t.Fatalf("MoveToTrash: %v", err)
	}
	if id == "" {
		t.Fatal("expected a restorable batch id")
	}
	if _, err := os.Lstat(file); !os.IsNotExist(err) {
		t.Fatalf("file still present after delete: %v", err)
	}
	if _, err := os.Lstat(dir); !os.IsNotExist(err) {
		t.Fatalf("dir still present after delete: %v", err)
	}

	if err := tr.Restore(id); err != nil {
		t.Fatalf("Restore: %v", err)
	}
	if b, err := os.ReadFile(file); err != nil || string(b) != "hello" {
		t.Fatalf("file not restored: %v %q", err, b)
	}
	if b, err := os.ReadFile(filepath.Join(dir, "inner.txt")); err != nil || string(b) != "inner" {
		t.Fatalf("dir not restored: %v %q", err, b)
	}
	// A fully restored batch leaves no directory behind.
	if _, err := os.Stat(filepath.Join(work, "trash", id)); !os.IsNotExist(err) {
		t.Fatalf("batch dir not cleaned up: %v", err)
	}
}

func TestTrashRestoreDoesNotClobber(t *testing.T) {
	t.Parallel()
	work := t.TempDir()
	tr := NewTrash(filepath.Join(work, "trash"))

	file := filepath.Join(work, "note.txt")
	writeFile(t, file, "old")
	id, err := tr.MoveToTrash([]string{file})
	if err != nil {
		t.Fatal(err)
	}
	writeFile(t, file, "new")

	if err := tr.Restore(id); err == nil {
		t.Fatal("expected Restore to refuse when the origin is occupied")
	}
	if b, _ := os.ReadFile(file); string(b) != "new" {
		t.Fatalf("existing file was clobbered: %q", b)
	}
}

func TestTrashRestoreRejectsBadID(t *testing.T) {
	t.Parallel()
	tr := NewTrash(t.TempDir())
	for _, id := range []string{"", "../../etc", "nope", "20240101-000000000"} {
		if err := tr.Restore(id); err == nil {
			t.Fatalf("expected error for batch id %q", id)
		}
	}
}

func TestTrashPurgeOlderThan(t *testing.T) {
	t.Parallel()
	work := t.TempDir()
	root := filepath.Join(work, "trash")
	tr := NewTrash(root)

	file := filepath.Join(work, "note.txt")
	writeFile(t, file, "hello")
	id, err := tr.MoveToTrash([]string{file})
	if err != nil {
		t.Fatal(err)
	}

	// Too young to purge.
	if err := tr.PurgeOlderThan(time.Hour); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, id)); err != nil {
		t.Fatalf("batch purged too early: %v", err)
	}

	old := time.Now().Add(-48 * time.Hour)
	if err := os.Chtimes(filepath.Join(root, id), old, old); err != nil {
		t.Fatal(err)
	}
	if err := tr.PurgeOlderThan(24 * time.Hour); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(root, id)); !os.IsNotExist(err) {
		t.Fatalf("stale batch not purged: %v", err)
	}
}

func TestTrashMissingPath(t *testing.T) {
	t.Parallel()
	work := t.TempDir()
	tr := NewTrash(filepath.Join(work, "trash"))
	if _, err := tr.MoveToTrash([]string{filepath.Join(work, "nope.txt")}); err == nil {
		t.Fatal("expected an error for a missing path")
	}
}
