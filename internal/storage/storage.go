package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	_ "modernc.org/sqlite"
)

// DB wraps the application SQLite database.
type DB struct {
	sql *sql.DB
}

// Open creates (if needed) and migrates the app database under the user config dir.
func Open(appName string) (*DB, error) {
	cfg, err := os.UserConfigDir()
	if err != nil {
		return nil, err
	}
	dir := filepath.Join(cfg, appName)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "app.db")
	return OpenPath(path)
}

// OpenPath opens a SQLite database at an explicit path (useful for tests).
func OpenPath(path string) (*DB, error) {
	sqlDB, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1)
	db := &DB{sql: sqlDB}
	if err := db.migrate(); err != nil {
		_ = sqlDB.Close()
		return nil, err
	}
	return db, nil
}

// Close closes the database.
func (db *DB) Close() error {
	if db == nil || db.sql == nil {
		return nil
	}
	return db.sql.Close()
}

func (db *DB) migrate() error {
	_, err := db.sql.Exec(`
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  path       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
`)
	return err
}

// GetSetting returns a setting value (empty string if missing).
func (db *DB) GetSetting(key string) (string, error) {
	var value string
	err := db.sql.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&value)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return value, err
}

// SetSetting upserts a setting.
func (db *DB) SetSetting(key, value string) error {
	_, err := db.sql.Exec(`
INSERT INTO settings(key, value) VALUES(?, ?)
ON CONFLICT(key) DO UPDATE SET value = excluded.value
`, key, value)
	return err
}

// GetAllSettings returns all settings as a map.
func (db *DB) GetAllSettings() (map[string]string, error) {
	rows, err := db.sql.Query(`SELECT key, value FROM settings`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		out[k] = v
	}
	return out, rows.Err()
}

// GetPanePaths returns saved left/right paths.
func (db *DB) GetPanePaths() (domain.PanePaths, error) {
	left, err := db.GetSetting(domain.SettingLeftPath)
	if err != nil {
		return domain.PanePaths{}, err
	}
	right, err := db.GetSetting(domain.SettingRightPath)
	if err != nil {
		return domain.PanePaths{}, err
	}
	return domain.PanePaths{Left: left, Right: right}, nil
}

// SavePanePaths persists left/right paths.
func (db *DB) SavePanePaths(left, right string) error {
	if err := db.SetSetting(domain.SettingLeftPath, left); err != nil {
		return err
	}
	return db.SetSetting(domain.SettingRightPath, right)
}

// ListBookmarks returns bookmarks ordered by sort_order then id.
func (db *DB) ListBookmarks() ([]domain.Bookmark, error) {
	rows, err := db.sql.Query(`
SELECT id, name, path, sort_order, created_at
FROM bookmarks
ORDER BY sort_order ASC, id ASC
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Bookmark
	for rows.Next() {
		var b domain.Bookmark
		if err := rows.Scan(&b.ID, &b.Name, &b.Path, &b.SortOrder, &b.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, b)
	}
	if list == nil {
		list = []domain.Bookmark{}
	}
	return list, rows.Err()
}

// AddBookmark inserts a bookmark.
func (db *DB) AddBookmark(name, path string) (domain.Bookmark, error) {
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := db.sql.Exec(`
INSERT INTO bookmarks(name, path, sort_order, created_at)
VALUES(?, ?, COALESCE((SELECT MAX(sort_order)+1 FROM bookmarks), 0), ?)
`, name, path, now)
	if err != nil {
		return domain.Bookmark{}, fmt.Errorf("add bookmark: %w", err)
	}
	id, _ := res.LastInsertId()
	return domain.Bookmark{
		ID:        id,
		Name:      name,
		Path:      path,
		SortOrder: 0,
		CreatedAt: now,
	}, nil
}

// RemoveBookmark deletes a bookmark by id.
func (db *DB) RemoveBookmark(id int64) error {
	_, err := db.sql.Exec(`DELETE FROM bookmarks WHERE id = ?`, id)
	return err
}
