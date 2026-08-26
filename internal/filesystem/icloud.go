package filesystem

import (
	"os"
	"path/filepath"
	"strings"
)

// ICloudDrivePath returns the local iCloud Drive folder, or "" if missing.
func ICloudDrivePath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return iCloudDriveFromHome(home), nil
}

func iCloudDriveFromHome(home string) string {
	if home == "" {
		return ""
	}
	primary := filepath.Join(home, "Library", "Mobile Documents", "com~apple~CloudDocs")
	if isDir(primary) {
		return primary
	}
	cloud := filepath.Join(home, "Library", "CloudStorage")
	ents, err := os.ReadDir(cloud)
	if err != nil {
		return ""
	}
	for _, e := range ents {
		if !e.IsDir() {
			continue
		}
		if strings.HasPrefix(e.Name(), "iCloud Drive") {
			p := filepath.Join(cloud, e.Name())
			if isDir(p) {
				return p
			}
		}
	}
	return ""
}
