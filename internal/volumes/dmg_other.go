//go:build !darwin

package volumes

func attachDiskImage(path string) (string, error) {
	return "", errUnsupportedImage()
}

func existingMountForImage(path string) string {
	return ""
}
