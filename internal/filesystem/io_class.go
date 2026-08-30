package filesystem

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"sync"
)

// IOClass is the storage kind used to size copy/move worker pools.
type IOClass int

const (
	IOSSD IOClass = iota
	IOHDD
	IONetwork
)

const (
	hddCopyWorkers     = 2
	networkCopyWorkers = 32
	minSSDCopyWorkers  = 4
	maxCopyWorkers     = 64
)

var numCPU = runtime.NumCPU

var ioClassCache sync.Map // cache key → IOClass

// WorkerCount returns how many parallel file copies to run for this class.
// A single file always uses one stream (never split).
func WorkerCount(class IOClass, files int) int {
	if files <= 1 {
		return 1
	}
	var capN int
	switch class {
	case IOHDD:
		capN = hddCopyWorkers
	case IONetwork:
		capN = networkCopyWorkers
	default:
		capN = numCPU() * 2
		if capN < minSSDCopyWorkers {
			capN = minSSDCopyWorkers
		}
		if capN > maxCopyWorkers {
			capN = maxCopyWorkers
		}
	}
	if capN > files {
		return files
	}
	if capN < 1 {
		return 1
	}
	return capN
}

// CopyWorkersWith takes the minimum of extra and every local path's class.
// Slowest side wins (SSD→HDD stays 2; SFTP→HDD stays 2; SFTP→NVMe stays 32).
func CopyWorkersWith(extra IOClass, localPaths []string, files int) int {
	classes := make([]IOClass, 0, 1+len(localPaths))
	classes = append(classes, extra)
	for _, p := range localPaths {
		if p != "" {
			classes = append(classes, IOClassFor(p))
		}
	}
	return minWorkerCount(files, classes...)
}

func copyWorkers(srcPaths []string, destDir string, files int) int {
	paths := make([]string, 0, len(srcPaths)+1)
	paths = append(paths, srcPaths...)
	if destDir != "" {
		paths = append(paths, destDir)
	}
	return CopyWorkersWith(IOSSD, paths, files)
}

func minWorkerCount(files int, classes ...IOClass) int {
	if len(classes) == 0 {
		return WorkerCount(IOSSD, files)
	}
	n := WorkerCount(classes[0], files)
	for _, c := range classes[1:] {
		if w := WorkerCount(c, files); w < n {
			n = w
		}
	}
	return n
}

// IOClassFor probes the volume behind path (cached by mount device).
func IOClassFor(path string) IOClass {
	key, class, done := classifyMount(path)
	if key != "" {
		if v, ok := ioClassCache.Load(key); ok {
			return v.(IOClass)
		}
	}
	if !done {
		class = classifyMedia(path)
	}
	if key != "" {
		ioClassCache.Store(key, class)
	}
	return class
}

func isNetworkFS(fs string) bool {
	fs = strings.ToLower(fs)
	switch fs {
	case "smbfs", "afpfs", "nfs", "nfs4", "cifs", "webdav", "fuse.sshfs":
		return true
	default:
		return strings.HasPrefix(fs, "nfs")
	}
}

func parseDiskutilClass(plist string) IOClass {
	if strings.Contains(plist, "<key>OpticalDeviceType</key>") {
		return IOHDD
	}
	if i := strings.Index(plist, "<key>SolidState</key>"); i >= 0 {
		rest := plist[i:]
		end := 96
		if end > len(rest) {
			end = len(rest)
		}
		chunk := rest[:end]
		if strings.Contains(chunk, "<false/>") {
			return IOHDD
		}
		if strings.Contains(chunk, "<true/>") {
			return IOSSD
		}
	}
	return IOSSD
}

func cString(b []byte) string {
	n := 0
	for n < len(b) && b[n] != 0 {
		n++
	}
	return string(b[:n])
}

func parseProcMounts(data, path string) (fstype, mountpoint string, ok bool) {
	best := ""
	bestFS := ""
	sc := bufio.NewScanner(strings.NewReader(data))
	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) < 3 {
			continue
		}
		mp := unescapeMount(fields[1])
		if path == mp || strings.HasPrefix(path, mp+"/") {
			if len(mp) >= len(best) {
				best = mp
				bestFS = fields[2]
			}
		}
	}
	if best == "" {
		return "", "", false
	}
	return bestFS, best, true
}

func unescapeMount(s string) string {
	s = strings.ReplaceAll(s, `\040`, " ")
	s = strings.ReplaceAll(s, `\011`, "\t")
	s = strings.ReplaceAll(s, `\012`, "\n")
	s = strings.ReplaceAll(s, `\134`, `\`)
	return s
}

func rotationalAt(sysRoot string, major, minor uint32) (rotational bool, ok bool) {
	p := filepath.Join(sysRoot, "dev", "block", fmt.Sprintf("%d:%d", major, minor))
	if target, err := filepath.EvalSymlinks(p); err == nil {
		p = target
	}
	for {
		b, err := os.ReadFile(filepath.Join(p, "queue", "rotational"))
		if err == nil {
			v := strings.TrimSpace(string(b))
			n, convErr := strconv.Atoi(v)
			if convErr != nil {
				return false, false
			}
			return n == 1, true
		}
		parent := filepath.Dir(p)
		if parent == p || parent == sysRoot || parent == string(filepath.Separator) {
			return false, false
		}
		p = parent
	}
}
