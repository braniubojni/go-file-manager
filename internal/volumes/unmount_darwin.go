//go:build darwin

package volumes

import (
	"fmt"
	"os/exec"
	"strings"
)

func unmountOS(path string) error {
	vols, err := listOS()
	if err == nil {
		for _, v := range vols {
			if v.Path != path {
				continue
			}
			if !v.Unmountable {
				return fmt.Errorf("cannot unmount the startup volume")
			}
			if v.Kind == "disk-image" {
				target := v.Device
				if target == "" {
					target = path
				}
				if err := runChecked("hdiutil", "detach", target); err == nil {
					return nil
				}
			}
			break
		}
	}
	return runChecked("diskutil", "unmount", path)
}

func runChecked(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		return fmt.Errorf("%s: %s", name, msg)
	}
	return nil
}
