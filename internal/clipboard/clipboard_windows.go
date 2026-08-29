//go:build windows

package clipboard

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

const cfHDROP = 15

var (
	shell32              = windows.NewLazySystemDLL("shell32.dll")
	procDragQueryFileW   = shell32.NewProc("DragQueryFileW")
	user32               = windows.NewLazySystemDLL("user32.dll")
	procOpenClipboard    = user32.NewProc("OpenClipboard")
	procCloseClipboard   = user32.NewProc("CloseClipboard")
	procGetClipboardData = user32.NewProc("GetClipboardData")
	procRegClipFormatW   = user32.NewProc("RegisterClipboardFormatW")
	kernel32             = windows.NewLazySystemDLL("kernel32.dll")
	procGlobalLock       = kernel32.NewProc("GlobalLock")
	procGlobalUnlock     = kernel32.NewProc("GlobalUnlock")
	procGlobalSize       = kernel32.NewProc("GlobalSize")
)

func openClipboard() bool {
	r, _, _ := procOpenClipboard.Call(0)
	return r != 0
}

func closeClipboard() {
	_, _, _ = procCloseClipboard.Call()
}

func clipboardData(format uint32) uintptr {
	h, _, _ := procGetClipboardData.Call(uintptr(format))
	return h
}

func Files() []string {
	if !openClipboard() {
		return nil
	}
	defer closeClipboard()
	h := clipboardData(cfHDROP)
	if h == 0 {
		return nil
	}
	n, _, _ := procDragQueryFileW.Call(h, 0xFFFFFFFF, 0, 0)
	if n == 0 {
		return nil
	}
	out := make([]string, 0, n)
	var buf [32768]uint16
	for i := uintptr(0); i < n; i++ {
		c, _, _ := procDragQueryFileW.Call(h, i, uintptr(unsafe.Pointer(&buf[0])), uintptr(len(buf)))
		if c == 0 {
			continue
		}
		out = append(out, windows.UTF16ToString(buf[:c]))
	}
	return out
}

func PNG() []byte {
	pngName, err := windows.UTF16PtrFromString("PNG")
	if err != nil {
		return nil
	}
	pngFmt, _, _ := procRegClipFormatW.Call(uintptr(unsafe.Pointer(pngName)))
	if pngFmt == 0 {
		return nil
	}
	if !openClipboard() {
		return nil
	}
	defer closeClipboard()
	h := clipboardData(uint32(pngFmt))
	if h == 0 {
		return nil
	}
	ptr, _, _ := procGlobalLock.Call(h)
	if ptr == 0 {
		return nil
	}
	defer procGlobalUnlock.Call(h)
	size, _, _ := procGlobalSize.Call(h)
	if size == 0 {
		return nil
	}
	b := make([]byte, size)
	copy(b, unsafe.Slice((*byte)(unsafe.Pointer(ptr)), size))
	return b
}
