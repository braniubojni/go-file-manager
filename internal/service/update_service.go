package service

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/version"
	"golang.org/x/mod/semver"
)

const (
	githubOwner = "braniubojni"
	githubRepo  = "go-file-manager"
	userAgent   = "go-file-manager-updater"
	maxNotes    = 4000
)

// UpdateService checks GitHub Releases and downloads update packages.
type UpdateService struct {
	httpClient *http.Client
	// overrides for tests
	latestURL string
	goos      string
	goarch    string
}

func NewUpdateService() *UpdateService {
	return &UpdateService{
		httpClient: &http.Client{Timeout: 60 * time.Second},
		latestURL:  fmt.Sprintf("https://api.github.com/repos/%s/%s/releases/latest", githubOwner, githubRepo),
		goos:       runtime.GOOS,
		goarch:     runtime.GOARCH,
	}
}

// GetVersion returns the build-injected app version (no leading v).
func (s *UpdateService) GetVersion() string {
	return version.Version
}

// ReleasesURL is the human-facing releases page.
func (s *UpdateService) ReleasesURL() string {
	return fmt.Sprintf("https://github.com/%s/%s/releases", githubOwner, githubRepo)
}

// CheckForUpdate compares the local version to the latest GitHub release.
func (s *UpdateService) CheckForUpdate() (domain.UpdateInfo, error) {
	current := normalizeVersion(version.Version)
	info := domain.UpdateInfo{
		CurrentVersion: stripV(current),
		HTMLURL:        s.ReleasesURL(),
	}

	req, err := http.NewRequest(http.MethodGet, s.latestURL, nil)
	if err != nil {
		return info, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", userAgent)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return info, fmt.Errorf("update check failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		// No releases yet — treat as up to date.
		info.LatestVersion = stripV(current)
		return info, nil
	}
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return info, fmt.Errorf("GitHub API %s: %s", resp.Status, strings.TrimSpace(string(body)))
	}

	var rel ghRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return info, fmt.Errorf("parse release: %w", err)
	}

	latest := normalizeVersion(rel.TagName)
	info.LatestVersion = stripV(latest)
	info.Notes = truncateNotes(rel.Body)
	if rel.HTMLURL != "" {
		info.HTMLURL = rel.HTMLURL
	}

	if !semver.IsValid(latest) {
		return info, fmt.Errorf("invalid release tag %q", rel.TagName)
	}
	// Dev / non-semver local builds always offer a valid remote release as available.
	if !semver.IsValid(current) || semver.Compare(latest, current) > 0 {
		info.Available = true
		name, url, size := pickAsset(rel.Assets, s.goos, s.goarch)
		info.AssetName = name
		info.AssetURL = url
		info.AssetSize = size
	}
	return info, nil
}

// DownloadUpdate saves the asset URL to a temp file and returns its path.
func (s *UpdateService) DownloadUpdate(assetURL string) (string, error) {
	if strings.TrimSpace(assetURL) == "" {
		return "", fmt.Errorf("no download URL")
	}
	req, err := http.NewRequest(http.MethodGet, assetURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/octet-stream")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("download HTTP %s", resp.Status)
	}

	base := filepath.Base(strings.Split(assetURL, "?")[0])
	if base == "" || base == "." || base == "/" {
		base = "update.bin"
	}
	tmp, err := os.CreateTemp("", "gfm-update-*"+filepath.Ext(base))
	if err != nil {
		return "", err
	}
	path := tmp.Name()
	// Prefer original name in same dir for nicer open UX
	named := filepath.Join(filepath.Dir(path), base)
	_ = tmp.Close()
	_ = os.Remove(path)

	out, err := os.Create(named)
	if err != nil {
		return "", err
	}
	defer out.Close()
	if _, err := io.Copy(out, resp.Body); err != nil {
		_ = os.Remove(named)
		return "", err
	}
	return named, nil
}

// ApplyUpdate opens the downloaded package with the OS (installer / DMG / folder).
func (s *UpdateService) ApplyUpdate(localPath string) error {
	if strings.TrimSpace(localPath) == "" {
		return fmt.Errorf("empty path")
	}
	if _, err := os.Stat(localPath); err != nil {
		return err
	}
	return config.OpenInOS(localPath)
}

// OpenReleasesPage opens the GitHub releases page in the browser.
func (s *UpdateService) OpenReleasesPage() error {
	return config.OpenInOS(s.ReleasesURL())
}

// --- helpers (exported for tests via same package) ---

type ghRelease struct {
	TagName string    `json:"tag_name"`
	Body    string    `json:"body"`
	HTMLURL string    `json:"html_url"`
	Assets  []ghAsset `json:"assets"`
}

type ghAsset struct {
	Name               string `json:"name"`
	BrowserDownloadURL string `json:"browser_download_url"`
	Size               int64  `json:"size"`
}

func normalizeVersion(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "v0.0.0"
	}
	if !strings.HasPrefix(v, "v") {
		v = "v" + v
	}
	// dev builds are not valid semver for Compare; leave as-is
	return v
}

func stripV(v string) string {
	return strings.TrimPrefix(v, "v")
}

func truncateNotes(s string) string {
	s = strings.TrimSpace(s)
	if utf8.RuneCountInString(s) <= maxNotes {
		return s
	}
	r := []rune(s)
	return string(r[:maxNotes]) + "…"
}

// pickAsset chooses the best GitHub release asset for goos/goarch.
// Naming convention (phase 2 builds): go-file-manager_{ver}_{os}_{arch}.{ext}
func pickAsset(assets []ghAsset, goos, goarch string) (name, url string, size int64) {
	if len(assets) == 0 {
		return "", "", 0
	}
	osKeys := osNameKeys(goos)
	archKeys := archNameKeys(goarch)
	exts := preferredExts(goos)

	type cand struct {
		a     ghAsset
		score int
	}
	var best *cand
	for _, a := range assets {
		n := strings.ToLower(a.Name)
		if strings.Contains(n, "sha256") || strings.Contains(n, "checksum") {
			continue
		}
		score := 0
		for _, k := range osKeys {
			if strings.Contains(n, k) {
				score += 10
				break
			}
		}
		for _, k := range archKeys {
			if strings.Contains(n, k) {
				score += 5
				break
			}
		}
		for i, ext := range exts {
			if strings.HasSuffix(n, ext) {
				score += 3 - i // prefer earlier extensions
				break
			}
		}
		if score < 10 {
			continue // must match OS at least
		}
		if best == nil || score > best.score {
			best = &cand{a: a, score: score}
		}
	}
	if best == nil {
		return "", "", 0
	}
	return best.a.Name, best.a.BrowserDownloadURL, best.a.Size
}

func osNameKeys(goos string) []string {
	switch goos {
	case "darwin":
		return []string{"darwin", "macos", "osx", "mac"}
	case "windows":
		return []string{"windows", "win64", "win32", "win"}
	case "linux":
		return []string{"linux"}
	default:
		return []string{goos}
	}
}

func archNameKeys(goarch string) []string {
	switch goarch {
	case "amd64":
		return []string{"amd64", "x86_64", "x64"}
	case "arm64":
		return []string{"arm64", "aarch64"}
	case "386":
		return []string{"386", "i386", "x86"}
	default:
		return []string{goarch}
	}
}

func preferredExts(goos string) []string {
	switch goos {
	case "darwin":
		return []string{".dmg", ".zip", ".pkg", ".tar.gz"}
	case "windows":
		return []string{".msi", ".exe", ".zip"}
	case "linux":
		return []string{".appimage", ".tar.gz", ".deb", ".rpm", ".zip"}
	default:
		return []string{".zip", ".tar.gz"}
	}
}
