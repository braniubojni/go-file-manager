//go:build !windows

package service

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"syscall"

	"github.com/creack/pty"
)

// localPTY is a local login shell running under a PTY.
type localPTY struct {
	cmd       *exec.Cmd
	ptmx      *os.File
	closeOnce sync.Once
	closeErr  error
}

// spawnLocalPTY starts a login shell in a PTY at cwd (cwd may be empty).
// cols/rows should match the frontend xterm size; zeros fall back to 80×24.
func spawnLocalPTY(cwd string, cols, rows int) (ptyHandle, error) {
	shell := os.Getenv("SHELL")
	if shell == "" {
		if _, err := os.Stat("/bin/zsh"); err == nil {
			shell = "/bin/zsh"
		} else {
			shell = "/bin/bash"
		}
	}

	if cols < 2 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}

	cmd := exec.Command(shell, "-l")
	if cwd != "" {
		cmd.Dir = cwd
	}
	// Strip COLUMNS/LINES so zsh/p10k use the PTY ioctl size, not a stale host value.
	// Force a modern terminal type for color / cursor protocols.
	cmd.Env = cleanShellEnv(os.Environ())

	ws := &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)}
	ptmx, err := pty.StartWithSize(cmd, ws)
	if err != nil {
		return nil, fmt.Errorf("start pty: %w", err)
	}
	return &localPTY{cmd: cmd, ptmx: ptmx}, nil
}

func cleanShellEnv(env []string) []string {
	out := make([]string, 0, len(env)+2)
	hasTerm := false
	for _, e := range env {
		switch {
		case strings.HasPrefix(e, "COLUMNS="), strings.HasPrefix(e, "LINES="):
			continue
		case strings.HasPrefix(e, "TERM="):
			hasTerm = true
			out = append(out, "TERM=xterm-256color")
		default:
			out = append(out, e)
		}
	}
	if !hasTerm {
		out = append(out, "TERM=xterm-256color")
	}
	// Helps truecolor themes; harmless if unused.
	out = append(out, "COLORTERM=truecolor")
	return out
}

func (l *localPTY) Read(p []byte) (int, error) {
	return l.ptmx.Read(p)
}

func (l *localPTY) Write(data string) error {
	_, err := l.ptmx.WriteString(data)
	return err
}

func (l *localPTY) Resize(cols, rows int) error {
	if cols < 2 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}
	return pty.Setsize(l.ptmx, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
}

func (l *localPTY) Close() error {
	l.closeOnce.Do(func() {
		l.closeErr = l.ptmx.Close()
		if l.cmd.Process != nil {
			_ = l.cmd.Process.Signal(syscall.SIGHUP)
			_ = l.cmd.Process.Kill()
		}
	})
	return l.closeErr
}

func (l *localPTY) ExitCode() int {
	if l.cmd.ProcessState != nil {
		return l.cmd.ProcessState.ExitCode()
	}
	return 0
}
