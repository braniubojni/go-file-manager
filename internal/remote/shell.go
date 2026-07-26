package remote

import (
	"fmt"
	"io"
	"sync"

	"golang.org/x/crypto/ssh"
)

// ShellSession is one interactive PTY shell over an existing SSH connection.
type ShellSession struct {
	session *ssh.Session
	stdin   io.WriteCloser
}

// OpenShell starts an interactive shell on the session's host, with a PTY sized
// cols x rows, cd'd into the virtual path's remote directory. Returns the session
// and a reader for combined stdout+stderr.
func (m *Manager) OpenShell(vpath string, cols, rows int) (*ShellSession, io.Reader, error) {
	loc, err := ParseLocation(vpath)
	if err != nil {
		return nil, nil, err
	}
	s, err := m.get(loc)
	if err != nil {
		return nil, nil, err
	}

	sess, err := s.client.NewSession()
	if err != nil {
		return nil, nil, fmt.Errorf("ssh session: %w", err)
	}

	if cols < 1 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}
	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 14400,
		ssh.TTY_OP_OSPEED: 14400,
	}
	if err := sess.RequestPty("xterm-256color", rows, cols, modes); err != nil {
		_ = sess.Close()
		return nil, nil, fmt.Errorf("request pty: %w", err)
	}

	stdout, err := sess.StdoutPipe()
	if err != nil {
		_ = sess.Close()
		return nil, nil, err
	}
	stderr, err := sess.StderrPipe()
	if err != nil {
		_ = sess.Close()
		return nil, nil, err
	}
	stdin, err := sess.StdinPipe()
	if err != nil {
		_ = sess.Close()
		return nil, nil, err
	}

	if err := sess.Shell(); err != nil {
		_ = sess.Close()
		return nil, nil, fmt.Errorf("start shell: %w", err)
	}

	rp := loc.RemotePath
	if rp == "" {
		rp = "/"
	}
	_, _ = fmt.Fprintf(stdin, "cd %q\n", rp)

	pr, pw := io.Pipe()
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); _, _ = io.Copy(pw, stdout) }()
	go func() { defer wg.Done(); _, _ = io.Copy(pw, stderr) }()
	go func() { wg.Wait(); _ = pw.Close() }()

	return &ShellSession{session: sess, stdin: stdin}, pr, nil
}

// Write sends data to the shell's stdin.
func (sh *ShellSession) Write(data string) error {
	_, err := sh.stdin.Write([]byte(data))
	return err
}

// Resize updates the PTY window size.
func (sh *ShellSession) Resize(cols, rows int) error {
	if cols < 1 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}
	return sh.session.WindowChange(rows, cols)
}

// Close ends the shell session.
func (sh *ShellSession) Close() error {
	return sh.session.Close()
}
