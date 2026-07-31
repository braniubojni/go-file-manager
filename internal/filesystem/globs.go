package filesystem

import (
	"path"
	"path/filepath"
	"strings"
)

// ParseGlobList splits a comma-separated include/exclude string into trimmed patterns.
func ParseGlobList(s string) []string {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// PathFilter applies include/exclude globs to a slash-normalized relative path.
// Empty include matches everything; exclude always wins when it matches.
type PathFilter struct {
	include []string
	exclude []string
}

// NewPathFilter builds a filter from raw comma-separated pattern lists.
func NewPathFilter(include, exclude string) PathFilter {
	return PathFilter{
		include: ParseGlobList(include),
		exclude: ParseGlobList(exclude),
	}
}

// Match reports whether relPath (slash-separated, relative to search root) is allowed.
// For directories during walk, pass the directory's relative path; basename is last segment.
func (f PathFilter) Match(relPath string) bool {
	rel := filepath.ToSlash(relPath)
	if rel == "." || rel == "" {
		return true
	}
	if f.matchesAny(f.exclude, rel) {
		return false
	}
	if len(f.include) == 0 {
		return true
	}
	return f.matchesAny(f.include, rel)
}

// MatchDir is like Match but for directories: exclude still applies; include is
// permissive so we can walk into a tree that may contain included files later
// unless the directory itself is excluded. If any include pattern is a pure
// basename/segment pattern, we keep walking; if all includes require a path
// prefix that cannot match under this dir, we still walk (simple semantics).
func (f PathFilter) MatchDir(relPath string) bool {
	rel := filepath.ToSlash(relPath)
	if rel == "." || rel == "" {
		return true
	}
	// Excluded directory: skip entire subtree.
	if f.matchesAny(f.exclude, rel) {
		return false
	}
	return true
}

func (f PathFilter) matchesAny(patterns []string, rel string) bool {
	base := path.Base(rel)
	segments := strings.Split(rel, "/")
	for _, pat := range patterns {
		if matchPattern(pat, rel, base, segments) {
			return true
		}
	}
	return false
}

// matchPattern implements simple VS Code–ish globs:
// - pattern containing '/' matches against full relative path
// - otherwise matches basename OR any path segment
func matchPattern(pat, rel, base string, segments []string) bool {
	pat = strings.TrimSpace(pat)
	if pat == "" {
		return false
	}
	// Normalize ** away for simple matching: treat as *
	pat = strings.ReplaceAll(pat, "**", "*")

	if strings.Contains(pat, "/") {
		ok, err := path.Match(pat, rel)
		return err == nil && ok
	}

	ok, err := path.Match(pat, base)
	if err == nil && ok {
		return true
	}
	for _, seg := range segments {
		ok, err := path.Match(pat, seg)
		if err == nil && ok {
			return true
		}
	}
	return false
}
