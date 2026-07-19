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

// DB wraps the application SQLite database (bookmarks only).
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
