package filesystem

import (
	"context"
	"errors"
	"io"
	"os"
)

const copyUserBufSize = 1 << 20 // 1 MiB

// errNoClone means this platform/FS cannot clone; callers fall back to a byte copy.
var errNoClone = errors.New("clone not supported")

// allowClone is true in production. Tests set it false to exercise the byte-copy
// cancel path (APFS clonefile finishes too fast to cancel).
var allowClone = true

func copyFileCtx(ctx context.Context, src, dst string, mode os.FileMode, rep *progressReporter) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := clonePath(src, dst); err == nil {
		if err := ctx.Err(); err != nil {
			return err
		}
		return reportCopiedFile(src, dst, rep)
	}

	in, err := os.Open(src)
	if err != nil {
		return preferCanceled(ctx, err)
	}
	defer func() { _ = in.Close() }()

	out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, mode.Perm())
	if err != nil {
		return preferCanceled(ctx, err)
	}
	defer func() { _ = out.Close() }()

	if err := ctx.Err(); err != nil {
		return err
	}
	if err := cloneFDs(int(out.Fd()), int(in.Fd())); err == nil {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := out.Close(); err != nil {
			return err
		}
		return reportCopiedFile(src, dst, rep)
	}

	if _, err := in.Seek(0, io.SeekStart); err != nil {
		return preferCanceled(ctx, err)
	}

	// AfterFunc registered only around the syscall that can actually block
	// (copy_file_range et al.) — registering it earlier races Close() against
	// the .Fd() calls cloneFDs makes above.
	stop := context.AfterFunc(ctx, func() {
		_ = in.Close()
		_ = out.Close()
	})
	defer stop()

	if err := copyFileKernel(ctx, in, out, src, dst, rep); err == nil {
		if err := ctx.Err(); err != nil {
			return err
		}
		rep.flushDest(src, dst, false)
		return out.Close()
	}
	if _, err := in.Seek(0, io.SeekStart); err != nil {
		return preferCanceled(ctx, err)
	}
	if _, err := out.Seek(0, io.SeekStart); err != nil {
		return preferCanceled(ctx, err)
	}
	if err := out.Truncate(0); err != nil {
		return preferCanceled(ctx, err)
	}
	rep.resetDest(dst)
	if err := copyFileUser(ctx, in, out, src, dst, rep); err != nil {
		return preferCanceled(ctx, err)
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	rep.flushDest(src, dst, false)
	return out.Close()
}

func reportCopiedFile(src, dst string, rep *progressReporter) error {
	info, err := os.Lstat(src)
	if err != nil {
		info, err = os.Lstat(dst)
	}
	n := int64(1)
	if err == nil && info.Size() > 0 {
		n = info.Size()
	}
	rep.addAt(n, src, dst, false)
	return nil
}

func copyFileUser(ctx context.Context, in *os.File, out *os.File, src, dst string, rep *progressReporter) error {
	buf := make([]byte, copyUserBufSize)
	for {
		if err := ctx.Err(); err != nil {
			return err
		}
		nr, rerr := in.Read(buf)
		if nr > 0 {
			nw, werr := out.Write(buf[:nr])
			if nw > 0 {
				rep.addAt(int64(nw), src, dst, false)
			}
			if werr != nil {
				return preferCanceled(ctx, werr)
			}
			if nw != nr {
				return io.ErrShortWrite
			}
		}
		if rerr == io.EOF {
			return preferCanceled(ctx, nil)
		}
		if rerr != nil {
			return preferCanceled(ctx, rerr)
		}
	}
}

func clonePath(src, dst string) error {
	if !allowClone {
		return errNoClone
	}
	return clonePathOS(src, dst)
}
