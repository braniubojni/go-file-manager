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
	// Access is "full" | "readonly" | "partial" | "none", or "" when unknown.
	// Remote (SFTP) entries are always "": Windows OpenSSH reports a constant
	// mode for everything, so the bits would be a lie. Remote access is instead
	// discovered by operations that actually get denied — see DirSizes.Denied.
	Access string `json:"access"`
}

// DirSizes is the result of a recursive child-size calculation. Denied lists the
// child directories the walk could not fully read, so the UI can mark them
// rather than silently reporting an undercount.
type DirSizes struct {
	Sizes  map[string]int64 `json:"sizes"`
	Denied []string         `json:"denied"`
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

// Search mode values for Find-in-files dialog.
const (
	SearchModeContent = "content"
	SearchModeFolders = "folders"
)

// ContentSearchHit is one text match inside a file.
type ContentSearchHit struct {
	Path       string `json:"path"`
	RelPath    string `json:"relPath"`
	Line       int    `json:"line"`       // 1-based
	Column     int    `json:"column"`     // 1-based start of match
	LineText   string `json:"lineText"`   // single line preview
	MatchStart int    `json:"matchStart"` // 0-based rune/byte index in LineText
	MatchEnd   int    `json:"matchEnd"`   // exclusive
}

// SearchPrefs is the last Find-in-files dialog state (persisted).
type SearchPrefs struct {
	Query         string `json:"query"`
	Replace       string `json:"replace"`
	Include       string `json:"include"`
	Exclude       string `json:"exclude"`
	Mode          string `json:"mode"` // content | folders
	ReplaceOpen   bool   `json:"replaceOpen"`
	CaseSensitive bool   `json:"caseSensitive"`
}

// SearchDonePayload is emitted when a streaming search finishes.
type SearchDonePayload struct {
	JobID       string `json:"jobId"`
	Truncated   bool   `json:"truncated"`
	HitCount    int    `json:"hitCount"`
	DeniedCount int    `json:"deniedCount"`
}

// SearchHitPayload wraps a streaming search hit for the UI.
type SearchHitPayload struct {
	JobID   string            `json:"jobId"`
	Mode    string            `json:"mode"` // content | folders
	Content *ContentSearchHit `json:"content,omitempty"`
	Folder  *SearchHit        `json:"folder,omitempty"`
}

// SearchDeniedPayload is one path the walker could not open.
type SearchDeniedPayload struct {
	JobID string `json:"jobId"`
	Path  string `json:"path"`
	Error string `json:"error"`
}

// SearchErrorPayload is a fatal search failure.
type SearchErrorPayload struct {
	JobID string `json:"jobId"`
	Error string `json:"error"`
}

// ReplaceAllRequest replaces find with replace across paths (content mode).
type ReplaceAllRequest struct {
	Paths         []string `json:"paths"`
	Find          string   `json:"find"`
	Replace       string   `json:"replace"`
	CaseSensitive bool     `json:"caseSensitive"`
}

// ReplaceAllResult summarizes a batch replace.
type ReplaceAllResult struct {
	FilesChanged int `json:"filesChanged"`
	Replacements int `json:"replacements"`
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
	ConfigPath    string   `json:"configPath,omitempty"` // absolute path of the file this entry was read from
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
