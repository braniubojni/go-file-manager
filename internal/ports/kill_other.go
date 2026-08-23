//go:build !unix && !windows

package ports

import "fmt"

func Kill(pid int) error {
	if err := ValidatePID(pid); err != nil {
		return err
	}
	return fmt.Errorf("kill is not supported on this platform")
}
