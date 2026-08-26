//go:build !darwin

package volumes

import (
	"context"
	"fmt"
)

func attachDiskImage(ctx context.Context, path, password string, onProgress func(float64)) (string, error) {
	return "", fmt.Errorf("disk images are only supported on macOS")
}

func existingMountForImage(path string) string {
	return ""
}

func imageIsEncrypted(path string) bool {
	return false
}
