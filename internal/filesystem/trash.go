package filesystem

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sync/atomic"
	"time"
)

// Trash relocates deleted items into a per-batch directory so a delete stays
// undoable for a while. Items that cannot be renamed into the trash — most
// commonly because they live on another volume (EXDEV) — are deleted for real
// and left out of the manifest, so Undo never claims more than it can restore.
type Trash struct {
	root string
	seq  atomic.Uint64
}

const trashManifest = "manifest.json"

var batchIDRe = regexp.MustCompile(`^[0-9]{8}-[0-9]{9}-[0-9]+$`)

// NewTrash returns a trash rooted at dir (created on first use).
func NewTrash(dir string) *Trash { return &Trash{root: dir} }

type trashItem struct {
	Origin string `json:"origin"`
	Stored string `json:"stored"`
}

func (t *Trash) batchDir(id string) string { return filepath.Join(t.root, id) }

func (t *Trash) newBatchID() string {
	now := time.Now().UTC()
	return fmt.Sprintf("%s-%09d-%d", now.Format("20060102"), now.Nanosecond(), t.seq.Add(1))
}

// MoveToTrash moves paths into a new batch. It returns the batch id to pass to
// Restore, or "" when nothing in the batch ended up restorable.
func (t *Trash) MoveToTrash(paths []string) (string, error) {
	if len(paths) == 0 {
		return "", nil
	}
	id := t.newBatchID()
	dir := t.batchDir(id)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		// No trash available at all — fall back to a plain delete.
		return "", Delete(paths)
	}

	items := make([]trashItem, 0, len(paths))
	for i, p := range paths {
		abs, err := Resolve(p)
		if err != nil {
			return "", err
		}
		if _, err := os.Lstat(abs); err != nil {
			if os.IsNotExist(err) {
				return "", fmt.Errorf("%w: %s", ErrNotFound, abs)
			}
			if os.IsPermission(err) {
				return "", fmt.Errorf("%w: cannot access %s", ErrPermission, abs)
			}
			return "", err
		}
		// Index-prefixed so same-named items in one batch cannot collide.
		stored := filepath.Join(dir, fmt.Sprintf("%d-%s", i, filepath.Base(abs)))
		if err := os.Rename(abs, stored); err != nil {
			// Different volume, or the OS refuses the rename: delete for real.
			if delErr := Delete([]string{abs}); delErr != nil {
				return "", delErr
			}
			continue
		}
		items = append(items, trashItem{Origin: abs, Stored: stored})
	}

	if len(items) == 0 {
		_ = os.RemoveAll(dir)
		return "", nil
	}
	raw, err := json.Marshal(items)
	if err != nil {
		return "", err
	}
	if err := os.WriteFile(filepath.Join(dir, trashManifest), raw, 0o600); err != nil {
		return "", err
	}
	return id, nil
}

// Restore moves a batch back to its original locations. Origins that exist
// again are left alone rather than overwritten.
func (t *Trash) Restore(id string) error {
	if !batchIDRe.MatchString(id) {
		return fmt.Errorf("invalid trash batch id")
	}
	dir := t.batchDir(id)
	raw, err := os.ReadFile(filepath.Join(dir, trashManifest))
	if err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("nothing left to restore")
		}
		return err
	}
	var items []trashItem
	if err := json.Unmarshal(raw, &items); err != nil {
		return err
	}

	var firstErr error
	restored := 0
	for _, it := range items {
		if _, err := os.Lstat(it.Origin); err == nil {
			continue // something already occupies the original path
		}
		if err := os.MkdirAll(filepath.Dir(it.Origin), 0o755); err != nil && firstErr == nil {
			firstErr = err
			continue
		}
		if err := os.Rename(it.Stored, it.Origin); err != nil {
			if firstErr == nil {
				firstErr = fmt.Errorf("cannot restore %s: %w", it.Origin, err)
			}
			continue
		}
		restored++
	}
	if restored == len(items) {
		_ = os.RemoveAll(dir)
	}
	if firstErr != nil {
		return firstErr
	}
	if restored == 0 {
		return fmt.Errorf("nothing restored: original paths are occupied")
	}
	return nil
}

// PurgeOlderThan removes batches whose directory is older than max age.
func (t *Trash) PurgeOlderThan(maxAge time.Duration) error {
	entries, err := os.ReadDir(t.root)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	cutoff := time.Now().Add(-maxAge)
	var firstErr error
	for _, e := range entries {
		if !e.IsDir() || !batchIDRe.MatchString(e.Name()) {
			continue
		}
		info, err := e.Info()
		if err != nil || info.ModTime().After(cutoff) {
			continue
		}
		if err := os.RemoveAll(filepath.Join(t.root, e.Name())); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}
