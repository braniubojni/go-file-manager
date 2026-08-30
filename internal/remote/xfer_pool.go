package remote

import (
	"context"
	"sync"
)

type xferPool[T any] struct {
	ctx     context.Context
	cancel  context.CancelFunc
	jobs    chan T
	wg      sync.WaitGroup
	errOnce sync.Once
	err     error
}

func newXferPool[T any](parent context.Context, workers int, do func(context.Context, T) error) *xferPool[T] {
	if workers < 1 {
		workers = 1
	}
	if parent == nil {
		parent = context.Background()
	}
	ctx, cancel := context.WithCancel(parent)
	p := &xferPool[T]{
		ctx:    ctx,
		cancel: cancel,
		jobs:   make(chan T, workers*2),
	}
	for i := 0; i < workers; i++ {
		p.wg.Add(1)
		go func() {
			defer p.wg.Done()
			for j := range p.jobs {
				if err := do(p.ctx, j); err != nil {
					p.fail(err)
				}
			}
		}()
	}
	return p
}

func (p *xferPool[T]) fail(err error) {
	if err == nil {
		return
	}
	p.errOnce.Do(func() {
		p.err = err
		p.cancel()
	})
}

func (p *xferPool[T]) enqueue(j T) error {
	select {
	case <-p.ctx.Done():
		return p.ctx.Err()
	case p.jobs <- j:
		return nil
	}
}

func (p *xferPool[T]) finish() error {
	close(p.jobs)
	p.wg.Wait()
	if p.err != nil {
		return p.err
	}
	return p.ctx.Err()
}
