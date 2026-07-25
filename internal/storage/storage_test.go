package storage

import (
	"fmt"
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

func TestRemoteRecent_upsertAndOrder(t *testing.T) {
	db, err := OpenPath(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	const sk = "user@host:22"

	// Insert two paths
	if err := db.AddRemoteRecent(sk, "ssh://user@host:22/home/user", "/home/user"); err != nil {
		t.Fatal(err)
	}
	if err := db.AddRemoteRecent(sk, "ssh://user@host:22/projects", "/projects"); err != nil {
		t.Fatal(err)
	}

	list, err := db.GetRemoteRecent(sk)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(list))
	}
	// Newest first
	if list[0].Label != "/projects" {
		t.Errorf("newest first: want /projects, got %s", list[0].Label)
	}
}

func TestRemoteRecent_upsertUpdatesTimestamp(t *testing.T) {
	db, err := OpenPath(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	const sk = "user@host:22"
	const vpath = "ssh://user@host:22/home/user"

	if err := db.AddRemoteRecent(sk, vpath, "/home/user"); err != nil {
		t.Fatal(err)
	}
	// Insert a different path so it becomes the newest
	if err := db.AddRemoteRecent(sk, "ssh://user@host:22/tmp", "/tmp"); err != nil {
		t.Fatal(err)
	}
	// Re-visit the first path — it should become newest again
	if err := db.AddRemoteRecent(sk, vpath, "/home/user"); err != nil {
		t.Fatal(err)
	}

	list, err := db.GetRemoteRecent(sk)
	if err != nil {
		t.Fatal(err)
	}
	if list[0].Label != "/home/user" {
		t.Errorf("re-visited path should be newest, got %s", list[0].Label)
	}
}

func TestRemoteRecent_capAt10(t *testing.T) {
	db, err := OpenPath(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	const sk = "user@host:22"

	for i := range 15 {
		vpath := fmt.Sprintf("ssh://user@host:22/dir%02d", i)
		label := fmt.Sprintf("/dir%02d", i)
		if err := db.AddRemoteRecent(sk, vpath, label); err != nil {
			t.Fatalf("insert %d: %v", i, err)
		}
	}

	list, err := db.GetRemoteRecent(sk)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 10 {
		t.Errorf("expected cap of 10, got %d", len(list))
	}
	// Most recent should be dir14
	if list[0].Label != "/dir14" {
		t.Errorf("want newest /dir14, got %s", list[0].Label)
	}
}

func TestRemoteRecent_isolatedBySessionKey(t *testing.T) {
	db, err := OpenPath(filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if err := db.AddRemoteRecent("a@host:22", "ssh://a@host:22/home", "/home"); err != nil {
		t.Fatal(err)
	}
	if err := db.AddRemoteRecent("b@host:22", "ssh://b@host:22/var", "/var"); err != nil {
		t.Fatal(err)
	}

	listA, _ := db.GetRemoteRecent("a@host:22")
	listB, _ := db.GetRemoteRecent("b@host:22")

	if len(listA) != 1 || listA[0].Label != "/home" {
		t.Errorf("session A isolation failed: %+v", listA)
	}
	if len(listB) != 1 || listB[0].Label != "/var" {
		t.Errorf("session B isolation failed: %+v", listB)
	}
}
