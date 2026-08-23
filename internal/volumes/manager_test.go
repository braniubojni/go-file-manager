package volumes

import (
	"path/filepath"
	"testing"
)

func TestParentOverrideUsesAttachedDmgDir(t *testing.T) {
	m := NewManager()
	dmg := filepath.Join(t.TempDir(), "disk.dmg")
	mount := t.TempDir()
	m.attach[mount] = dmg
	got := m.ParentOverride(mount)
	want := filepath.Dir(dmg)
	if got != want {
		t.Fatalf("ParentOverride = %q, want %q", got, want)
	}
	if got := m.ParentOverride(filepath.Join(mount, "inner")); got != "" {
		t.Fatalf("inner dir should not rewrite parent, got %q", got)
	}
}
