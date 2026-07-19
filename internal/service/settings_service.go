package service

import (
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
)

const (
	kvSettings  = "settings"
	kvShortcuts = "shortcuts"
)

// SettingsService persists app settings and shortcuts in encrypted SQLite (app.db).
// Legacy settings.json / shortcuts.json are migrated once on first load.
type SettingsService struct {
	db  *storage.DB
	cfg *config.Store
}

func NewSettingsService(db *storage.DB, cfg *config.Store) *SettingsService {
	return &SettingsService{db: db, cfg: cfg}
}

func (s *SettingsService) GetSettings() (domain.Settings, error) {
	if err := s.migrateJSONIfNeeded(); err != nil {
		return domain.Settings{}, err
	}
	raw, err := s.db.GetKV(kvSettings)
	if err != nil {
		return domain.Settings{}, err
	}
	if raw == nil {
		def := config.DefaultSettings()
		if err := s.SaveSettings(def); err != nil {
			return domain.Settings{}, err
		}
		return def, nil
	}
	return parseSettingsJSON(raw), nil
}

func (s *SettingsService) SaveSettings(settings domain.Settings) error {
	settings = normalizeSettingsForSave(settings)
	data, err := json.Marshal(settings)
	if err != nil {
		return err
	}
	return s.db.SetKV(kvSettings, data)
}

func (s *SettingsService) GetPanePaths() (domain.PanePaths, error) {
	st, err := s.GetSettings()
	if err != nil {
		return domain.PanePaths{}, err
	}
	return domain.PanePaths{Left: st.LeftPath, Right: st.RightPath}, nil
}

func (s *SettingsService) SavePanePaths(left, right string) error {
	st, err := s.GetSettings()
	if err != nil {
		return err
	}
	st.LeftPath = left
	st.RightPath = right
	return s.SaveSettings(st)
}

func (s *SettingsService) GetShortcuts() (map[string]string, error) {
	if err := s.migrateJSONIfNeeded(); err != nil {
		return nil, err
	}
	raw, err := s.db.GetKV(kvShortcuts)
	if err != nil {
		return nil, err
	}
	if raw == nil {
		def := config.DefaultShortcuts()
		if err := s.SaveShortcuts(def); err != nil {
			return nil, err
		}
		return def, nil
	}
	var m map[string]string
	if err := json.Unmarshal(raw, &m); err != nil {
		return config.DefaultShortcuts(), nil
	}
	return mergeShortcuts(m), nil
}

func (s *SettingsService) SaveShortcuts(shortcuts map[string]string) error {
	merged := mergeShortcuts(shortcuts)
	data, err := json.Marshal(merged)
	if err != nil {
		return err
	}
	return s.db.SetKV(kvShortcuts, data)
}

func (s *SettingsService) ListShortcutDefs() ([]domain.ShortcutDef, error) {
	cur, err := s.GetShortcuts()
	if err != nil {
		return nil, err
	}
	catalog := config.ShortcutCatalog()
	for i := range catalog {
		if b, ok := cur[catalog[i].ID]; ok {
			catalog[i].Binding = b
		}
	}
	return catalog, nil
}

func (s *SettingsService) GetConfigDir() string {
	if s.cfg != nil {
		return s.cfg.Dir()
	}
	return s.db.Dir()
}

func (s *SettingsService) GetSettingsPath() string {
	// Logical path: encrypted blob lives in app.db; report config dir for UI.
	return filepath.Join(s.GetConfigDir(), "app.db")
}

func (s *SettingsService) GetShortcutsPath() string {
	return filepath.Join(s.GetConfigDir(), "app.db")
}

func (s *SettingsService) OpenInOS(path string) error {
	return config.OpenInOS(path)
}

func (s *SettingsService) RevealInOS(path string) error {
	return config.RevealInOS(path)
}

// migrateJSONIfNeeded imports settings.json / shortcuts.json when present.
// Files are always re-imported then renamed to .bak so e2e can rewrite JSON
// without deleting app.db (which would break an open SQLite handle).
func (s *SettingsService) migrateJSONIfNeeded() error {
	dir := s.GetConfigDir()

	p := filepath.Join(dir, "settings.json")
	if data, err := os.ReadFile(p); err == nil {
		if err := s.db.SetKV(kvSettings, data); err != nil {
			return err
		}
		_ = os.Rename(p, p+".bak")
	} else if !os.IsNotExist(err) {
		return err
	}

	p = filepath.Join(dir, "shortcuts.json")
	if data, err := os.ReadFile(p); err == nil {
		if err := s.db.SetKV(kvShortcuts, data); err != nil {
			return err
		}
		_ = os.Rename(p, p+".bak")
	} else if !os.IsNotExist(err) {
		return err
	}
	return nil
}

func parseSettingsJSON(data []byte) domain.Settings {
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return config.DefaultSettings()
	}
	out := config.DefaultSettings()
	if v, ok := m["theme"].(string); ok {
		switch v {
		case domain.ThemeSystem, domain.ThemeDark, domain.ThemeLight:
			out.Theme = v
		}
	}
	if v, ok := m["showHidden"].(bool); ok {
		out.ShowHidden = v
	}
	if v, ok := m["showExtensions"].(bool); ok {
		out.ShowExtensions = v
	}
	if v, ok := m["leftPath"].(string); ok {
		out.LeftPath = v
	}
	if v, ok := m["rightPath"].(string); ok {
		out.RightPath = v
	}
	return out
}

func normalizeSettingsForSave(in domain.Settings) domain.Settings {
	out := in
	switch out.Theme {
	case domain.ThemeSystem, domain.ThemeDark, domain.ThemeLight:
	default:
		out.Theme = domain.ThemeSystem
	}
	return out
}

func mergeShortcuts(raw map[string]string) map[string]string {
	out := config.DefaultShortcuts()
	for k, v := range raw {
		if v != "" {
			out[k] = v
		}
	}
	return out
}
