//go:build windows

package ports

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"
)

// Kill force-terminates pid via taskkill.
func Kill(pid int) error {
	if err := ValidatePID(pid); err != nil {
		return err
	}
	cmd := exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/F")
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			return fmt.Errorf("taskkill pid %d: %w", pid, err)
		}
		return fmt.Errorf("taskkill pid %d: %s", pid, msg)
	}
	return nil
}
