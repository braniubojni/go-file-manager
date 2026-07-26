//go:build !windows

package service

import (
	"fmt"
	"os"
	"os/exec"
	"syscall"

	"github.com/creack/pty"
)

// localPTY is a local login shell running under a PTY.
type localPTY struct {
	cmd  *exec.Cmd
	ptmx *os.File
}

// spawnLocalPTY starts a login shell in a PTY at cwd (cwd may be empty).
func spawnLocalPTY(cwd string) (ptyHandle, error) {
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
		return nil, fmt.Errorf("start pty: %w", err)
	}
	return &localPTY{cmd: cmd, ptmx: ptmx}, nil
}

func (l *localPTY) Read(p []byte) (int, error) {
	return l.ptmx.Read(p)
}

func (l *localPTY) Write(data string) error {
	_, err := l.ptmx.WriteString(data)
	return err
}

func (l *localPTY) Resize(cols, rows int) error {
	if cols < 1 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}
	return pty.Setsize(l.ptmx, &pty.Winsize{Rows: uint16(rows), Cols: uint16(cols)})
}

func (l *localPTY) Close() error {
	err := l.ptmx.Close()
	if l.cmd.Process != nil {
		_ = l.cmd.Process.Signal(syscall.SIGHUP)
		_ = l.cmd.Process.Kill()
	}
	return err
}

func (l *localPTY) ExitCode() int {
	if l.cmd.ProcessState != nil {
		return l.cmd.ProcessState.ExitCode()
	}
	return 0
}
