package gitstatus

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestFindRepoRoot_UpwardOnly(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "a", "b", "c")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Mkdir(filepath.Join(root, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}

	c := NewCache()
	got, ok := c.FindRepoRoot(nested)
	if !ok || got != root {
		t.Fatalf("FindRepoRoot=%q ok=%v want %q", got, ok, root)
	}

	// Outside repo
	other := t.TempDir()
	got, ok = c.FindRepoRoot(other)
	if ok || got != "" {
		t.Fatalf("outside repo: got %q ok=%v", got, ok)
	}
}

func TestFindRepoRoot_GitFileWorktree(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, ".git"), []byte("gitdir: /tmp/fake\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	c := NewCache()
	got, ok := c.FindRepoRoot(root)
	if !ok || got != root {
		t.Fatalf("got %q ok=%v", got, ok)
	}
}

func TestFindRepoRoot_CacheHit(t *testing.T) {
	root := t.TempDir()
	if err := os.Mkdir(filepath.Join(root, ".git"), 0o755); err != nil {
		t.Fatal(err)
	}
	c := NewCache()
	_, _ = c.FindRepoRoot(root)
	// Poison would fail if re-walk required; mark root cached and ensure child reuses.
	child := filepath.Join(root, "sub")
	_ = os.Mkdir(child, 0o755)
	got, ok := c.FindRepoRoot(child)
	if !ok || got != root {
		t.Fatalf("cached child: %q ok=%v", got, ok)
	}
}

func TestParsePorcelainZ_AndAggregate(t *testing.T) {
	// M  file.go\0?? new.txt\0 M nested/x.go\0
	raw := []byte("M  file.go\x00?? new.txt\x00 M nested/x.go\x00")
	entries := aggregateChildren("", raw)
	m := map[string]string{}
	for _, e := range entries {
		m[e.Name] = e.Status
	}
	if m["file.go"] != "M" {
		t.Fatalf("file.go: %v", m)
	}
	if m["new.txt"] != "?" {
		t.Fatalf("new.txt: %v", m)
	}
	if m["nested"] != "M" {
		t.Fatalf("nested dir should be M from child: %v", m)
	}

	// Scoped under sub/
	raw2 := []byte("M  sub/a.go\x00?? sub/b.txt\x00 M other/c.go\x00")
	entries2 := aggregateChildren("sub", raw2)
	m2 := map[string]string{}
	for _, e := range entries2 {
		m2[e.Name] = e.Status
	}
	if m2["a.go"] != "M" || m2["b.txt"] != "?" {
		t.Fatalf("scoped: %v", m2)
	}
	if _, ok := m2["other"]; ok {
		t.Fatalf("should not include other: %v", m2)
	}
}

func TestCompactStatus(t *testing.T) {
	cases := map[string]string{
		"M ": "M",
		" M": "M",
		"A ": "A",
		"D ": "D",
		"??": "?",
		"UU": "U",
		"AA": "U",
		"R ": "M",
	}
	for xy, want := range cases {
		if got := compactStatus(xy); got != want {
			t.Errorf("compactStatus(%q)=%q want %q", xy, got, want)
		}
	}
}

func TestStatusForDir_Integration(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not installed")
	}
	root := t.TempDir()
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command("git", append([]string{"-C", root}, args...)...)
		cmd.Env = append(os.Environ(), "GIT_AUTHOR_NAME=t", "GIT_AUTHOR_EMAIL=t@t", "GIT_COMMITTER_NAME=t", "GIT_COMMITTER_EMAIL=t@t")
		out, err := cmd.CombinedOutput()
		if err != nil {
			t.Fatalf("git %v: %v\n%s", args, err, out)
		}
	}
	run("init")
	// Avoid template/hooks noise
	run("config", "user.email", "t@t")
	run("config", "user.name", "t")

	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("a\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("add", "tracked.txt")
	run("commit", "-m", "init")

	if err := os.WriteFile(filepath.Join(root, "tracked.txt"), []byte("b\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(root, "new.txt"), []byte("n\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	c := NewCache()
	st, err := c.StatusForDir(context.Background(), root)
	if err != nil {
		t.Fatal(err)
	}
	if st.RepoRoot != root {
		t.Fatalf("RepoRoot=%q", st.RepoRoot)
	}
	m := map[string]string{}
	for _, e := range st.Entries {
		m[e.Name] = e.Status
	}
	if m["tracked.txt"] != "M" {
		t.Fatalf("tracked: %v", m)
	}
	if m["new.txt"] != "?" {
		t.Fatalf("new: %v", m)
	}

	diff := c.FileDiff(context.Background(), filepath.Join(root, "tracked.txt"))
	if diff.Message != "" && diff.OldText == "" {
		t.Fatalf("FileDiff modified: %+v", diff)
	}
	if diff.OldText != "a\n" || diff.NewText != "b\n" {
		t.Fatalf("FileDiff texts old=%q new=%q", diff.OldText, diff.NewText)
	}
	if diff.Status != "M" {
		t.Fatalf("status=%q", diff.Status)
	}

	ud := c.FileDiff(context.Background(), filepath.Join(root, "new.txt"))
	if ud.OldText != "" || ud.NewText != "n\n" {
		t.Fatalf("untracked: old=%q new=%q msg=%q", ud.OldText, ud.NewText, ud.Message)
	}
}

func TestFileDiff_OutsideRepo(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, "x.txt")
	if err := os.WriteFile(p, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	d := NewCache().FileDiff(context.Background(), p)
	if d.Message == "" {
		t.Fatalf("expected message, got %+v", d)
	}
}
