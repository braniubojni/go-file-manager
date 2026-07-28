// Package gitstatus resolves a local git repo root (upward only) and
// returns porcelain status for a directory's immediate children.
package gitstatus

import (
	"bytes"
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const statusTimeout = 1500 * time.Millisecond

// Cache memoizes repo-root discovery so we never re-walk parents for the same path.
type Cache struct {
	mu    sync.Mutex
	roots map[string]rootResult // abs path → result
}

type rootResult struct {
	root string // empty if not in a repo
	ok   bool   // true if we know the answer
}

// NewCache creates an empty root-resolution cache.
func NewCache() *Cache {
	return &Cache{roots: make(map[string]rootResult)}
}

// FindRepoRoot walks parents of dir only (no downward search). Uses cache.
// Positive hits inherit to children under a known root. Negative hits are
// stored only for the exact path (never for ancestors — a sibling may be a repo).
func (c *Cache) FindRepoRoot(dir string) (root string, inRepo bool) {
	dir = filepath.Clean(dir)
	if dir == "" {
		return "", false
	}
	if abs, err := filepath.Abs(dir); err == nil {
		dir = abs
	}

	c.mu.Lock()
	if r, hit := c.roots[dir]; hit && r.ok {
		c.mu.Unlock()
		return r.root, r.root != ""
	}
	// If an ancestor is a known repo root (or known under a root), reuse it.
	for p := dir; ; {
		if r, hit := c.roots[p]; hit && r.ok && r.root != "" {
			if dir == r.root || strings.HasPrefix(dir, r.root+string(os.PathSeparator)) {
				c.roots[dir] = rootResult{root: r.root, ok: true}
				c.mu.Unlock()
				return r.root, true
			}
		}
		parent := filepath.Dir(p)
		if parent == p {
			break
		}
		p = parent
	}
	c.mu.Unlock()

	found, ok := walkUpForGit(dir)

	c.mu.Lock()
	defer c.mu.Unlock()
	if ok {
		// Cache every prefix from dir up to root as "in this repo".
		for p := dir; ; {
			c.roots[p] = rootResult{root: found, ok: true}
			if p == found {
				break
			}
			parent := filepath.Dir(p)
			if parent == p {
				break
			}
			p = parent
		}
		return found, true
	}
	// Exact path only — do not poison parents/siblings.
	c.roots[dir] = rootResult{root: "", ok: true}
	return "", false
}

func walkUpForGit(dir string) (root string, ok bool) {
	for p := dir; ; {
		gitPath := filepath.Join(p, ".git")
		if st, err := os.Lstat(gitPath); err == nil && (st.IsDir() || st.Mode().IsRegular()) {
			return p, true
		}
		parent := filepath.Dir(p)
		if parent == p {
			return "", false
		}
		p = parent
	}
}

var (
	gitOnce sync.Once
	gitPath string
	gitOK   bool
)

func lookGit() (string, bool) {
	gitOnce.Do(func() {
		p, err := exec.LookPath("git")
		if err == nil {
			gitPath = p
			gitOK = true
		}
	})
	return gitPath, gitOK
}

// Entry is one child name and a compact status code.
type Entry struct {
	Name   string
	Status string // M | A | D | U | ?
}

// DirStatus is status for immediate children of a directory.
type DirStatus struct {
	RepoRoot string
	Entries  []Entry
}

// StatusForDir runs a single scoped git status for dir. dir must be local.
func (c *Cache) StatusForDir(ctx context.Context, dir string) (DirStatus, error) {
	dir = filepath.Clean(dir)
	if abs, err := filepath.Abs(dir); err == nil {
		dir = abs
	}

	root, inRepo := c.FindRepoRoot(dir)
	if !inRepo {
		return DirStatus{}, nil
	}

	bin, ok := lookGit()
	if !ok {
		return DirStatus{RepoRoot: root}, nil
	}

	rel, err := filepath.Rel(root, dir)
	if err != nil {
		return DirStatus{RepoRoot: root}, nil
	}
	if rel == "." {
		rel = ""
	}
	// git pathspecs use forward slashes
	relSlash := filepath.ToSlash(rel)

	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, statusTimeout)
	defer cancel()

	args := []string{"-C", root, "--no-optional-locks", "status", "--porcelain=v1", "-z"}
	if relSlash != "" {
		args = append(args, "--", relSlash)
	} else {
		args = append(args, "--", ".")
	}

	cmd := exec.CommandContext(ctx, bin, args...)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		// Timeout / missing repo / git error: soft-fail empty status.
		return DirStatus{RepoRoot: root}, nil
	}

	entries := aggregateChildren(relSlash, stdout.Bytes())
	return DirStatus{RepoRoot: root, Entries: entries}, nil
}

// aggregateChildren maps porcelain paths to immediate child names under listedRel.
// listedRel is path relative to repo root using forward slashes ("" for root).
func aggregateChildren(listedRel string, porcelain []byte) []Entry {
	// name → best status (prefer conflict > modified > added > deleted > untracked)
	prio := map[string]int{"U": 5, "M": 4, "A": 3, "D": 2, "?": 1}
	best := map[string]string{}

	for _, pe := range parsePorcelainZ(porcelain) {
		path := pe.path
		if listedRel != "" {
			prefix := listedRel + "/"
			if path != listedRel && !strings.HasPrefix(path, prefix) {
				continue
			}
			if path == listedRel {
				// the directory itself listed as changed — skip as child
				continue
			}
			path = strings.TrimPrefix(path, prefix)
		}
		// immediate child name
		name, _, _ := strings.Cut(path, "/")
		if name == "" || name == "." {
			continue
		}
		st := pe.status
		if prev, ok := best[name]; ok {
			if prio[st] <= prio[prev] {
				continue
			}
		}
		best[name] = st
	}

	out := make([]Entry, 0, len(best))
	for name, st := range best {
		out = append(out, Entry{Name: name, Status: st})
	}
	return out
}

type porcelainEntry struct {
	status string
	path   string
}

// parsePorcelainZ parses -z porcelain v1 output.
func parsePorcelainZ(data []byte) []porcelainEntry {
	var out []porcelainEntry
	// Records are NUL-separated. Rename: "XY old\0new\0" or for non-rename "XY path\0"
	i := 0
	for i < len(data) {
		// find end of this segment
		j := bytes.IndexByte(data[i:], 0)
		if j < 0 {
			break
		}
		seg := string(data[i : i+j])
		i += j + 1
		if len(seg) < 3 {
			continue
		}
		xy := seg[:2]
		path := strings.TrimSpace(seg[3:])
		// rename/copy: next NUL field is new path
		if xy[0] == 'R' || xy[0] == 'C' || xy[1] == 'R' || xy[1] == 'C' {
			if i < len(data) {
				k := bytes.IndexByte(data[i:], 0)
				if k >= 0 {
					path = string(data[i : i+k])
					i += k + 1
				}
			}
		}
		if path == "" {
			continue
		}
		out = append(out, porcelainEntry{status: compactStatus(xy), path: filepath.ToSlash(path)})
	}
	return out
}

func compactStatus(xy string) string {
	if len(xy) < 2 {
		return "M"
	}
	a, b := xy[0], xy[1]
	// unmerged
	if a == 'U' || b == 'U' || (a == 'A' && b == 'A') || (a == 'D' && b == 'D') {
		return "U"
	}
	if a == '?' || b == '?' {
		return "?"
	}
	if a == 'A' || b == 'A' {
		return "A"
	}
	if a == 'D' || b == 'D' {
		return "D"
	}
	// M, R, C, T, etc. → modified
	return "M"
}
