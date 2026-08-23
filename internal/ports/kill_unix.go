//go:build unix

package ports

import "syscall"

// Kill sends SIGKILL to pid.
func Kill(pid int) error {
	if err := ValidatePID(pid); err != nil {
		return err
	}
	return syscall.Kill(pid, syscall.SIGKILL)
}
