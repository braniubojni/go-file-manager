//go:build darwin

package volumes

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

func attachDiskImage(ctx context.Context, path, password string, onProgress func(float64)) (string, error) {
	if mp := existingMountForImage(path); mp != "" {
		return mp, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	args := []string{"attach", "-nobrowse", "-plist", "-puppetstrings"}
	if password != "" {
		args = append(args, "-stdinpass")
	}
	args = append(args, path)
	cmd := exec.CommandContext(ctx, "hdiutil", args...)
	if password != "" {
		cmd.Stdin = bytes.NewReader(append([]byte(password), 0))
	} else {
		cmd.Stdin = bytes.NewReader(nil)
	}
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return "", err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return "", err
	}
	if err := cmd.Start(); err != nil {
		return "", fmt.Errorf("attach disk image: %w", err)
	}
	var outBuf, errBuf bytes.Buffer
	scanDone := make(chan struct{})
	go func() {
		defer close(scanDone)
		scanHdiutilPercents(io.TeeReader(stderr, &errBuf), onProgress)
	}()
	scanHdiutilPercents(io.TeeReader(stdout, &outBuf), onProgress)
	// Both pipes must be fully drained before Wait closes them (os/exec docs).
	<-scanDone
	waitErr := cmd.Wait()
	out := outBuf.Bytes()
	if waitErr != nil {
		msg := strings.TrimSpace(errBuf.String() + "\n" + string(out))
		if msg == "" {
			if ctx.Err() != nil {
				msg = "canceled"
			} else {
				msg = waitErr.Error()
			}
		}
		return "", fmt.Errorf("attach disk image: %s", compactHdiutilMsg(msg))
	}
	combined := string(out) + errBuf.String()
	mp := firstMountPoint(combined)
	if mp == "" {
		return "", fmt.Errorf("attach disk image: no mount point in hdiutil output")
	}
	return mp, nil
}

func scanHdiutilPercents(r io.Reader, onProgress func(float64)) {
	if onProgress == nil {
		_, _ = io.Copy(io.Discard, r)
		return
	}
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	var last time.Time
	for sc.Scan() {
		pct, ok := parseHdiutilPercent(sc.Text())
		if !ok {
			continue
		}
		now := time.Now()
		if pct >= 100 || pct < 0 || now.Sub(last) >= 80*time.Millisecond {
			last = now
			onProgress(pct)
		}
	}
}

func compactHdiutilMsg(msg string) string {
	lines := strings.Split(msg, "\n")
	var keep []string
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if _, ok := parseHdiutilPercent(line); ok {
			continue
		}
		keep = append(keep, line)
	}
	out := strings.Join(keep, "\n")
	if len(out) > 800 {
		return out[:800]
	}
	return out
}

func existingMountForImage(dmg string) string {
	info := parseHdiutilInfo(runCmd("hdiutil", "info", "-plist"))
	for mp, src := range info {
		if src == dmg {
			if _, err := os.Stat(mp); err == nil {
				return mp
			}
		}
	}
	return ""
}

func imageIsEncrypted(path string) bool {
	return imageEncryptedFromOutput(runCmd("hdiutil", "isencrypted", "-plist", path))
}
