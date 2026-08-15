package remote

import (
	"fmt"
	"io"
	"os/exec"
	"strconv"
	"sync"

	"golang.org/x/crypto/ssh"
)

// ShellSession is one interactive PTY shell (native SSH session or system ssh -tt).
type ShellSession struct {
	session   *ssh.Session // native path
	cmd       *exec.Cmd    // OpenSSH path
	stdin     io.WriteCloser
	closeOnce sync.Once
	closeErr  error
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

	if cols < 1 {
		cols = 80
	}
	if rows < 1 {
		rows = 24
	}

	// System OpenSSH SFTP sessions have no *ssh.Client — spawn interactive ssh
	// with the same auth (password/askpass, identities, -F) as the SFTP session.
	if s.client == nil {
		return openShellOpenSSH(s.Spec, s.password, loc.RemotePath, cols, rows)
	}

	sess, err := s.client.NewSession()
	if err != nil {
		return nil, nil, fmt.Errorf("ssh session: %w", err)
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

func openShellOpenSSH(spec Spec, password, remotePath string, cols, rows int) (*ShellSession, io.Reader, error) {
	sshPath, err := exec.LookPath("ssh")
	if err != nil {
		return nil, nil, fmt.Errorf("openssh not found for remote shell: %w", err)
	}
	target, args := openSSHBaseArgs(spec, password)
	args = append(args, "-tt", target)
	cmd := exec.Command(sshPath, args...)
	cmd.Env = openSSHEnv(password)
	// Best-effort initial size via env (not all ssh builds honor this).
	cmd.Env = append(cmd.Env, "COLUMNS="+strconv.Itoa(cols), "LINES="+strconv.Itoa(rows))

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, nil, err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return nil, nil, err
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, nil, err
	}
	if err := cmd.Start(); err != nil {
		return nil, nil, fmt.Errorf("start ssh shell: %w", err)
	}
	// Wait is owned by this reaper — Close only signals kill (same as SFTP).
	go func() { _ = cmd.Wait() }()
	if remotePath != "" && remotePath != "/" {
		// Windows OpenSSH may ignore unix cd; best-effort.
		_, _ = fmt.Fprintf(stdin, "cd %q\n", remotePath)
	}

	pr, pw := io.Pipe()
	var wg sync.WaitGroup
	wg.Add(2)
	go func() { defer wg.Done(); _, _ = io.Copy(pw, stdout) }()
	go func() { defer wg.Done(); _, _ = io.Copy(pw, stderr) }()
	go func() {
		wg.Wait()
		_ = pw.Close()
	}()

	return &ShellSession{cmd: cmd, stdin: stdin}, pr, nil
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
	if sh.session != nil {
		return sh.session.WindowChange(rows, cols)
	}
	// External ssh: no reliable window-change without control socket; no-op.
	return nil
}

// Close ends the shell session. Safe to call more than once (Start/Stop race).
func (sh *ShellSession) Close() error {
	sh.closeOnce.Do(func() {
		if sh.session != nil {
			sh.closeErr = sh.session.Close()
			return
		}
		if sh.stdin != nil {
			_ = sh.stdin.Close()
		}
		if sh.cmd != nil && sh.cmd.Process != nil {
			// Wait is owned by openShellOpenSSH's reaper goroutine.
			_ = sh.cmd.Process.Kill()
		}
	})
	return sh.closeErr
}
