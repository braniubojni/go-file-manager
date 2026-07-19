//go:build !windows

package config

import (
	"os/exec"
)

func runDetached(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	return cmd.Start()
}
