package filesystem

import (
	"os"
	"path/filepath"
	"strings"
)

// GoogleDrivePaths returns local Google Drive for desktop folders (one per account), or nil if none.
func GoogleDrivePaths() ([]string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	return googleDrivePathsFromHome(home), nil
}

func googleDrivePathsFromHome(home string) []string {
	return googleDrivePaths(home, filepath.Join(string(filepath.Separator), "Volumes", "GoogleDrive"))
}

// googleDrivePaths is the testable core; volumesMount is injected so tests
// don't depend on the real host's /Volumes/GoogleDrive mount.
func googleDrivePaths(home, volumesMount string) []string {
	if home == "" {
		return nil
	}
	var out []string

	cloud := filepath.Join(home, "Library", "CloudStorage")
	if ents, err := os.ReadDir(cloud); err == nil {
		for _, e := range ents {
			if !e.IsDir() || !strings.HasPrefix(e.Name(), "GoogleDrive-") {
				continue
			}
			if p := filepath.Join(cloud, e.Name()); isDir(p) {
				out = append(out, p)
			}
		}
	}

	// Older streaming mount.
	if isDir(volumesMount) {
		out = append(out, volumesMount)
	}

	// ponytail: legacy Windows Backup-and-Sync default; drive-letter mounts (G:\My Drive)
	// aren't probed since the letter is user-configurable — add if reported.
	if p := filepath.Join(home, "Google Drive"); isDir(p) {
		out = append(out, p)
	}

	return out
}
