//go:build !darwin && !linux && !windows

package filesystem

import (
	"context"
	"os"
)

func clonePathOS(_, _ string) error {
	return errNoClone
}

func cloneFDs(_, _ int) error {
	return errNoClone
}

func copyFileKernel(_ context.Context, _, _ *os.File, _, _ string, _ *progressReporter) error {
	return errNoClone
}
