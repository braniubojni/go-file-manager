//go:build windows

package service

import "fmt"

// spawnLocalPTY is not yet supported on Windows.
func spawnLocalPTY(cwd string, cols, rows int) (ptyHandle, error) {
	return nil, fmt.Errorf("interactive terminal is not yet supported on Windows")
}
