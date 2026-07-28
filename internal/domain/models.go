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

// GitStatusEntry is one child name with a compact git working-tree status.
// Status is one of: M (modified), A (added), D (deleted), U (unmerged), ? (untracked).
type GitStatusEntry struct {
	Name   string `json:"name"`
	Status string `json:"status"`
}

// GitDirStatus is git status for immediate children of one listed directory.
type GitDirStatus struct {
	RepoRoot string           `json:"repoRoot"` // empty if not in a repo
	Entries  []GitStatusEntry `json:"entries"`
}

// GitFileDiff is HEAD vs working-tree content for one local file (read-only viewer).
type GitFileDiff struct {
	Path      string `json:"path"`
	RepoRoot  string `json:"repoRoot"`
	RelPath   string `json:"relPath"`
	Status    string `json:"status"` // M|A|D|U|? or empty
	OldText   string `json:"oldText"`
	NewText   string `json:"newText"`
	Binary    bool   `json:"binary"`
	Truncated bool   `json:"truncated"`
	Message   string `json:"message"` // soft-fail reason when no usable content
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

// TabState is one open tab in a pane (path only; history is not persisted).
type TabState struct {
	Path string `json:"path"`
}

// PaneTabs holds each pane's open tabs and which one is active.
type PaneTabs struct {
	Left        []TabState `json:"left"`
	LeftActive  int        `json:"leftActive"`
	Right       []TabState `json:"right"`
	RightActive int        `json:"rightActive"`
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
	ShowGitStatus           bool   `json:"showGitStatus"`
	UseBuiltInEditor        bool   `json:"useBuiltInEditor"`
	AutoCheckUpdates        bool   `json:"autoCheckUpdates"`
	UpdateCheckIntervalDays int    `json:"updateCheckIntervalDays"`
	LastUpdateCheckAt       string `json:"lastUpdateCheckAt"`    // RFC3339; empty if never
	SkippedUpdateVersion    string `json:"skippedUpdateVersion"` // remote version user skipped
	LeftPath                string `json:"leftPath"`
	RightPath               string `json:"rightPath"`
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
	ID             string   `json:"id"`
	Protocol       string   `json:"protocol"` // "ssh", future: "ftp", "sftp"
	User           string   `json:"user"`
	Host           string   `json:"host"`
	Port           int      `json:"port"`
	Label          string   `json:"label"`                    // display name; default user@host
	ConfigAlias    string   `json:"configAlias,omitempty"`    // ~/.ssh/config Host alias (re-resolved on connect)
	IdentityFiles  []string `json:"identityFiles,omitempty"`  // private key paths (also re-merged from config)
	DefaultWorkDir string   `json:"defaultWorkDir,omitempty"` // preferred ssh:// start path
}

// ActiveSession is a live remote connection for UI.
type ActiveSession struct {
	Key      string `json:"key"` // user@host:port
	Protocol string `json:"protocol"`
	User     string `json:"user"`
	Host     string `json:"host"`
	Port     int    `json:"port"`
	RootPath string `json:"rootPath"` // ssh://user@host:port/
}

// ConnectResult is returned after a successful SSH dial.
type ConnectResult struct {
	RootPath       string `json:"rootPath"`
	HomePath       string `json:"homePath"`                 // remote home or root
	Key            string `json:"key"`                      // session key user@host:port
	ProfileID      string `json:"profileId,omitempty"`      // saved profile id when known
	DefaultWorkDir string `json:"defaultWorkDir,omitempty"` // profile default start path if set
}

// SSHConfigHost is a host entry from an OpenSSH client config file.
type SSHConfigHost struct {
	Alias         string   `json:"alias"`
	HostName      string   `json:"hostName"`
	User          string   `json:"user"`
	Port          int      `json:"port"`
	IdentityFiles []string `json:"identityFiles"`
}

// RemoteRecent is a recently visited remote directory path.
type RemoteRecent struct {
	SessionKey  string `json:"sessionKey"`
	Path        string `json:"path"`        // ssh:// virtual path
	Label       string `json:"label"`       // remote abs path for display
	LastVisited string `json:"lastVisited"` // RFC3339
}

// AppName is used for config/data directories.
const AppName = "go-file-manager"
