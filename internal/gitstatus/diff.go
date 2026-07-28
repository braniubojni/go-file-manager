package gitstatus

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"unicode/utf8"
)

// MaxDiffBytes caps each side of a content diff (same order as editor limit).
const MaxDiffBytes = 5 << 20 // 5 MiB

// FileDiff is HEAD (or empty) vs working-tree content for one path.
type FileDiff struct {
	Path      string
	RepoRoot  string
	RelPath   string
	Status    string
	OldText   string
	NewText   string
	Binary    bool
	Truncated bool
	Message   string
}

// FileDiff loads old/new text for a local file inside a git repo.
// Soft-fails with Message set; never walks the tree looking for .git.
func (c *Cache) FileDiff(ctx context.Context, path string) FileDiff {
	path = filepath.Clean(path)
	if path == "" {
		return FileDiff{Message: "empty path"}
	}
	if abs, err := filepath.Abs(path); err == nil {
		path = abs
	}

	dir := filepath.Dir(path)
	root, inRepo := c.FindRepoRoot(dir)
	if !inRepo {
		return FileDiff{Path: path, Message: "not inside a git repository"}
	}

	rel, err := filepath.Rel(root, path)
	if err != nil || strings.HasPrefix(rel, "..") {
		return FileDiff{Path: path, RepoRoot: root, Message: "path outside repository"}
	}
	relSlash := filepath.ToSlash(rel)

	bin, ok := lookGit()
	if !ok {
		return FileDiff{Path: path, RepoRoot: root, RelPath: relSlash, Message: "git binary not found"}
	}

	if ctx == nil {
		ctx = context.Background()
	}
	ctx, cancel := context.WithTimeout(ctx, statusTimeout)
	defer cancel()

	out := FileDiff{
		Path:     path,
		RepoRoot: root,
		RelPath:  relSlash,
		Status:   statusForFile(ctx, bin, root, relSlash),
	}

	// Working tree (new); missing file = deleted from disk.
	newText, newBin, newTrunc, newErr := readWorktreeText(path)
	if newErr != nil && !os.IsNotExist(newErr) {
		out.Message = newErr.Error()
		return out
	}
	if newBin {
		out.Binary = true
		out.Message = "binary or unsupported encoding in working tree"
		return out
	}
	out.NewText = newText
	if newTrunc {
		out.Truncated = true
	}

	// HEAD blob (old)
	oldText, oldBin, oldTrunc, oldOK := gitShowHEAD(ctx, bin, root, relSlash)
	if oldBin {
		out.Binary = true
		out.Message = "binary blob in HEAD"
		out.OldText = ""
		out.NewText = ""
		return out
	}
	if oldOK {
		out.OldText = oldText
		if oldTrunc {
			out.Truncated = true
		}
	}

	if out.OldText == "" && out.NewText == "" && out.Message == "" {
		out.Message = "no content available for this path"
	}
	return out
}

func readWorktreeText(path string) (text string, binary, truncated bool, err error) {
	info, err := os.Lstat(path)
	if err != nil {
		return "", false, false, err
	}
	if info.IsDir() {
		return "", false, false, fmt.Errorf("not a file: %s", path)
	}
	size := info.Size()
	if size > MaxDiffBytes {
		// read truncated head
		f, err := os.Open(path)
		if err != nil {
			return "", false, false, err
		}
		defer func() { _ = f.Close() }()
		buf := make([]byte, MaxDiffBytes)
		n, err := f.Read(buf)
		if err != nil && n == 0 {
			return "", false, false, err
		}
		buf = buf[:n]
		if !utf8.Valid(buf) {
			return "", true, true, nil
		}
		return string(buf), false, true, nil
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return "", false, false, err
	}
	if !utf8.Valid(data) {
		return "", true, false, nil
	}
	return string(data), false, false, nil
}

func gitShowHEAD(ctx context.Context, gitBin, root, relSlash string) (text string, binary, truncated, ok bool) {
	// HEAD:path — fails for untracked / not in HEAD
	cmd := exec.CommandContext(ctx, gitBin, "-C", root, "--no-optional-locks", "show", "HEAD:"+relSlash)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", false, false, false
	}
	data := stdout.Bytes()
	if len(data) > MaxDiffBytes {
		data = data[:MaxDiffBytes]
		truncated = true
	}
	if !utf8.Valid(data) {
		return "", true, truncated, true
	}
	return string(data), false, truncated, true
}

func statusForFile(ctx context.Context, gitBin, root, relSlash string) string {
	cmd := exec.CommandContext(ctx, gitBin, "-C", root, "--no-optional-locks",
		"status", "--porcelain=v1", "-z", "--", relSlash)
	var stdout bytes.Buffer
	cmd.Stdout = &stdout
	if err := cmd.Run(); err != nil {
		return ""
	}
	entries := parsePorcelainZ(stdout.Bytes())
	if len(entries) == 0 {
		return ""
	}
	// Prefer exact path match
	for _, e := range entries {
		if e.path == relSlash {
			return e.status
		}
	}
	return entries[0].status
}
