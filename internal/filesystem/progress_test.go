package filesystem

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

func TestTotalBytesSumsFiles(t *testing.T) {
	root := t.TempDir()
	a := filepath.Join(root, "a.txt")
	b := filepath.Join(root, "dir", "b.txt")
	if err := os.WriteFile(a, []byte("12345"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(filepath.Dir(b), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(b, []byte("abcdefghij"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := TotalBytes([]string{a, filepath.Join(root, "dir")})
	if err != nil {
		t.Fatal(err)
	}
	if got != 15 {
		t.Fatalf("TotalBytes = %d, want 15", got)
	}
}

func TestCopyCtxReportsByteProgress(t *testing.T) {
	root := t.TempDir()
	srcDir := filepath.Join(root, "src")
	dstDir := filepath.Join(root, "dst")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		t.Fatal(err)
	}
	payload := make([]byte, 64*1024)
	for i := range payload {
		payload[i] = byte(i)
	}
	src := filepath.Join(srcDir, "big.bin")
	if err := os.WriteFile(src, payload, 0o644); err != nil {
		t.Fatal(err)
	}

	var lastDone atomic.Int64
	var lastTotal atomic.Int64
	var calls atomic.Int64
	var lastDest atomic.Value
	err := CopyCtx(context.Background(), []string{src}, dstDir, func(ev ProgressEvent) {
		calls.Add(1)
		lastDone.Store(ev.Done)
		lastTotal.Store(ev.Total)
		if ev.DestPath != "" {
			lastDest.Store(ev.DestPath)
		}
	})
	if err != nil {
		t.Fatal(err)
	}
	if calls.Load() == 0 {
		t.Fatal("expected progress callbacks")
	}
	if lastTotal.Load() != int64(len(payload)) {
		t.Fatalf("total = %d, want %d", lastTotal.Load(), len(payload))
	}
	if lastDone.Load() != int64(len(payload)) {
		t.Fatalf("done = %d, want %d", lastDone.Load(), len(payload))
	}
	wantDest := filepath.Join(dstDir, "big.bin")
	if _, err := os.Stat(wantDest); err != nil {
		t.Fatal(err)
	}
	if got, _ := lastDest.Load().(string); got != wantDest {
		t.Fatalf("destPath = %q, want %q", got, wantDest)
	}
}

func TestCopyCtxCancelStopsEarly(t *testing.T) {
	root := t.TempDir()
	srcDir := filepath.Join(root, "src")
	dstDir := filepath.Join(root, "dst")
	if err := os.MkdirAll(srcDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		t.Fatal(err)
	}
	// Several large files so cancel can land mid-transfer.
	var sources []string
	chunk := make([]byte, 256*1024)
	for i := 0; i < 8; i++ {
		p := filepath.Join(srcDir, fmt.Sprintf("f%d.bin", i))
		if err := os.WriteFile(p, chunk, 0o644); err != nil {
			t.Fatal(err)
		}
		sources = append(sources, p)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	started := make(chan struct{})
	errCh := make(chan error, 1)
	go func() {
		errCh <- CopyCtx(ctx, sources, dstDir, func(ev ProgressEvent) {
			if ev.Done > 0 {
				select {
				case <-started:
				default:
					close(started)
				}
			}
		})
	}()
	select {
	case <-started:
		cancel()
	case <-time.After(5 * time.Second):
		t.Fatal("progress never started")
	}
	err := <-errCh
	if err == nil {
		t.Fatal("expected cancel error")
	}
	if ctx.Err() == nil && err != context.Canceled {
		// CopyCtx should surface context.Canceled (or wrap it).
		if !isCanceled(err) {
			t.Fatalf("expected canceled error, got %v", err)
		}
	}
	ents, rdErr := os.ReadDir(dstDir)
	if rdErr != nil {
		t.Fatal(rdErr)
	}
	if len(ents) != 0 {
		t.Fatalf("copy cancel should remove dest artifacts, leftover %d entries", len(ents))
	}
}

func TestCopyCtxCancelRemovesDestDir(t *testing.T) {
	root := t.TempDir()
	srcDir := filepath.Join(root, "src")
	dstDir := filepath.Join(root, "dst")
	if err := os.MkdirAll(filepath.Join(srcDir, "nested"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(dstDir, 0o755); err != nil {
		t.Fatal(err)
	}
	chunk := make([]byte, 512*1024)
	for i := 0; i < 6; i++ {
		p := filepath.Join(srcDir, "nested", fmt.Sprintf("f%d.bin", i))
		if err := os.WriteFile(p, chunk, 0o644); err != nil {
			t.Fatal(err)
		}
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	started := make(chan struct{})
	errCh := make(chan error, 1)
	go func() {
		errCh <- CopyCtx(ctx, []string{srcDir}, dstDir, func(ev ProgressEvent) {
			if ev.Done > 0 {
				select {
				case <-started:
				default:
					close(started)
				}
			}
		})
	}()
	select {
	case <-started:
		cancel()
	case <-time.After(5 * time.Second):
		t.Fatal("progress never started")
	}
	err := <-errCh
	if err == nil {
		t.Fatal("expected cancel error")
	}
	if !isCanceled(err) {
		t.Fatalf("expected canceled error, got %v", err)
	}
	if _, err := os.Stat(filepath.Join(dstDir, "src")); !os.IsNotExist(err) {
		t.Fatalf("dest dir should be removed after copy cancel, stat err=%v", err)
	}
}

func isCanceled(err error) bool {
	return errors.Is(err, context.Canceled)
}

func TestMoveCtxReportsProgressOnRename(t *testing.T) {
	root := t.TempDir()
	left := filepath.Join(root, "left")
	right := filepath.Join(root, "right")
	if err := os.MkdirAll(left, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(right, 0o755); err != nil {
		t.Fatal(err)
	}
	src := filepath.Join(left, "note.txt")
	if err := os.WriteFile(src, []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}

	var calls atomic.Int64
	var lastDone, lastTotal atomic.Int64
	if err := MoveCtx(context.Background(), []string{src}, right, func(ev ProgressEvent) {
		calls.Add(1)
		lastDone.Store(ev.Done)
		lastTotal.Store(ev.Total)
	}); err != nil {
		t.Fatal(err)
	}
	if calls.Load() == 0 {
		t.Fatal("expected progress callbacks for rename move")
	}
	if lastDone.Load() != lastTotal.Load() || lastTotal.Load() == 0 {
		t.Fatalf("done/total = %d/%d, want equal and > 0", lastDone.Load(), lastTotal.Load())
	}
	if _, err := os.Stat(filepath.Join(right, "note.txt")); err != nil {
		t.Fatal(err)
	}
}

func TestMoveCtxCancelKeepsDest(t *testing.T) {
	root := t.TempDir()
	left := filepath.Join(root, "left")
	right := filepath.Join(root, "right")
	if err := os.MkdirAll(left, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(right, 0o755); err != nil {
		t.Fatal(err)
	}
	var sources []string
	for i := 0; i < 20; i++ {
		p := filepath.Join(left, fmt.Sprintf("f%d.bin", i))
		if err := os.WriteFile(p, []byte("keep-me"), 0o644); err != nil {
			t.Fatal(err)
		}
		sources = append(sources, p)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	seenDest := make(chan string, 1)
	errCh := make(chan error, 1)
	go func() {
		errCh <- MoveCtx(ctx, sources, right, func(ev ProgressEvent) {
			if ev.DestPath == "" {
				return
			}
			select {
			case seenDest <- ev.DestPath:
			default:
			}
		})
	}()
	var dest string
	select {
	case dest = <-seenDest:
		cancel()
	case <-time.After(5 * time.Second):
		t.Fatal("move never reported dest")
	}
	err := <-errCh
	if err != nil && !isCanceled(err) {
		t.Fatalf("unexpected error: %v", err)
	}
	if dest == "" {
		t.Fatal("empty dest path")
	}
	if _, err := os.Stat(dest); err != nil {
		t.Fatalf("move cancel should keep dest %s: %v", dest, err)
	}
}
