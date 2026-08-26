package filesystem

import (
	"os"
	"path/filepath"
	"testing"
)

func TestICloudDriveFromHomeMissing(t *testing.T) {
	t.Parallel()
	if got := iCloudDriveFromHome(t.TempDir()); got != "" {
		t.Fatalf("got %q, want empty", got)
	}
}

func TestICloudDriveFromHomeCloudDocs(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	docs := filepath.Join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
	if err := os.MkdirAll(docs, 0o755); err != nil {
		t.Fatal(err)
	}
	if got := iCloudDriveFromHome(home); got != docs {
		t.Fatalf("got %q, want %q", got, docs)
	}
}

func TestICloudDriveFromHomeCloudStorage(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	drive := filepath.Join(home, "Library", "CloudStorage", "iCloud Drive-user@example.com")
	if err := os.MkdirAll(drive, 0o755); err != nil {
		t.Fatal(err)
	}
	if got := iCloudDriveFromHome(home); got != drive {
		t.Fatalf("got %q, want %q", got, drive)
	}
}
