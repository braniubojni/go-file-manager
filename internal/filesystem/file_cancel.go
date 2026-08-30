package filesystem

import (
	"context"
	"sync"
)

// FileCancelRegistry lets a caller cancel one top-level source within a batch
// CopyCtx/MoveCtx job without cancelling the whole job. Keyed by the source's
// resolved absolute path.
type FileCancelRegistry struct {
	mu      sync.Mutex
	cancels map[string]context.CancelFunc
}

// NewFileCancelRegistry returns an empty registry to attach to a job's context.
func NewFileCancelRegistry() *FileCancelRegistry {
	return &FileCancelRegistry{cancels: make(map[string]context.CancelFunc)}
}

func (r *FileCancelRegistry) register(path string, cancel context.CancelFunc) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.cancels[path] = cancel
}

func (r *FileCancelRegistry) remove(path string) {
	if r == nil {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.cancels, path)
}

// Cancel stops the in-flight source at path, if still running. Reports
// whether a matching in-flight source was found.
func (r *FileCancelRegistry) Cancel(path string) bool {
	if r == nil {
		return false
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	cancel, ok := r.cancels[path]
	if !ok {
		return false
	}
	cancel()
	delete(r.cancels, path)
	return true
}

type fileCancelRegistryKey struct{}

// WithFileCancelRegistry attaches reg to ctx so CopyCtx/MoveCtx register each
// top-level source as it starts, enabling per-file cancel via reg.Cancel.
func WithFileCancelRegistry(ctx context.Context, reg *FileCancelRegistry) context.Context {
	return context.WithValue(ctx, fileCancelRegistryKey{}, reg)
}

func fileCancelRegistryFrom(ctx context.Context) *FileCancelRegistry {
	reg, _ := ctx.Value(fileCancelRegistryKey{}).(*FileCancelRegistry)
	return reg
}
