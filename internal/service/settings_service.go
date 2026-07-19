package service

import (
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
)

// SettingsService persists app settings (paths, theme).
type SettingsService struct {
	db *storage.DB
}

func NewSettingsService(db *storage.DB) *SettingsService {
	return &SettingsService{db: db}
}

func (s *SettingsService) GetAll() (map[string]string, error) {
	return s.db.GetAllSettings()
}

func (s *SettingsService) Get(key string) (string, error) {
	return s.db.GetSetting(key)
}

func (s *SettingsService) Set(key, value string) error {
	return s.db.SetSetting(key, value)
}

func (s *SettingsService) GetPanePaths() (domain.PanePaths, error) {
	return s.db.GetPanePaths()
}

func (s *SettingsService) SavePanePaths(left, right string) error {
	return s.db.SavePanePaths(left, right)
}

func (s *SettingsService) GetTheme() (string, error) {
	return s.db.GetSetting(domain.SettingTheme)
}

func (s *SettingsService) SetTheme(theme string) error {
	if theme != "light" && theme != "dark" {
		theme = "dark"
	}
	return s.db.SetSetting(domain.SettingTheme, theme)
}
