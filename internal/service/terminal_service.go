package service

import (
	"fmt"
	"io"
	"sync"

	"github.com/erikharutyunyan/go-file-manager/internal/remote"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// ptyHandle abstracts one interactive shell session, local (PTY) or remote (SSH).
type ptyHandle interface {
	io.Reader
	Write(data string) error
	Resize(cols, rows int) error
	Close() error
	// ExitCode reports the process exit code once Read has returned an error.
	// Best-effort for remote shells (see remoteShell.ExitCode).
	ExitCode() int
}

// TerminalService manages interactive shell sessions per pane (left/right),
// local via PTY or remote via SSH.
type TerminalService struct {
	app    *application.App
	remote *remote.Manager
	mu     sync.Mutex
	// paneId -> session
	sessions map[string]ptyHandle
}

func NewTerminalService(remoteMgr *remote.Manager) *TerminalService {
	return &TerminalService{
		remote:   remoteMgr,
		sessions: make(map[string]ptyHandle),
	}
}

// SetApp injects the application for event emission (call after application.New).
func (t *TerminalService) SetApp(app *application.App) {
	t.app = app
}

func (t *TerminalService) emit(name string, data any) {
	if t.app != nil {
		t.app.Event.Emit(name, data)
	}
}

// Start spawns a shell at cwd for the given pane: a local login shell, or an
// SSH shell when cwd is an ssh:// virtual path.
func (t *TerminalService) Start(paneID, cwd string) error {
	t.mu.Lock()
	_, running := t.sessions[paneID]
	t.mu.Unlock()
	if running {
		if cwd == "" {
			return nil
		}
		return t.SetCwd(paneID, cwd)
	}

	var (
		handle ptyHandle
		err    error
	)
	if remote.IsRemote(cwd) {
		if t.remote == nil {
			return fmt.Errorf("remote not available")
		}
		handle, err = spawnRemotePTY(t.remote, cwd, 80, 24)
	} else {
		handle, err = spawnLocalPTY(cwd)
	}
	if err != nil {
		return err
	}

	t.mu.Lock()
	t.sessions[paneID] = handle
	t.mu.Unlock()

	go t.readLoop(paneID, handle)
	return nil
}

func (t *TerminalService) readLoop(paneID string, handle ptyHandle) {
	buf := make([]byte, 4096)
	for {
		n, err := handle.Read(buf)
		if n > 0 {
			t.emit("terminal:data", map[string]any{
				"paneId": paneID,
				"data":   string(buf[:n]),
			})
		}
		if err != nil {
			t.emit("terminal:exit", map[string]any{
				"paneId": paneID,
				"code":   handle.ExitCode(),
			})
			t.mu.Lock()
			if cur := t.sessions[paneID]; cur == handle {
				delete(t.sessions, paneID)
			}
			t.mu.Unlock()
			_ = handle.Close()
			return
		}
	}
}

// Write sends data to the pane's shell stdin.
func (t *TerminalService) Write(paneID, data string) error {
	t.mu.Lock()
	h, ok := t.sessions[paneID]
	t.mu.Unlock()
	if !ok {
		return fmt.Errorf("terminal not running for pane %s", paneID)
	}
	return h.Write(data)
}

// Resize updates the pane's terminal size.
func (t *TerminalService) Resize(paneID string, cols, rows int) error {
	t.mu.Lock()
	h, ok := t.sessions[paneID]
	t.mu.Unlock()
	if !ok {
		return fmt.Errorf("terminal not running for pane %s", paneID)
	}
	return h.Resize(cols, rows)
}

// Stop kills the pane's shell session.
func (t *TerminalService) Stop(paneID string) error {
	t.mu.Lock()
	h, ok := t.sessions[paneID]
	if ok {
		delete(t.sessions, paneID)
	}
	t.mu.Unlock()
	if !ok {
		return nil
	}
	return h.Close()
}

// IsRunning reports whether a session exists for the pane.
func (t *TerminalService) IsRunning(paneID string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	_, ok := t.sessions[paneID]
	return ok
}

// SetCwd sends cd to the running shell when the pane path changes.
func (t *TerminalService) SetCwd(paneID, cwd string) error {
	t.mu.Lock()
	h, ok := t.sessions[paneID]
	t.mu.Unlock()
	if !ok {
		return nil
	}
	shellPath := cwd
	if remote.IsRemote(cwd) {
		loc, err := remote.ParseLocation(cwd)
		if err != nil {
			return err
		}
		shellPath = loc.RemotePath
	}
	return h.Write(fmt.Sprintf("cd %q\n", shellPath))
}
