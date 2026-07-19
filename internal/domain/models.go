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

// Setting keys persisted in SQLite.
const (
	SettingLeftPath  = "left_path"
	SettingRightPath = "right_path"
	SettingTheme     = "theme"
)
