//go:build windows

package filesystem

import (
	"path/filepath"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	ioctlStorageQueryProperty        = 0x002d1400
	storageDeviceSeekPenaltyProperty = 7
	propertyStandardQuery            = 0
)

func classifyMount(path string) (key string, class IOClass, done bool) {
	root := driveRoot(path)
	key = strings.ToUpper(root)
	p, err := windows.UTF16PtrFromString(root)
	if err != nil {
		return key, IOSSD, true
	}
	switch windows.GetDriveType(p) {
	case windows.DRIVE_REMOTE:
		return key, IONetwork, true
	case windows.DRIVE_CDROM:
		return key, IOHDD, true
	case windows.DRIVE_RAMDISK:
		return key, IOSSD, true
	default:
		return key, IOSSD, false
	}
}

func classifyMedia(path string) IOClass {
	if seekPenalty(path) {
		return IOHDD
	}
	return IOSSD
}

func driveRoot(path string) string {
	vol := filepath.VolumeName(path)
	if vol == "" {
		return path
	}
	if strings.HasSuffix(vol, `\`) {
		return vol
	}
	return vol + `\`
}

type storagePropertyQuery struct {
	PropertyId           uint32
	QueryType            uint32
	AdditionalParameters [1]byte
}

type deviceSeekPenaltyDescriptor struct {
	Version           uint32
	Size              uint32
	IncursSeekPenalty byte
	_                 [3]byte
}

func seekPenalty(path string) bool {
	root := strings.TrimSuffix(driveRoot(path), `\`)
	if len(root) < 2 {
		return false
	}
	dev := `\\.\` + root
	p, err := windows.UTF16PtrFromString(dev)
	if err != nil {
		return false
	}
	h, err := windows.CreateFile(p,
		windows.GENERIC_READ,
		windows.FILE_SHARE_READ|windows.FILE_SHARE_WRITE,
		nil,
		windows.OPEN_EXISTING,
		0,
		0)
	if err != nil {
		return false
	}
	defer func() { _ = windows.CloseHandle(h) }()

	var query storagePropertyQuery
	query.PropertyId = storageDeviceSeekPenaltyProperty
	query.QueryType = propertyStandardQuery
	var desc deviceSeekPenaltyDescriptor
	var ret uint32
	err = windows.DeviceIoControl(h, ioctlStorageQueryProperty,
		(*byte)(unsafe.Pointer(&query)), uint32(unsafe.Sizeof(query)),
		(*byte)(unsafe.Pointer(&desc)), uint32(unsafe.Sizeof(desc)),
		&ret, nil)
	if err != nil {
		return false
	}
	return desc.IncursSeekPenalty != 0
}
