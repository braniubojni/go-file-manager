//go:build !windows

package service

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"syscall"

	"github.com/creack/pty"
	"github.com/wailsapp/wails/v3/pkg/application"
)

type termSession struct {
	cmd  *exec.Cmd
	ptmx *os.File
}

// TerminalService manages interactive PTY shells per pane (left/right).
type TerminalService struct {
	app *application.App
	mu  sync.Mutex
	// paneId -> session
	sessions map[string]*termSession
}

func NewTerminalService() *TerminalService {
	return &TerminalService{
		sessions: make(map[string]*termSession),
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

// Start spawns a login shell in a PTY at cwd for the given pane.
func (t *TerminalService) Start(paneID, cwd string) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	if s, ok := t.sessions[paneID]; ok && s.cmd.Process != nil {
		// Already running — optionally cd
		if cwd != "" {
			_, _ = s.ptmx.WriteString(fmt.Sprintf("cd %q\n", cwd))
		}
		return nil
	}

	shell := os.Getenv("SHELL")
	if shell == "" {
		if _, err := os.Stat("/bin/zsh"); err == nil {
			shell = "/bin/zsh"
		} else {
			shell = "/bin/bash"
		}
	}

	cmd := exec.Command(shell, "-l")
	if cwd != "" {
		cmd.Dir = cwd
	}
	cmd.Env = os.Environ()

	ptmx, err := pty.Start(cmd)
	if err != nil {
		return fmt.Errorf("start pty: %w", err)
	}

	s := &termSession{cmd: cmd, ptmx: ptmx}
	t.sessions[paneID] = s

	go t.readLoop(paneID, s)

	return nil
}

func (t *TerminalService) readLoop(paneID string, s *termSession) {
	buf := make([]byte, 4096)
	for {
		n, err := s.ptmx.Read(buf)
		if n > 0 {
			t.emit("terminal:data", map[string]any{
				"paneId": paneID,
				"data":   string(buf[:n]),
			})
		}
		if err != nil {
			if err != io.EOF {
				// still emit exit
			}
			code := 0
			if s.cmd.ProcessState != nil {
				code = s.cmd.ProcessState.ExitCode()
			}
			t.emit("terminal:exit", map[string]any{
				"paneId": paneID,
				"code":   code,
			})
			t.mu.Lock()
			if cur := t.sessions[paneID]; cur == s {
				delete(t.sessions, paneID)
			}
			t.mu.Unlock()
			_ = s.ptmx.Close()
			return
		}
	}
}

// Write sends data to the pane's PTY stdin.
func (t *TerminalService) Write(paneID, data string) error {
	t.mu.Lock()
	s, ok := t.sessions[paneID]
	t.mu.Unlock()
	if !ok || s.ptmx == nil {
		return fmt.Errorf("terminal not running for pane %s", paneID)
	}
	_, err := s.ptmx.WriteString(data)
	return err
}

// Resize updates the PTY size.
func (t *TerminalService) Resize(paneID string, cols, rows int) error {
	t.mu.Lock()
	s, ok := t.sessions[paneID]
	t.mu.Unlock()
	if !ok || s.ptmx == nil {
		return fmt.Errorf("terminal not running for pane %s", paneID)
	}
	if cols < 1 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}
	return pty.Setsize(s.ptmx, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}

// Stop kills the pane's shell session.
func (t *TerminalService) Stop(paneID string) error {
	t.mu.Lock()
	s, ok := t.sessions[paneID]
	if ok {
		delete(t.sessions, paneID)
	}
	t.mu.Unlock()
	if !ok {
		return nil
	}
	_ = s.ptmx.Close()
	if s.cmd.Process != nil {
		_ = s.cmd.Process.Signal(syscall.SIGHUP)
		_ = s.cmd.Process.Kill()
	}
	return nil
}

// IsRunning reports whether a session exists for the pane.
func (t *TerminalService) IsRunning(paneID string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	s, ok := t.sessions[paneID]
	return ok && s.cmd.Process != nil
}

// SetCwd sends cd to the running shell when the pane path changes.
func (t *TerminalService) SetCwd(paneID, cwd string) error {
	t.mu.Lock()
	s, ok := t.sessions[paneID]
	t.mu.Unlock()
	if !ok || s.ptmx == nil {
		return nil
	}
	_, err := s.ptmx.WriteString(fmt.Sprintf("cd %q\n", cwd))
	return err
}
