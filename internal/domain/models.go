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
	Theme          string `json:"theme"`
	ShowHidden     bool   `json:"showHidden"`
	ShowExtensions bool   `json:"showExtensions"`
	LeftPath       string `json:"leftPath"`
	RightPath      string `json:"rightPath"`
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
