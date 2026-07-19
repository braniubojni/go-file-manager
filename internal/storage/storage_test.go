package storage

import (
	"os"
	"path/filepath"
	"testing"
)

func TestBookmarks(t *testing.T) {
	db, err := OpenPath(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	bm, err := db.AddBookmark("Tmp", "/tmp")
	if err != nil {
		t.Fatal(err)
	}
	if bm.ID == 0 {
		t.Fatal("expected bookmark id")
	}
	list, err := db.ListBookmarks()
	if err != nil || len(list) != 1 {
		t.Fatalf("list=%+v err=%v", list, err)
	}
	if err := db.RemoveBookmark(bm.ID); err != nil {
		t.Fatal(err)
	}
	list, err = db.ListBookmarks()
	if err != nil || len(list) != 0 {
		t.Fatalf("expected empty list, got %+v", list)
	}
}

func TestEncryptedKV(t *testing.T) {
	dir := t.TempDir()
	db, err := OpenPath(filepath.Join(dir, "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := os.Stat(filepath.Join(dir, "app.key")); err != nil {
		t.Fatalf("expected app.key: %v", err)
	}

	plain := []byte(`{"theme":"dark","showHidden":true}`)
	if err := db.SetKV("settings", plain); err != nil {
		t.Fatal(err)
	}
	got, err := db.GetKV("settings")
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != string(plain) {
		t.Fatalf("got %q want %q", got, plain)
	}

	// Re-open with same key file
	_ = db.Close()
	db2, err := OpenPath(filepath.Join(dir, "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db2.Close() })
	got2, err := db2.GetKV("settings")
	if err != nil {
		t.Fatal(err)
	}
	if string(got2) != string(plain) {
		t.Fatalf("reopen got %q", got2)
	}
}
