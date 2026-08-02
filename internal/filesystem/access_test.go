package filesystem

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

func TestAccessForModes(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("unix permission bits")
	}
	if os.Geteuid() == 0 {
		t.Skip("root bypasses permission bits")
	}
	t.Parallel()
	dir := t.TempDir()

	cases := []struct {
		name  string
		mode  os.FileMode
		isDir bool
		want  string
	}{
		{"file rw", 0o644, false, AccessFull},
		{"file read only", 0o444, false, AccessReadOnly},
		{"file write only", 0o222, false, AccessPartial},
		{"file no access", 0o000, false, AccessNone},
		{"dir rwx", 0o755, true, AccessFull},
		{"dir read+enter", 0o555, true, AccessReadOnly},
		{"dir listable not enterable", 0o444, true, AccessPartial},
		{"dir no access", 0o000, true, AccessNone},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			p := filepath.Join(dir, tc.name)
			if tc.isDir {
				if err := os.Mkdir(p, 0o755); err != nil {
					t.Fatal(err)
				}
			} else if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
				t.Fatal(err)
			}
			if err := os.Chmod(p, tc.mode); err != nil {
				t.Fatal(err)
			}
			// Restore so TempDir cleanup can remove it.
			t.Cleanup(func() { _ = os.Chmod(p, 0o755) })

			info, err := os.Stat(p)
			if err != nil {
				t.Fatal(err)
			}
			if got := AccessFor(info); got != tc.want {
				t.Fatalf("AccessFor(%v) = %q, want %q", tc.mode, got, tc.want)
			}
		})
	}
}

func TestListDirReportsAccess(t *testing.T) {
	if runtime.GOOS == "windows" || os.Geteuid() == 0 {
		t.Skip("unix permission bits, non-root")
	}
	t.Parallel()
	dir := t.TempDir()
	locked := filepath.Join(dir, "locked")
	if err := os.Mkdir(locked, 0o000); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(locked, 0o755) })
	if err := os.WriteFile(filepath.Join(dir, "open.txt"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	entries, err := ListDir(dir, true)
	if err != nil {
		t.Fatal(err)
	}
	got := map[string]string{}
	for _, e := range entries {
		got[e.Name] = e.Access
	}
	if got["locked"] != AccessNone {
		t.Fatalf("locked dir access = %q, want %q", got["locked"], AccessNone)
	}
	if got["open.txt"] != AccessFull {
		t.Fatalf("open.txt access = %q, want %q", got["open.txt"], AccessFull)
	}
}

func TestDirChildSizesReportsDenied(t *testing.T) {
	if runtime.GOOS == "windows" || os.Geteuid() == 0 {
		t.Skip("unix permission bits, non-root")
	}
	t.Parallel()
	root := t.TempDir()

	// readable/ has a file plus an unreadable subdir: the size must still come
	// back (partial) and the child must be flagged, not dropped.
	readable := filepath.Join(root, "readable")
	if err := os.MkdirAll(filepath.Join(readable, "secret"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(readable, "a.bin"), make([]byte, 128), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(readable, "secret", "b.bin"), make([]byte, 64), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Chmod(filepath.Join(readable, "secret"), 0o000); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.Chmod(filepath.Join(readable, "secret"), 0o755) })

	res, err := DirChildSizes(root)
	if err != nil {
		t.Fatal(err)
	}
	if res.Sizes[readable] < 128 {
		t.Fatalf("expected the readable part to be counted, got %v", res.Sizes)
	}
	found := false
	for _, d := range res.Denied {
		if d == readable {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected %s in denied, got %v", readable, res.Denied)
	}
}
