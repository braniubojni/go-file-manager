package remote

import (
	"context"
	"sync/atomic"
	"testing"
	"time"
)

func TestXferPoolRunsJobs(t *testing.T) {
	t.Parallel()
	var running atomic.Int32
	var max atomic.Int32
	var done atomic.Int32
	pool := newXferPool(context.Background(), 4, func(ctx context.Context, n int) error {
		cur := running.Add(1)
		for {
			old := max.Load()
			if cur <= old || max.CompareAndSwap(old, cur) {
				break
			}
		}
		time.Sleep(20 * time.Millisecond)
		running.Add(-1)
		done.Add(1)
		return nil
	})
	for i := 0; i < 8; i++ {
		if err := pool.enqueue(i); err != nil {
			t.Fatal(err)
		}
	}
	if err := pool.finish(); err != nil {
		t.Fatal(err)
	}
	if done.Load() != 8 {
		t.Fatalf("done=%d", done.Load())
	}
	if max.Load() < 2 {
		t.Fatalf("expected parallel workers, max concurrent %d", max.Load())
	}
}

func TestXferPoolCancel(t *testing.T) {
	t.Parallel()
	ctx, cancel := context.WithCancel(context.Background())
	started := make(chan struct{})
	pool := newXferPool(ctx, 1, func(ctx context.Context, n int) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	})
	if err := pool.enqueue(1); err != nil {
		t.Fatal(err)
	}
	<-started
	cancel()
	err := pool.finish()
	if err == nil {
		t.Fatal("expected cancel error")
	}
}
