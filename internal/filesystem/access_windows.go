//go:build windows

package filesystem

import "os"

// effectivePerm on Windows: Go has no uid/gid to compare, and synthesises the
// mode from the read-only attribute (0666 writable, 0444 read-only). Directories
// are always reported traversable. ACLs are not consulted — a full ACL check per
// listing entry would cost a syscall each.
// ponytail: attribute-level only; wire up golang.org/x/sys/windows ACL checks if
// per-user directory permissions ever matter here.
func effectivePerm(info os.FileInfo) (r, w, x bool) {
	perm := info.Mode().Perm()
	return perm&0o400 != 0, perm&0o200 != 0, info.IsDir() || perm&0o100 != 0
}
