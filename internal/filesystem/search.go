package filesystem

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

const (
	defaultSearchLimit = 80
	maxSearchVisits    = 5000
	maxSearchDepth     = 12
)

var errSearchStop = errors.New("search stop")

// SearchTree finds files/folders under root whose names contain query (case-insensitive).
func SearchTree(root, query string, showHidden bool, limit int) ([]domain.SearchHit, error) {
	abs, err := Resolve(root)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("not a directory: %s", abs)
	}
	if limit <= 0 {
		limit = defaultSearchLimit
	}
	q := strings.ToLower(strings.TrimSpace(query))

	type hit struct {
		domain.SearchHit
		starts bool
		isDot  bool
	}
	var hits []hit
	visits := 0

	err = filepath.WalkDir(abs, func(path string, d fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			if d != nil && d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		if path == abs {
			return nil
		}
		visits++
		if visits > maxSearchVisits || len(hits) >= limit*3 {
			return errSearchStop
		}
		rel, relErr := filepath.Rel(abs, path)
		if relErr != nil {
			return nil
		}
		depth := strings.Count(rel, string(os.PathSeparator))
		if depth > maxSearchDepth {
			if d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		name := d.Name()
		if !showHidden && strings.HasPrefix(name, ".") {
			if d.IsDir() {
				return fs.SkipDir
			}
			return nil
		}
		// Empty query: only immediate children (depth 0).
		if q == "" {
			if depth > 0 {
				if d.IsDir() {
					return fs.SkipDir
				}
				return nil
			}
		} else if !strings.Contains(strings.ToLower(name), q) {
			return nil
		}
		hits = append(hits, hit{
			SearchHit: domain.SearchHit{
				Name:    name,
				Path:    path,
				IsDir:   d.IsDir(),
				RelPath: filepath.ToSlash(rel),
			},
			starts: q != "" && strings.HasPrefix(strings.ToLower(name), q),
			isDot:  strings.HasPrefix(name, "."),
		})
		return nil
	})
	if err != nil && !errors.Is(err, errSearchStop) {
		return nil, err
	}

	sort.SliceStable(hits, func(i, j int) bool {
		a, b := hits[i], hits[j]
		if a.isDot != b.isDot {
			return !a.isDot
		}
		if a.starts != b.starts {
			return a.starts
		}
		if a.IsDir != b.IsDir {
			return a.IsDir
		}
		return strings.ToLower(a.Name) < strings.ToLower(b.Name)
	})

	if len(hits) > limit {
		hits = hits[:limit]
	}
	out := make([]domain.SearchHit, len(hits))
	for i := range hits {
		out[i] = hits[i].SearchHit
	}
	return out, nil
}
