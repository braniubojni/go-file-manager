package filesystem

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// BenchmarkCopyFileUser measures the last-resort byte-copy loop in isolation,
// with clonePath forced off so the kernel fast paths can't short-circuit it.
// Same t.TempDir() volume on both sides — this is a CPU/memory-bandwidth
// number, not a real cross-device disk number (see BenchmarkCopyCtxCrossDevice).
func BenchmarkCopyFileUser(b *testing.B) {
	prev := allowClone
	allowClone = false
	defer func() { allowClone = prev }()

	dir := b.TempDir()
	src := filepath.Join(dir, "src.bin")
	payload := make([]byte, 256<<20) // 256 MiB
	if err := os.WriteFile(src, payload, 0o644); err != nil {
		b.Fatal(err)
	}
	rep := newProgressReporter(int64(len(payload)), nil)

	b.SetBytes(int64(len(payload)))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		dst := filepath.Join(dir, "dst.bin")
		in, err := os.Open(src)
		if err != nil {
			b.Fatal(err)
		}
		out, err := os.OpenFile(dst, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o644)
		if err != nil {
			b.Fatal(err)
		}
		if err := copyFileUser(context.Background(), in, out, src, dst, rep); err != nil {
			b.Fatal(err)
		}
		_ = in.Close()
		_ = out.Close()
	}
}

// BenchmarkCopyCtxCrossDevice copies a real file into GFM_BENCH_DEST — set it
// to a directory on the actual cross-volume destination (e.g. a mounted DMG
// as source, an external drive as GFM_BENCH_DEST) to get a number that
// reflects the reported slow case. Skipped when unset: a temp-dir-only
// benchmark would land on the same APFS volume and measure clonefile, not
// this code path.
func BenchmarkCopyCtxCrossDevice(b *testing.B) {
	dest := os.Getenv("GFM_BENCH_DEST")
	if dest == "" {
		b.Skip("set GFM_BENCH_DEST to a directory on the target volume to run this benchmark")
	}

	srcDir := b.TempDir()
	src := filepath.Join(srcDir, "src.bin")
	payload := make([]byte, 512<<20) // 512 MiB
	if err := os.WriteFile(src, payload, 0o644); err != nil {
		b.Fatal(err)
	}

	b.SetBytes(int64(len(payload)))
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		if err := CopyCtx(context.Background(), []string{src}, dest, nil); err != nil {
			b.Fatal(err)
		}
		b.StopTimer()
		// Only remove copies of src.bin this benchmark created (UniquePath
		// appends " (n)") — never touch pre-existing files in dest.
		entries, err := os.ReadDir(dest)
		if err != nil {
			b.Fatal(err)
		}
		for _, e := range entries {
			if name := e.Name(); strings.HasPrefix(name, "src") && strings.HasSuffix(name, ".bin") {
				_ = Delete([]string{filepath.Join(dest, name)})
			}
		}
		b.StartTimer()
	}
}
