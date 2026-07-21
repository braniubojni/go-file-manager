package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sync"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// Store loads/saves settings.json and shortcuts.json under the user config dir.
type Store struct {
	dir string
	mu  sync.Mutex
}

// EnvConfigDir overrides the config directory when set (used by e2e tests).
const EnvConfigDir = "GFM_CONFIG_DIR"

// Open creates the config directory and ensures default JSON files exist.
// If GFM_CONFIG_DIR is set, that path is used instead of the user config dir.
func Open(appName string) (*Store, error) {
	if dir := os.Getenv(EnvConfigDir); dir != "" {
		return OpenDir(dir)
	}
	cfg, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(cfg, appName)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	s := &Store{dir: dir}
	if err := s.ensureDefaults(); err != nil {
		return nil, err
	}
	return s, nil
}

// OpenDir is like Open but uses an explicit directory (tests).
func OpenDir(dir string) (*Store, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	s := &Store{dir: dir}
	if err := s.ensureDefaults(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Dir() string          { return s.dir }
func (s *Store) SettingsPath() string { return filepath.Join(s.dir, "settings.json") }
func (s *Store) ShortcutsPath() string {
	return filepath.Join(s.dir, "shortcuts.json")
}

func DefaultSettings() domain.Settings {
	return domain.Settings{
		Theme:                   domain.ThemeSystem,
		ShowHidden:              false,
		ShowExtensions:          true,
		UseBuiltInEditor:        true,
		AutoCheckUpdates:        true,
		UpdateCheckIntervalDays: 10,
		LastUpdateCheckAt:       "",
		SkippedUpdateVersion:    "",
		LeftPath:                "",
		RightPath:               "",
	}
}

// DefaultShortcuts maps action id → binding (Mod = Cmd on macOS, Ctrl elsewhere).
func DefaultShortcuts() map[string]string {
	return map[string]string{
		"refresh":          "F5",
		"switchPane":       "Tab",
		"copy":             "Mod+Shift+C",
		"move":             "Mod+Shift+X",
		"delete":           "Delete",
		"rename":           "F2",
		"mkdir":            "Mod+Shift+N",
		"mkfile":           "Mod+N",
		"editFile":         "F4",
		"goTo":             "Mod+P",
		"goParent":         "Alt+ArrowUp",
		"goHome":           "Mod+Home",
		"goBack":           "Backspace",
		"goForward":        "Mod+]",
		"openSettings":     "Mod+,",
		"openShortcuts":    "Mod+/",
		"toggleHidden":     "Mod+H",
		"toggleExtensions": "Mod+E",
		// Ctrl+` (same physical key as Ctrl+~ on many layouts); not Cmd on macOS.
		"toggleTerminal": "Ctrl+Backquote",
	}
}

// ShortcutCatalog is ordered metadata for the shortcuts dialog.
func ShortcutCatalog() []domain.ShortcutDef {
	defs := []struct {
		id, label, desc string
	}{
		{"refresh", "Refresh", "Refresh both panes"},
		{"switchPane", "Switch pane", "Switch the active pane"},
		{"copy", "Copy", "Copy selection to the opposite pane"},
		{"move", "Move", "Move selection to the opposite pane"},
		{"delete", "Delete", "Delete selection (with confirmation)"},
		{"rename", "Rename", "Rename the single selected item"},
		{"mkdir", "New folder", "Create a folder in the active pane"},
		{"mkfile", "New file", "Create an empty file in the active pane"},
		{"editFile", "Edit file", "Open the selected file in the built-in editor"},
		{"goTo", "Go to file/folder", "Quick open nested files and folders in the active pane (Mod+P)"},
		{"goParent", "Parent folder", "Go to the parent of the active pane"},
		{"goHome", "Home", "Go to the home directory in the active pane"},
		{"goBack", "Back", "Navigate back in the active pane history (also mouse back button)"},
		{"goForward", "Forward", "Navigate forward in the active pane history (also mouse forward button)"},
		{"openSettings", "Settings", "Open the settings dialog"},
		{"openShortcuts", "Keyboard shortcuts", "Open the keyboard shortcuts dialog"},
		{"toggleHidden", "Toggle hidden files", "Show or hide dotfiles"},
		{"toggleExtensions", "Toggle extensions", "Show or hide file extensions in names"},
		{"toggleTerminal", "Toggle terminal", "Show or hide the terminal under the active pane (Ctrl+`)"},
	}
	defaults := DefaultShortcuts()
	out := make([]domain.ShortcutDef, 0, len(defs))
	for _, d := range defs {
		out = append(out, domain.ShortcutDef{
			ID:          d.id,
			Label:       d.label,
			Description: d.desc,
			Binding:     defaults[d.id],
		})
	}
	return out
}

// ensureDefaults used to create settings.json / shortcuts.json.
// Prefs now live in encrypted app.db (see SettingsService); keep dir only.
func (s *Store) ensureDefaults() error {
	return nil
}

func (s *Store) LoadSettings() (domain.Settings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.SettingsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return DefaultSettings(), nil
		}
		return domain.Settings{}, err
	}
	var raw domain.Settings
	if err := json.Unmarshal(data, &raw); err != nil {
		return DefaultSettings(), nil
	}
	return normalizeSettings(raw), nil
}

func normalizeSettings(in domain.Settings) domain.Settings {
	out := DefaultSettings()
	switch in.Theme {
	case domain.ThemeSystem, domain.ThemeDark, domain.ThemeLight:
		out.Theme = in.Theme
	}
	out.ShowHidden = in.ShowHidden
	// ShowExtensions defaults true; only false when explicitly false in JSON —
	// zero value of bool is false, so we must detect presence via a second parse if needed.
	// Callers pass full struct on save; on load we use explicit JSON with defaults merge.
	out.ShowExtensions = in.ShowExtensions
	out.UseBuiltInEditor = in.UseBuiltInEditor
	out.AutoCheckUpdates = in.AutoCheckUpdates
	out.UpdateCheckIntervalDays = in.UpdateCheckIntervalDays
	out.LastUpdateCheckAt = in.LastUpdateCheckAt
	out.SkippedUpdateVersion = in.SkippedUpdateVersion
	// If file was empty object, ShowExtensions false is wrong — handle via pointer load.
	out.LeftPath = in.LeftPath
	out.RightPath = in.RightPath
	return out
}

// LoadSettingsStrict merges with defaults using a map so missing bools keep defaults.
func (s *Store) LoadSettingsStrict() (domain.Settings, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.SettingsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return DefaultSettings(), nil
		}
		return domain.Settings{}, err
	}
	var m map[string]any
	if err := json.Unmarshal(data, &m); err != nil {
		return DefaultSettings(), nil
	}
	out := DefaultSettings()
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
	if v, ok := m["useBuiltInEditor"].(bool); ok {
		out.UseBuiltInEditor = v
	}
	if v, ok := m["autoCheckUpdates"].(bool); ok {
		out.AutoCheckUpdates = v
	}
	if v, ok := m["updateCheckIntervalDays"].(float64); ok && int(v) > 0 {
		out.UpdateCheckIntervalDays = int(v)
	}
	if v, ok := m["lastUpdateCheckAt"].(string); ok {
		out.LastUpdateCheckAt = v
	}
	if v, ok := m["skippedUpdateVersion"].(string); ok {
		out.SkippedUpdateVersion = v
	}
	if v, ok := m["leftPath"].(string); ok {
		out.LeftPath = v
	}
	if v, ok := m["rightPath"].(string); ok {
		out.RightPath = v
	}
	return out, nil
}

func (s *Store) SaveSettings(settings domain.Settings) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	settings = normalizeSettingsForSave(settings)
	return writeJSON(s.SettingsPath(), settings)
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

func (s *Store) LoadShortcuts() (map[string]string, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.ShortcutsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return DefaultShortcuts(), nil
		}
		return nil, err
	}
	var raw map[string]string
	if err := json.Unmarshal(data, &raw); err != nil {
		return DefaultShortcuts(), nil
	}
	return mergeShortcuts(raw), nil
}

func mergeShortcuts(raw map[string]string) map[string]string {
	out := DefaultShortcuts()
	for k, v := range raw {
		if v != "" {
			out[k] = v
		}
	}
	return out
}

func (s *Store) SaveShortcuts(shortcuts map[string]string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	merged := mergeShortcuts(shortcuts)
	return writeJSON(s.ShortcutsPath(), merged)
}

// ListShortcutDefs returns catalog entries with current bindings.
func (s *Store) ListShortcutDefs() ([]domain.ShortcutDef, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cur := DefaultShortcuts()
	data, err := os.ReadFile(s.ShortcutsPath())
	if err == nil {
		var raw map[string]string
		if json.Unmarshal(data, &raw) == nil {
			cur = mergeShortcuts(raw)
		}
	} else if !os.IsNotExist(err) {
		return nil, err
	}

	catalog := ShortcutCatalog()
	for i := range catalog {
		if b, ok := cur[catalog[i].ID]; ok {
			catalog[i].Binding = b
		}
	}
	return catalog, nil
}

func writeJSON(path string, v any) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}
	data = append(data, '\n')
	tmp := path + ".tmp"
	if err := os.WriteFile(tmp, data, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, path)
}

// OpenInOS opens path with the default application.
func OpenInOS(path string) error {
	return openPath(path, false)
}

// RevealInOS reveals path in the file manager (Finder/Explorer).
func RevealInOS(path string) error {
	return openPath(path, true)
}

func openPath(path string, reveal bool) error {
	if path == "" {
		return fmt.Errorf("empty path")
	}
	var cmd string
	var args []string
	switch runtime.GOOS {
	case "darwin":
		if reveal {
			cmd = "open"
			args = []string{"-R", path}
		} else {
			cmd = "open"
			args = []string{path}
		}
	case "windows":
		if reveal {
			cmd = "explorer"
			args = []string{"/select,", path}
		} else {
			cmd = "cmd"
			args = []string{"/c", "start", "", path}
		}
	default:
		if reveal {
			// Best effort: open parent directory
			path = filepath.Dir(path)
		}
		cmd = "xdg-open"
		args = []string{path}
	}
	return runDetached(cmd, args...)
}
