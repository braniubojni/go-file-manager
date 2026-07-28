package service

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/version"
	"github.com/wailsapp/wails/v3/pkg/application"
)

const (
	githubOwner = "braniubojni"
	githubRepo  = "go-file-manager"
)

// UpdateService is a thin Wails-bound façade over app.Updater.
type UpdateService struct {
	app *application.App
}

func NewUpdateService() *UpdateService {
	return &UpdateService{}
}

// SetApp injects the application after application.New (and Updater.Init).
func (s *UpdateService) SetApp(app *application.App) {
	s.app = app
}

// GetVersion returns the build-injected app version (no leading v).
func (s *UpdateService) GetVersion() string {
	return version.Version
}

// ReleasesURL is the human-facing releases page.
func (s *UpdateService) ReleasesURL() string {
	return fmt.Sprintf("https://github.com/%s/%s/releases", githubOwner, githubRepo)
}

// CheckAndInstall opens the Wails update window, checks GitHub Releases, and
// if a newer version is found, downloads/verifies/stages it for Restart & Apply.
// Non-blocking: work runs in a background goroutine so the UI thread stays free.
func (s *UpdateService) CheckAndInstall() error {
	if s.app == nil {
		return fmt.Errorf("updater not ready")
	}
	go func() {
		if err := s.app.Updater.CheckAndInstall(context.Background()); err != nil {
			log.Printf("update: %v", err)
		}
	}()
	return nil
}

// OpenReleasesPage opens the GitHub releases page in the browser.
func (s *UpdateService) OpenReleasesPage() error {
	return config.OpenInOS(s.ReleasesURL())
}

// CurrentVersionForUpdater returns a version string suitable for updater.Config
// (no leading "v"). Dev builds keep their string as-is.
func CurrentVersionForUpdater(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "0.0.0-dev"
	}
	return strings.TrimPrefix(v, "v")
}
