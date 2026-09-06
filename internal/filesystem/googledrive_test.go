package filesystem

import (
	"os"
	"path/filepath"
	"testing"
)

// noVolumesMount is a nonexistent path passed as volumesMount so tests never
// depend on the real host's /Volumes/GoogleDrive.
func noVolumesMount(home string) string {
	return filepath.Join(home, "no-such-volumes-mount")
}

func TestGoogleDrivePathsFromHomeMissing(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	if got := googleDrivePaths(home, noVolumesMount(home)); got != nil {
		t.Fatalf("got %v, want nil", got)
	}
}

func TestGoogleDrivePathsFromHomeSingleAccount(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	drive := filepath.Join(home, "Library", "CloudStorage", "GoogleDrive-a@example.com")
	if err := os.MkdirAll(drive, 0o755); err != nil {
		t.Fatal(err)
	}
	got := googleDrivePaths(home, noVolumesMount(home))
	if len(got) != 1 || got[0] != drive {
		t.Fatalf("got %v, want [%q]", got, drive)
	}
}

func TestGoogleDrivePathsFromHomeMultipleAccounts(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	a := filepath.Join(home, "Library", "CloudStorage", "GoogleDrive-a@example.com")
	b := filepath.Join(home, "Library", "CloudStorage", "GoogleDrive-b@example.com")
	for _, p := range []string{a, b} {
		if err := os.MkdirAll(p, 0o755); err != nil {
			t.Fatal(err)
		}
	}
	got := googleDrivePaths(home, noVolumesMount(home))
	if len(got) != 2 || got[0] != a || got[1] != b {
		t.Fatalf("got %v, want [%q %q]", got, a, b)
	}
}

func TestGoogleDrivePathsVolumesMount(t *testing.T) {
	t.Parallel()
	home := t.TempDir()
	mount := filepath.Join(home, "Volumes", "GoogleDrive")
	if err := os.MkdirAll(mount, 0o755); err != nil {
		t.Fatal(err)
	}
	got := googleDrivePaths(home, mount)
	if len(got) != 1 || got[0] != mount {
		t.Fatalf("got %v, want [%q]", got, mount)
	}
}
