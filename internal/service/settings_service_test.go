package service

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
)

func TestSettingsEncryptedMigrateFromJSON(t *testing.T) {
	dir := t.TempDir()
	// legacy JSON
	if err := os.WriteFile(filepath.Join(dir, "settings.json"), []byte(`{
  "theme": "dark",
  "showHidden": true,
  "showExtensions": false,
  "leftPath": "/left",
  "rightPath": "/right"
}
`), 0o644); err != nil {
		t.Fatal(err)
	}

	db, err := storage.OpenPath(filepath.Join(dir, "app.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = db.Close() })

	cfg, err := config.OpenDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	svc := NewSettingsService(db, cfg)

	s, err := svc.GetSettings()
	if err != nil {
		t.Fatal(err)
	}
	if s.Theme != domain.ThemeDark || !s.ShowHidden || s.ShowExtensions {
		t.Fatalf("migrated settings: %+v", s)
	}
	if s.LeftPath != "/left" || s.RightPath != "/right" {
		t.Fatalf("paths: %+v", s)
	}

	// JSON should be renamed to .bak
	if _, err := os.Stat(filepath.Join(dir, "settings.json")); !os.IsNotExist(err) {
		t.Fatalf("expected settings.json removed/renamed, err=%v", err)
	}
	if _, err := os.Stat(filepath.Join(dir, "settings.json.bak")); err != nil {
		t.Fatalf("expected bak: %v", err)
	}

	// Round-trip save
	s.Theme = domain.ThemeLight
	if err := svc.SaveSettings(s); err != nil {
		t.Fatal(err)
	}
	s2, err := svc.GetSettings()
	if err != nil {
		t.Fatal(err)
	}
	if s2.Theme != domain.ThemeLight {
		t.Fatalf("got theme %q", s2.Theme)
	}
}
