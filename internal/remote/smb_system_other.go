//go:build !darwin

package remote

import (
	"fmt"
	"runtime"
)

// SystemMountSMB is only implemented on macOS (Finder / NetFS mount volume).
func SystemMountSMB(host string) ([]string, error) {
	return nil, fmt.Errorf("system SMB mount is not available on %s", runtime.GOOS)
}
