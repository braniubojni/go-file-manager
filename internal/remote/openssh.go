package remote

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/sftp"
)

// dialOpenSSH starts system OpenSSH with the SFTP subsystem. Uses ~/.ssh/config, agent, and default
// identity files via the real ssh binary.
func dialOpenSSH(spec Spec, password string) (*Session, error) {
	sshPath, err := exec.LookPath("ssh")
	if err != nil {
		return nil, fmt.Errorf("openssh not found: %w", err)
	}

	target, extra := openSSHTarget(spec)
	args := make([]string, 0, 12+len(extra))
	args = append(args, extra...)
	args = append(args,
		"-o", "ConnectTimeout=20",
		"-o", "PreferredAuthentications=publickey,password,keyboard-interactive",
	)
	if password == "" {
		// Fail fast without TTY prompts (like BatchMode for VS Code scripts).
		args = append(args, "-o", "BatchMode=yes")
	}
	// Explicit -i only when we have paths and no config alias (alias already
	// applies IdentityFile from config; extra -i can fight IdentitiesOnly).
	if spec.ConfigAlias == "" {
		for _, id := range spec.IdentityFiles {
			id = strings.TrimSpace(id)
			if id != "" {
				args = append(args, "-i", id)
			}
		}
	}
	// -s requests a subsystem; the subsystem name is the remote command:
	//   ssh [opts] -s destination sftp
	// (NOT `ssh -s sftp destination` — that treats "sftp" as the hostname.)
	args = append(args, "-s", target, "sftp")

	cmd := exec.Command(sshPath, args...)
	cmd.Env = openSSHEnv(password)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return nil, err
	}
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, err
	}
	var stderr bytes.Buffer
	cmd.Stderr = &stderr

	if err := cmd.Start(); err != nil {
		return nil, fmt.Errorf("start ssh: %w", err)
	}

	type pipeResult struct {
		client *sftp.Client
		err    error
	}
	done := make(chan pipeResult, 1)
	go func() {
		c, e := sftp.NewClientPipe(stdout, stdin)
		done <- pipeResult{c, e}
	}()

	// Wait for SFTP handshake or early process death.
	timer := time.NewTimer(25 * time.Second)
	defer timer.Stop()

	// Reap process once (on early failure or after session lives).
	waitCh := make(chan error, 1)
	go func() { waitCh <- cmd.Wait() }()

	var client *sftp.Client
	select {
	case r := <-done:
		if r.err != nil {
			_ = cmd.Process.Kill()
			werr := <-waitCh
			_ = werr
			return nil, formatOpenSSHErr(r.err, stderr.String())
		}
		client = r.client
	case err := <-waitCh:
		// ssh exited before SFTP handshake completed
		return nil, formatOpenSSHErr(err, stderr.String())
	case <-timer.C:
		_ = cmd.Process.Kill()
		<-waitCh
		return nil, fmt.Errorf("openssh sftp timeout: %s", strings.TrimSpace(stderr.String()))
	}

	// Process still running; reap in background when it eventually exits.
	go func() { <-waitCh }()

	return &Session{
		Spec:   spec,
		sftp:   client,
		cmd:    cmd,
		stderr: &stderr,
	}, nil
}

func openSSHTarget(spec Spec) (target string, extraArgs []string) {
	if alias := strings.TrimSpace(spec.ConfigAlias); alias != "" {
		return alias, nil
	}
	// Prefer host string that still matches an ssh config alias (EnrichSpec sets ConfigAlias).
	if host := strings.TrimSpace(spec.Host); host != "" && !strings.Contains(host, ".") && !isIPLiteral(host) {
		// bare hostname might be alias; use as-is without user prefix so ssh config applies
		if _, ok := LookupSSHConfigHost(host); ok {
			return host, nil
		}
	}
	user := strings.TrimSpace(spec.User)
	host := strings.TrimSpace(spec.Host)
	if user != "" {
		target = user + "@" + host
	} else {
		target = host
	}
	if spec.Port > 0 && spec.Port != 22 {
		extraArgs = []string{"-p", strconv.Itoa(spec.Port)}
	}
	return target, extraArgs
}

func isIPLiteral(s string) bool {
	// crude: digits/dots or contains ':' (v6)
	if strings.Contains(s, ":") {
		return true
	}
	for _, c := range s {
		if c != '.' && (c < '0' || c > '9') {
			return false
		}
	}
	return s != ""
}

func openSSHEnv(password string) []string {
	env := os.Environ()
	// Never inherit a broken DISPLAY-only askpass without our script.
	if password == "" {
		return env
	}
	script, err := writeAskPassScript()
	if err != nil {
		return env
	}
	// Strip existing askpass vars then set ours.
	filtered := env[:0]
	for _, e := range env {
		if strings.HasPrefix(e, "SSH_ASKPASS=") ||
			strings.HasPrefix(e, "SSH_ASKPASS_REQUIRE=") ||
			strings.HasPrefix(e, "SSHPASS_GFM=") {
			continue
		}
		filtered = append(filtered, e)
	}
	filtered = append(filtered,
		"SSH_ASKPASS="+script,
		"SSH_ASKPASS_REQUIRE=force",
		"SSHPASS_GFM="+password,
		// Some OpenSSH builds only run askpass when DISPLAY/SSH_ASKPASS_REQUIRE is set.
		"DISPLAY="+firstNonEmpty(os.Getenv("DISPLAY"), "gfm:0"),
	)
	return filtered
}

func writeAskPassScript() (string, error) {
	dir, err := os.MkdirTemp("", "gfm-askpass-*")
	if err != nil {
		return "", err
	}
	path := filepath.Join(dir, "askpass.sh")
	// Prints password once; OpenSSH may call askpass for host key too — BatchMode
	// is off only when password auth is intentional.
	content := "#!/bin/sh\nprintf '%s\\n' \"$SSHPASS_GFM\"\n"
	if err := os.WriteFile(path, []byte(content), 0o700); err != nil {
		return "", err
	}
	return path, nil
}

func firstNonEmpty(vals ...string) string {
	for _, v := range vals {
		if v != "" {
			return v
		}
	}
	return ""
}

func formatOpenSSHErr(err error, stderr string) error {
	msg := strings.TrimSpace(stderr)
	if msg == "" && err != nil {
		msg = err.Error()
	}
	lower := strings.ToLower(msg + " " + errString(err))
	if strings.Contains(lower, "permission denied") ||
		strings.Contains(lower, "authentication failed") ||
		strings.Contains(lower, "unable to authenticate") ||
		strings.Contains(lower, "no more authentication methods") {
		return fmt.Errorf("authentication required: openssh public key/password auth failed: %s", msg)
	}
	if err != nil && msg != "" {
		return fmt.Errorf("openssh sftp: %s (%v)", msg, err)
	}
	if err != nil {
		return fmt.Errorf("openssh sftp: %w", err)
	}
	return fmt.Errorf("openssh sftp: %s", msg)
}

func errString(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func (s *Session) closeTransport() error {
	var first error
	if s.sftp != nil {
		if err := s.sftp.Close(); err != nil && first == nil {
			first = err
		}
	}
	if s.client != nil {
		if err := s.client.Close(); err != nil && first == nil {
			first = err
		}
	}
	if s.cmd != nil && s.cmd.Process != nil {
		// Wait is owned by dialOpenSSH's reaper goroutine — only signal kill.
		_ = s.cmd.Process.Kill()
	}
	return first
}
