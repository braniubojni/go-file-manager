package domain

// FileEntry is a single directory listing row.
type FileEntry struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	IsDir     bool   `json:"isDir"`
	Size      int64  `json:"size"`
	ModTime   int64  `json:"modTime"` // unix milliseconds
	Ext       string `json:"ext"`
	IsSymlink bool   `json:"isSymlink"`
}

// Bookmark is a saved directory shortcut.
type Bookmark struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	SortOrder int    `json:"sortOrder"`
	CreatedAt string `json:"createdAt"`
}

// PanePaths holds last-used left/right directory paths.
type PanePaths struct {
	Left  string `json:"left"`
	Right string `json:"right"`
}

// ThemeMode values for Settings.Theme.
const (
	ThemeSystem = "system"
	ThemeDark   = "dark"
	ThemeLight  = "light"
)

// Settings is the contents of settings.json.
type Settings struct {
	Theme                   string `json:"theme"`
	ShowHidden              bool   `json:"showHidden"`
	ShowExtensions          bool   `json:"showExtensions"`
	UseBuiltInEditor        bool   `json:"useBuiltInEditor"`
	AutoCheckUpdates        bool   `json:"autoCheckUpdates"`
	UpdateCheckIntervalDays int    `json:"updateCheckIntervalDays"`
	LastUpdateCheckAt       string `json:"lastUpdateCheckAt"`  // RFC3339; empty if never
	SkippedUpdateVersion    string `json:"skippedUpdateVersion"` // remote version user skipped
	LeftPath                string `json:"leftPath"`
	RightPath               string `json:"rightPath"`
}

// UpdateInfo is the result of checking GitHub Releases for a newer version.
type UpdateInfo struct {
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion"`
	Notes          string `json:"notes"`
	HTMLURL        string `json:"htmlUrl"`
	AssetName      string `json:"assetName"`
	AssetURL       string `json:"assetUrl"`
	AssetSize      int64  `json:"assetSize"`
	Available      bool   `json:"available"`
}

// SearchHit is one result from nested file/folder search (Go-to).
type SearchHit struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	IsDir   bool   `json:"isDir"`
	RelPath string `json:"relPath"`
}

// ShortcutDef describes one bindable action (for UI + docs).
type ShortcutDef struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Binding     string `json:"binding"`
}

// ConnectionProfile is a saved remote connection (SSH now; FTP/SFTP later).
type ConnectionProfile struct {
	ID       string `json:"id"`
	Protocol string `json:"protocol"` // "ssh", future: "ftp", "sftp"
	User     string `json:"user"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	Label    string `json:"label"` // display name; default user@host
}

// ActiveSession is a live remote connection for UI.
type ActiveSession struct {
	Key      string `json:"key"`      // user@host:port
	Protocol string `json:"protocol"`
	User     string `json:"user"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	RootPath string `json:"rootPath"` // ssh://user@host:port/
}

// ConnectResult is returned after a successful SSH dial.
type ConnectResult struct {
	RootPath string `json:"rootPath"`
	HomePath string `json:"homePath"` // preferred start path (remote home or root)
	Key      string `json:"key"`
}

// AppName is used for config/data directories.
const AppName = "go-file-manager"
