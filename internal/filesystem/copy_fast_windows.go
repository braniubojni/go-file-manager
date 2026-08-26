//go:build windows

package filesystem

import (
	"context"
	"os"
	"syscall"
)

func clonePathOS(src, dst string) error {
	// Kernel CopyFileW; fail if dest exists (we pick UniquePath first).
	return syscall.CopyFile(src, dst, true)
}

func cloneFDs(_, _ int) error {
	return errNoClone
}

func copyFileKernel(_ context.Context, _, _ *os.File, _, _ string, _ *progressReporter) error {
	return errNoClone
}
