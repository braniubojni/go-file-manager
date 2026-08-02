package filesystem

import "os"

// Access levels reported per directory entry. Empty means "unknown" — used for
// remote entries, where SFTP permission bits are not trustworthy (Windows
// OpenSSH reports a near-constant 0666/0777 for everything).
const (
	AccessFull     = "full"     // read + write (dirs: and enterable)
	AccessReadOnly = "readonly" // readable, not writable
	AccessPartial  = "partial"  // readable but not enterable, or write without read
	AccessNone     = "none"     // not readable
)

// AccessFor classifies what the current process may do with an entry.
func AccessFor(info os.FileInfo) string {
	r, w, x := effectivePerm(info)
	if info.IsDir() {
		switch {
		case r && w && x:
			return AccessFull
		case r && x:
			return AccessReadOnly
		case r || w || x:
			return AccessPartial
		default:
			return AccessNone
		}
	}
	switch {
	case r && w:
		return AccessFull
	case r:
		return AccessReadOnly
	case w:
		return AccessPartial
	default:
		return AccessNone
	}
}

// permFromShift reads one rwx triad out of the mode.
func permFromShift(mode os.FileMode, shift uint) (r, w, x bool) {
	bits := mode.Perm() >> shift
	return bits&0o4 != 0, bits&0o2 != 0, bits&0o1 != 0
}
