//go:build !windows

package filesystem

import (
	"os"
	"sync"
	"syscall"
)

// Cached once: the process identity never changes at runtime.
var (
	idOnce sync.Once
	euid   int
	egid   int
	groups map[int]struct{}
)

func processIdentity() (int, int, map[int]struct{}) {
	idOnce.Do(func() {
		euid = os.Geteuid()
		egid = os.Getegid()
		groups = map[int]struct{}{egid: {}}
		if gs, err := os.Getgroups(); err == nil {
			for _, g := range gs {
				groups[g] = struct{}{}
			}
		}
	})
	return euid, egid, groups
}

// effectivePerm picks the rwx triad that actually applies to this process:
// owner if we own the file, else group if we are in its group, else other.
func effectivePerm(info os.FileInfo) (r, w, x bool) {
	st, ok := info.Sys().(*syscall.Stat_t)
	if !ok {
		// No stat data (rare): fall back to the owner triad.
		return permFromShift(info.Mode(), 6)
	}
	uid, _, gids := processIdentity()
	if uid == 0 {
		// root bypasses the permission bits for read/write; execute on a file
		// still needs at least one x bit, but directories are always enterable.
		if info.IsDir() {
			return true, true, true
		}
		_, _, anyX := permFromShift(info.Mode(), 0)
		ox, gx := info.Mode().Perm()&0o100 != 0, info.Mode().Perm()&0o010 != 0
		return true, true, anyX || ox || gx
	}
	if int(st.Uid) == uid {
		return permFromShift(info.Mode(), 6)
	}
	if _, ok := gids[int(st.Gid)]; ok {
		return permFromShift(info.Mode(), 3)
	}
	return permFromShift(info.Mode(), 0)
}
