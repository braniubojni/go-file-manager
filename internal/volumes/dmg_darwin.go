//go:build darwin

package volumes

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

func attachDiskImage(path string) (string, error) {
	if mp := existingMountForImage(path); mp != "" {
		return mp, nil
	}
	cmd := exec.Command("hdiutil", "attach", "-nobrowse", "-plist", path)
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("attach disk image: %s", msg)
	}
	mp := firstMountPoint(string(out))
	if mp == "" {
		return "", fmt.Errorf("attach disk image: no mount point in hdiutil output")
	}
	return mp, nil
}

func existingMountForImage(dmg string) string {
	info := parseHdiutilInfo(runCmd("hdiutil", "info", "-plist"))
	for mp, src := range info {
		if src == dmg {
			if _, err := os.Stat(mp); err == nil {
				return mp
			}
		}
	}
	return ""
}
