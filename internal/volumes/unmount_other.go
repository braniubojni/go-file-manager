//go:build !darwin && !linux && !windows

package volumes

import "fmt"

func unmountOS(path string) error {
	return fmt.Errorf("unmount is not supported on this OS")
}
