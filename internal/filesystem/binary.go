package filesystem

import (
	"bytes"
	"errors"
)

// ErrExecutable is returned when the built-in editor is asked for a compiled
// binary. It is deliberately distinct from the "binary or unsupported encoding"
// message: the frontend hands the latter to the OS default app, and doing that
// with an executable would run it.
var ErrExecutable = errors.New("executable file: cannot be edited")

// HeadBytes is how much of a file is enough to recognise its format.
const HeadBytes = 512

// Executable image magic numbers. The unix `x` mode bit is deliberately NOT
// consulted: a 0755 shell script is executable and perfectly editable.
var execMagics = [][]byte{
	{0x7f, 'E', 'L', 'F'},    // ELF (Linux, BSD)
	{0xfe, 0xed, 0xfa, 0xce}, // Mach-O 32-bit
	{0xfe, 0xed, 0xfa, 0xcf}, // Mach-O 64-bit
	{0xce, 0xfa, 0xed, 0xfe}, // Mach-O 32-bit, byte-swapped
	{0xcf, 0xfa, 0xed, 0xfe}, // Mach-O 64-bit, byte-swapped
	{0xca, 0xfe, 0xba, 0xbe}, // Mach-O universal binary
	{0xbe, 0xba, 0xfe, 0xca}, // Mach-O universal, byte-swapped
	{'d', 'e', 'x', 0x0a},    // Android dalvik
	{0x00, 'a', 's', 'm'},    // WebAssembly
}

// IsExecutable reports whether head (the first bytes of a file) is an
// executable image.
func IsExecutable(head []byte) bool {
	for _, magic := range execMagics {
		if bytes.HasPrefix(head, magic) {
			return true
		}
	}
	// PE/COFF ("MZ") is only two bytes and plain prose can start that way, so
	// require a NUL as well — every real DOS header has them, text does not.
	return bytes.HasPrefix(head, []byte("MZ")) && bytes.IndexByte(head, 0) >= 0
}
