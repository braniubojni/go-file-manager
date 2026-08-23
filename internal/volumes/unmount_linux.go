//go:build linux

package volumes

import (
	"fmt"
	"os/exec"
	"strings"
)

func unmountOS(path string) error {
	cmd := exec.Command("umount", path)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		return fmt.Errorf("umount: %s", msg)
	}
	return nil
}
