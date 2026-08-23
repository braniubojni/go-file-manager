package ports

import (
	"fmt"
	"os"
)

// ValidatePID rejects pid 1 / non-positive PIDs and this process.
func ValidatePID(pid int) error {
	if pid <= 1 {
		return fmt.Errorf("refusing to kill pid %d", pid)
	}
	if pid == os.Getpid() {
		return fmt.Errorf("refusing to kill this process")
	}
	return nil
}

// KillAll force-kills each unique PID. Empty input is a no-op.
func KillAll(pids []int) error {
	seen := make(map[int]struct{}, len(pids))
	for _, pid := range pids {
		if _, ok := seen[pid]; ok {
			continue
		}
		seen[pid] = struct{}{}
		if err := Kill(pid); err != nil {
			return err
		}
	}
	return nil
}
