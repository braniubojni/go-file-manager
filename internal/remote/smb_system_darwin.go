//go:build darwin

package remote

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// SystemMountSMB opens the macOS NetFS / Finder connect-to-server sheet
// (Connect confirmation + volume picker) via `mount volume "smb://host"`.
// Returns newly appeared /Volumes paths after the user confirms.
func SystemMountSMB(host string) ([]string, error) {
	host = normalizeSMBDialHost(host)
	if err := validateSMBHost(host); err != nil {
		return nil, err
	}
	before := volumeSet()
	log.Printf("gfm: smb system mount start host=%q volumes=%d", host, len(before))

	script := fmt.Sprintf(`mount volume "smb://%s"`, strings.ReplaceAll(host, `"`, ""))
	cmd := exec.Command("osascript", "-e", script)
	out, err := cmd.CombinedOutput()
	msg := strings.TrimSpace(string(out))
	if err != nil {
		low := strings.ToLower(msg + " " + err.Error())
		if strings.Contains(low, "user canceled") || strings.Contains(low, "cancelled") {
			log.Printf("gfm: smb system mount canceled host=%q", host)
			return nil, fmt.Errorf("connection canceled")
		}
		log.Printf("gfm: smb system mount fail host=%q err=%v out=%s", host, err, msg)
		return nil, fmt.Errorf("system SMB mount: %s: %w", msg, err)
	}

	// Finder may take a moment to attach the volume after osascript returns.
	deadline := time.Now().Add(8 * time.Second)
	var added []string
	for {
		added = volumeDiff(before, volumeSet())
		if len(added) > 0 || time.Now().After(deadline) {
			break
		}
		time.Sleep(250 * time.Millisecond)
	}
	log.Printf("gfm: smb system mount ok host=%q mounted=%v", host, added)
	if len(added) == 0 {
		return nil, fmt.Errorf("system SMB mount produced no new volumes under /Volumes")
	}
	return added, nil
}

func volumeSet() map[string]struct{} {
	ents, err := os.ReadDir("/Volumes")
	if err != nil {
		return map[string]struct{}{}
	}
	out := make(map[string]struct{}, len(ents))
	for _, e := range ents {
		out[filepath.Join("/Volumes", e.Name())] = struct{}{}
	}
	return out
}

func volumeDiff(before, after map[string]struct{}) []string {
	var added []string
	for p := range after {
		if _, ok := before[p]; !ok {
			added = append(added, p)
		}
	}
	return added
}
