//go:build linux

package filesystem

import (
	"context"
	"os"

	"golang.org/x/sys/unix"
)

const copyRangeChunk = 8 << 20 // 8 MiB

func clonePathOS(src, dst string) error {
	return errNoClone
}

func cloneFDs(dstFd, srcFd int) error {
	if !allowClone {
		return errNoClone
	}
	return unix.IoctlFileClone(dstFd, srcFd)
}

func copyFileKernel(ctx context.Context, in, out *os.File, src, dst string, rep *progressReporter) error {
	rfd := int(in.Fd())
	wfd := int(out.Fd())
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		n, err := unix.CopyFileRange(rfd, nil, wfd, nil, copyRangeChunk, 0)
		if n > 0 {
			rep.addAt(int64(n), src, dst, false)
			if testAfterChunk != nil {
				testAfterChunk(ctx)
			}
		}
		if n == 0 && err == nil {
			return nil
		}
		if err != nil {
			return preferCanceled(ctx, err)
		}
	}
}
