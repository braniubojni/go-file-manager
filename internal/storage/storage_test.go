package storage

import (
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
