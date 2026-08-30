//go:build darwin

package filesystem

import (
	"os/exec"
	"strings"

	"golang.org/x/sys/unix"
)

func classifyMount(path string) (key string, class IOClass, done bool) {
	var st unix.Statfs_t
	if err := unix.Statfs(path, &st); err != nil {
		return "", IOSSD, true
	}
	from := cString(st.Mntfromname[:])
	fs := strings.ToLower(cString(st.Fstypename[:]))
	key = from
	if key == "" {
		key = cString(st.Mntonname[:])
	}
	if isNetworkFS(fs) {
		return key, IONetwork, true
	}
	return key, IOSSD, false
}

func classifyMedia(path string) IOClass {
	out, err := exec.Command("diskutil", "info", "-plist", path).Output()
	if err != nil {
		return IOSSD
	}
	return parseDiskutilClass(string(out))
}
