package filesystem

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
)

// DirChildSizes returns recursive byte sizes for each immediate child directory of dir.
// Symlinks are not followed. Keys are absolute paths of the child dirs.
func DirChildSizes(dir string) (map[string]int64, error) {
	return DirChildSizesCtx(context.Background(), dir)
}

// DirChildSizesCtx is like DirChildSizes but respects ctx cancellation.
func DirChildSizesCtx(ctx context.Context, dir string) (map[string]int64, error) {
	abs, err := Resolve(dir)
	if err != nil {
		return nil, err
	}
	info, err := os.Stat(abs)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, fmt.Errorf("not a directory: %s", abs)
	}

	entries, err := os.ReadDir(abs)
	if err != nil {
		return nil, err
	}

	out := make(map[string]int64)
	for _, e := range entries {
		if err := ctx.Err(); err != nil {
			return nil, err
		}
		if !e.IsDir() {
			if e.Type()&os.ModeSymlink != 0 {
				continue
			}
			continue
		}
		if e.Type()&os.ModeSymlink != 0 {
			continue
		}
		child := filepath.Join(abs, e.Name())
		st, err := os.Lstat(child)
		if err != nil || !st.IsDir() || st.Mode()&os.ModeSymlink != 0 {
			continue
		}
		size, err := dirSizeCtx(ctx, child)
		if err != nil {
			if ctx.Err() != nil {
				return nil, ctx.Err()
			}
			continue
		}
		out[child] = size
	}
	return out, nil
}

func dirSizeCtx(ctx context.Context, root string) (int64, error) {
	var total int64
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err != nil {
			if os.IsPermission(err) {
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
	return total, err
}
