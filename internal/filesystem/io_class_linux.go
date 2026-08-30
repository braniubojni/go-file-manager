//go:build linux

package filesystem

import (
	"fmt"
	"os"

	"golang.org/x/sys/unix"
)

const (
	nfsSuperMagic = 0x6969
	smbSuperMagic = 0x517B
	cifsMagic     = 0xFF534D42
	smb2Magic     = 0xFE534D42
)

func classifyMount(path string) (key string, class IOClass, done bool) {
	if fs, mp, ok := mountFS(path); ok {
		key = mp
		if isNetworkFS(fs) {
			return key, IONetwork, true
		}
	}
	var st unix.Statfs_t
	if err := unix.Statfs(path, &st); err == nil {
		if key == "" {
			key = fmt.Sprintf("fsid:%d:%d", st.Fsid.Val[0], st.Fsid.Val[1])
		}
		switch uint32(st.Type) {
		case nfsSuperMagic, smbSuperMagic, cifsMagic, smb2Magic:
			return key, IONetwork, true
		}
	}
	return key, IOSSD, false
}

func classifyMedia(path string) IOClass {
	var st unix.Stat_t
	if err := unix.Stat(path, &st); err != nil {
		return IOSSD
	}
	maj := unix.Major(uint64(st.Dev))
	min := unix.Minor(uint64(st.Dev))
	if rot, ok := rotationalAt("/sys", maj, min); ok && rot {
		return IOHDD
	}
	return IOSSD
}

func mountFS(path string) (fstype, mountpoint string, ok bool) {
	data, err := os.ReadFile("/proc/mounts")
	if err != nil {
		return "", "", false
	}
	return parseProcMounts(string(data), path)
}
