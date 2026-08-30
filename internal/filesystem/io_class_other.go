//go:build !darwin && !linux && !windows

package filesystem

func classifyMount(path string) (key string, class IOClass, done bool) {
	return "", IOSSD, true
}

func classifyMedia(path string) IOClass {
	return IOSSD
}
