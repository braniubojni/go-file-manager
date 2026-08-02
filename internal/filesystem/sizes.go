package filesystem

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// DirChildSizes returns recursive byte sizes for each immediate child directory of dir.
// Symlinks are not followed. Keys are absolute paths of the child dirs.
func DirChildSizes(dir string) (domain.DirSizes, error) {
	return DirChildSizesCtx(context.Background(), dir)
}

// DirChildSizesCtx is like DirChildSizes but respects ctx cancellation.
// A child that could not be fully read still gets its partial size, and is
// listed in Denied — silently undercounting is worse than saying so.
func DirChildSizesCtx(ctx context.Context, dir string) (domain.DirSizes, error) {
	empty := domain.DirSizes{Sizes: map[string]int64{}, Denied: []string{}}
	abs, err := Resolve(dir)
	if err != nil {
		return empty, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return empty, err
	}
	if !info.IsDir() {
		return empty, fmt.Errorf("not a directory: %s", abs)
	}

	entries, err := os.ReadDir(abs)
	if err != nil {
		return empty, err
	}

	out := domain.DirSizes{Sizes: map[string]int64{}, Denied: []string{}}
	for _, e := range entries {
		if err := ctx.Err(); err != nil {
			return empty, err
		}
		if !e.IsDir() || e.Type()&os.ModeSymlink != 0 {
			continue
		}
		child := filepath.Join(abs, e.Name())
		st, err := os.Lstat(child)
		if err != nil || !st.IsDir() || st.Mode()&os.ModeSymlink != 0 {
			continue
		}
		size, denied, err := dirSizeCtx(ctx, child)
		if err != nil {
			if ctx.Err() != nil {
				return empty, ctx.Err()
			}
			out.Denied = append(out.Denied, child)
			continue
		}
		out.Sizes[child] = size
		if denied {
			out.Denied = append(out.Denied, child)
		}
	}
	return out, nil
}

// dirSizeCtx sums a tree. Unreadable subtrees are skipped and reported via
// denied rather than aborting the walk.
func dirSizeCtx(ctx context.Context, root string) (total int64, denied bool, err error) {
	err = filepath.Walk(root, func(path string, info os.FileInfo, walkErr error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if walkErr != nil {
			denied = true
			if os.IsPermission(walkErr) {
				return filepath.SkipDir
			}
			return nil
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return nil
		}
		if !info.IsDir() {
			total += info.Size()
		}
		return nil
	})
	return total, denied, err
}
