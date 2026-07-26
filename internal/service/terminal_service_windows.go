//go:build windows

package service

import "fmt"

// spawnLocalPTY is not yet supported on Windows.
func spawnLocalPTY(cwd string) (ptyHandle, error) {
	return nil, fmt.Errorf("interactive terminal is not yet supported on Windows")
}
