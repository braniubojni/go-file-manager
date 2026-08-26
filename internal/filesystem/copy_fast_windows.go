//go:build windows

package filesystem

import (
	"context"
	"os"
)

// No COW clone on Windows (NTFS has none; CopyFileW is a real byte copy, not
// a clone, and blocks uncancelably with no progress — worse than the regular
// byte-copy fallback below, which is cancelable and progress-reported).
func clonePathOS(_, _ string) error {
	return errNoClone
}

func cloneFDs(_, _ int) error {
	return errNoClone
}

func copyFileKernel(_ context.Context, _, _ *os.File, _, _ string, _ *progressReporter) error {
	return errNoClone
}
