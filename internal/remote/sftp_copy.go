package remote

import (
	"context"
	"fmt"
	"os/exec"
	"strings"

	"golang.org/x/crypto/ssh"
)

// remoteCP copies src to dst on the SSH host without pulling bytes through
// this machine (`cp -R -p`). Falls back to SFTP read/write if cp is missing.
func (s *Session) remoteCP(ctx context.Context, src, dst string) error {
	if s == nil {
		return fmt.Errorf("remote not available")
	}
	cmd := "cp -R -p " + unixShellQuote(src) + " " + unixShellQuote(dst)
	if s.client != nil {
		return remoteExecSSH(ctx, s.client, cmd)
	}
	return remoteExecOpenSSH(ctx, s, cmd)
}

func remoteExecSSH(ctx context.Context, client *ssh.Client, cmd string) error {
	sess, err := client.NewSession()
	if err != nil {
		return err
	}
	defer func() { _ = sess.Close() }()
	stop := context.AfterFunc(ctx, func() { _ = sess.Close() })
	defer stop()
	if err := sess.Run(cmd); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return err
	}
	return nil
}

func remoteExecOpenSSH(ctx context.Context, s *Session, remoteCmd string) error {
	sshPath, err := exec.LookPath("ssh")
	if err != nil {
		return err
	}
	target, args := openSSHBaseArgs(s.Spec, s.password)
	args = append(args, target, remoteCmd)
	cmd := exec.CommandContext(ctx, sshPath, args...)
	cmd.Env = openSSHEnv(s.password)
	out, err := cmd.CombinedOutput()
	if err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			return err
		}
		return fmt.Errorf("%w: %s", err, msg)
	}
	return nil
}

func unixShellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'"'"'`) + "'"
}
