package service

import (
	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// SettingsService persists app settings and shortcuts as JSON files.
type SettingsService struct {
	store *config.Store
}

func NewSettingsService(store *config.Store) *SettingsService {
	return &SettingsService{store: store}
}

func (s *SettingsService) GetSettings() (domain.Settings, error) {
	return s.store.LoadSettingsStrict()
}

func (s *SettingsService) SaveSettings(settings domain.Settings) error {
	return s.store.SaveSettings(settings)
}

func (s *SettingsService) GetPanePaths() (domain.PanePaths, error) {
	st, err := s.store.LoadSettingsStrict()
	if err != nil {
		return domain.PanePaths{}, err
	}
	return domain.PanePaths{Left: st.LeftPath, Right: st.RightPath}, nil
}

func (s *SettingsService) SavePanePaths(left, right string) error {
	st, err := s.store.LoadSettingsStrict()
	if err != nil {
		return err
	}
	st.LeftPath = left
	st.RightPath = right
	return s.store.SaveSettings(st)
}

func (s *SettingsService) GetShortcuts() (map[string]string, error) {
	return s.store.LoadShortcuts()
}

func (s *SettingsService) SaveShortcuts(shortcuts map[string]string) error {
	return s.store.SaveShortcuts(shortcuts)
}

func (s *SettingsService) ListShortcutDefs() ([]domain.ShortcutDef, error) {
	return s.store.ListShortcutDefs()
}

func (s *SettingsService) GetConfigDir() string {
	return s.store.Dir()
}

func (s *SettingsService) GetSettingsPath() string {
	return s.store.SettingsPath()
}

func (s *SettingsService) GetShortcutsPath() string {
	return s.store.ShortcutsPath()
}

func (s *SettingsService) OpenInOS(path string) error {
	return config.OpenInOS(path)
}

func (s *SettingsService) RevealInOS(path string) error {
	return config.RevealInOS(path)
}
