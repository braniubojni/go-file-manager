package storage

import (
	"path/filepath"
	"testing"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

func TestSettingsAndBookmarks(t *testing.T) {
	db, err := OpenPath(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if err := db.SavePanePaths("/tmp/a", "/tmp/b"); err != nil {
		t.Fatal(err)
	}
	paths, err := db.GetPanePaths()
	if err != nil {
		t.Fatal(err)
	}
	if paths.Left != "/tmp/a" || paths.Right != "/tmp/b" {
		t.Fatalf("unexpected paths: %+v", paths)
	}

	if err := db.SetSetting(domain.SettingTheme, "light"); err != nil {
		t.Fatal(err)
	}
	theme, err := db.GetSetting(domain.SettingTheme)
	if err != nil || theme != "light" {
		t.Fatalf("theme=%q err=%v", theme, err)
	}

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
