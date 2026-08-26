package volumes

import (
	"regexp"
	"strconv"
	"strings"
)

type mountInfo struct {
	Device string
	Path   string
	FS     string
}

var (
	mountLineRe  = regexp.MustCompile(`^(.+) on (/.+) \(([^,)]+)`)
	plistKVRe    = regexp.MustCompile(`<key>(image-path|mount-point)</key>\s*<string>([^<]*)</string>`)
	mountPointRe = regexp.MustCompile(`<key>mount-point</key>\s*<string>([^<]+)</string>`)
	percentRe    = regexp.MustCompile(`(?i)PERCENT(?:AGE)?\s*[:=]?\s*(-?\d+(?:\.\d+)?)`)
	encryptedRe  = regexp.MustCompile(`(?i)encrypted:\s*(YES|TRUE)\b`)
)

// parseMountOutput maps mount-point → device/fstype from `mount` output.
func parseMountOutput(s string) map[string]mountInfo {
	out := make(map[string]mountInfo)
	for _, line := range strings.Split(s, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		m := mountLineRe.FindStringSubmatch(line)
		if len(m) != 4 {
			continue
		}
		out[m[2]] = mountInfo{Device: m[1], Path: m[2], FS: strings.ToLower(m[3])}
	}
	return out
}

// parseHdiutilInfo maps mount-point → image-path from `hdiutil info -plist`.
func parseHdiutilInfo(plist string) map[string]string {
	out := make(map[string]string)
	image := ""
	for _, m := range plistKVRe.FindAllStringSubmatch(plist, -1) {
		switch m[1] {
		case "image-path":
			image = m[2]
		case "mount-point":
			if image != "" && m[2] != "" {
				out[m[2]] = image
			}
		}
	}
	return out
}

func firstMountPoint(plist string) string {
	m := mountPointRe.FindStringSubmatch(plist)
	if len(m) == 2 {
		return m[1]
	}
	return ""
}

// parseHdiutilPercent reads a -puppetstrings PERCENT/PERCENTAGE line.
// ok is false when the line is not progress. Value -1 means indeterminate.
func parseHdiutilPercent(line string) (float64, bool) {
	m := percentRe.FindStringSubmatch(strings.TrimSpace(line))
	if len(m) != 2 {
		return 0, false
	}
	v, err := strconv.ParseFloat(m[1], 64)
	if err != nil {
		return 0, false
	}
	return v, true
}

func imageEncryptedFromOutput(s string) bool {
	if encryptedRe.MatchString(s) {
		return true
	}
	return strings.Contains(s, "<key>encrypted</key>") && strings.Contains(s, "<true/>")
}

func isNetworkFS(fs string) bool {
	switch strings.ToLower(fs) {
	case "smbfs", "afpfs", "nfs", "cifs", "webdav", "fuse.sshfs":
		return true
	default:
		return false
	}
}
