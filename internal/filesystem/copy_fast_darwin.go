//go:build darwin

package filesystem

import (
	"context"
	"os"

	"golang.org/x/sys/unix"
)

// clonePathOS uses APFS clonefile (copy-on-write). dst must not exist.
func clonePathOS(src, dst string) error {
	return unix.Clonefile(src, dst, 0)
}

func cloneFDs(_, _ int) error {
	return errNoClone
}

func copyFileKernel(_ context.Context, _, _ *os.File, _, _ string, _ *progressReporter) error {
	return errNoClone
}
