package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
	"github.com/erikharutyunyan/go-file-manager/internal/remote"
)

// FileService exposes filesystem operations to the frontend.
type FileService struct {
	jobs   sync.Map // jobID -> *jobHandle
	jobSeq atomic.Uint64
	remote *remote.Manager
}

func NewFileService(remoteMgr *remote.Manager) *FileService {
	return &FileService{remote: remoteMgr}
}

type jobHandle struct {
	ctx    context.Context
	cancel context.CancelFunc
}

// NewJobID allocates a cancellable job context and returns its id.
func (s *FileService) NewJobID() string {
	id := fmt.Sprintf("job-%d", s.jobSeq.Add(1))
	ctx, cancel := context.WithCancel(context.Background())
	s.jobs.Store(id, &jobHandle{ctx: ctx, cancel: cancel})
	return id
}

func (s *FileService) jobCtx(jobID string) context.Context {
	if jobID == "" {
		return context.Background()
	}
	if v, ok := s.jobs.Load(jobID); ok {
		return v.(*jobHandle).ctx
	}
	return context.Background()
}

// CancelJob cancels a long-running Archive/Extract/DirChildSizes started with NewJobID.
func (s *FileService) CancelJob(jobID string) error {
	if jobID == "" {
		return nil
	}
	if v, ok := s.jobs.LoadAndDelete(jobID); ok {
		v.(*jobHandle).cancel()
	}
	return nil
}

// FinishJob releases a completed job (no-op if already cancelled).
func (s *FileService) FinishJob(jobID string) error {
	if jobID == "" {
		return nil
	}
	if v, ok := s.jobs.LoadAndDelete(jobID); ok {
		v.(*jobHandle).cancel()
	}
	return nil
}

func (s *FileService) ListDir(path string, showHidden bool) ([]domain.FileEntry, error) {
	if remote.IsRemote(path) {
		if s.remote == nil {
			return nil, fmt.Errorf("remote not available")
		}
		return s.remote.ListDir(path, showHidden)
	}
	return filesystem.ListDir(path, showHidden)
}

func (s *FileService) ListPathCompletions(partial string) ([]string, error) {
	if remote.IsRemote(partial) {
		// Minimal: no remote completions yet
		return []string{}, nil
	}
	return filesystem.ListPathCompletions(partial)
}

func (s *FileService) GetHomeDir() (string, error) {
	return filesystem.HomeDir()
}

func (s *FileService) Exists(path string) (bool, error) {
	if remote.IsRemote(path) {
		if s.remote == nil {
			return false, fmt.Errorf("remote not available")
		}
		return s.remote.Exists(path)
	}
	return filesystem.Exists(path)
}

func (s *FileService) Copy(sources []string, destDir string) error {
	if anyRemote(sources) || remote.IsRemote(destDir) {
		if !allRemote(sources) || !remote.IsRemote(destDir) {
			return fmt.Errorf("copy between local and remote is not supported yet")
		}
		return s.remote.CopyWithin(sources, destDir)
	}
	return filesystem.Copy(sources, destDir)
}

func (s *FileService) Move(sources []string, destDir string) error {
	if anyRemote(sources) || remote.IsRemote(destDir) {
		if !allRemote(sources) || !remote.IsRemote(destDir) {
			return fmt.Errorf("move between local and remote is not supported yet")
		}
		return s.remote.MoveWithin(sources, destDir)
	}
	return filesystem.Move(sources, destDir)
}

func (s *FileService) Delete(paths []string) error {
	if anyRemote(paths) {
		if !allRemote(paths) {
			return fmt.Errorf("mixed local/remote delete not supported")
		}
		return s.remote.Delete(paths)
	}
	return filesystem.Delete(paths)
}

func (s *FileService) Rename(oldPath, newName string) (string, error) {
	if remote.IsRemote(oldPath) {
		return s.remote.Rename(oldPath, newName)
	}
	return filesystem.Rename(oldPath, newName)
}

func (s *FileService) Mkdir(parent, name string) (string, error) {
	if remote.IsRemote(parent) {
		return s.remote.Mkdir(parent, name)
	}
	return filesystem.Mkdir(parent, name)
}

// CreateFile creates an empty file under parent (local only).
func (s *FileService) CreateFile(parent, name string) (string, error) {
	if remote.IsRemote(parent) {
		return "", fmt.Errorf("create file is not available on remote connections yet")
	}
	return filesystem.CreateFile(parent, name)
}

// ReadTextFile reads a local text file for the built-in editor.
func (s *FileService) ReadTextFile(path string) (string, error) {
	if remote.IsRemote(path) {
		return "", fmt.Errorf("built-in editor is not available on remote connections yet")
	}
	return filesystem.ReadTextFile(path)
}

// WriteTextFile writes a local text file from the built-in editor.
func (s *FileService) WriteTextFile(path, content string) error {
	if remote.IsRemote(path) {
		return fmt.Errorf("built-in editor is not available on remote connections yet")
	}
	return filesystem.WriteTextFile(path, content)
}

// SearchTree finds nested files/folders under root (local only; Go-to).
func (s *FileService) SearchTree(root, query string, showHidden bool, limit int) ([]domain.SearchHit, error) {
	if remote.IsRemote(root) {
		return nil, fmt.Errorf("go-to is not available on remote connections yet")
	}
	return filesystem.SearchTree(root, query, showHidden, limit)
}

// Open opens a path with the OS default application.
func (s *FileService) Open(path string) error {
	if remote.IsRemote(path) {
		return fmt.Errorf("open is not supported for remote paths yet")
	}
	return config.OpenInOS(path)
}

// DirChildSizes returns recursive sizes for immediate child directories.
// jobID from NewJobID enables CancelJob; empty jobID is non-cancellable.
func (s *FileService) DirChildSizes(jobID string, dir string) (map[string]int64, error) {
	defer func() { _ = s.FinishJob(jobID) }()
	if remote.IsRemote(dir) {
		return nil, fmt.Errorf("folder sizes not available on remote connections yet")
	}
	return filesystem.DirChildSizesCtx(s.jobCtx(jobID), dir)
}

func anyRemote(paths []string) bool {
	for _, p := range paths {
		if remote.IsRemote(p) {
			return true
		}
	}
	return false
}

func allRemote(paths []string) bool {
	if len(paths) == 0 {
		return false
	}
	for _, p := range paths {
		if !remote.IsRemote(p) {
			return false
		}
	}
	return true
}

// ListArchiveCreateFormats returns formats the create dialog can use.
func (s *FileService) ListArchiveCreateFormats() []string {
	return append([]string(nil), filesystem.CreateFormats...)
}

// Archive packs sources into destPath using format (zip, tar.gz, …).
// password enables traditional zip encryption when format is zip.
// jobID from NewJobID enables CancelJob; empty jobID is non-cancellable.
func (s *FileService) Archive(jobID string, sources []string, destPath, format, password string) error {
	defer func() { _ = s.FinishJob(jobID) }()
	if anyRemote(sources) || remote.IsRemote(destPath) {
		return fmt.Errorf("archive is not supported for remote paths yet")
	}
	return filesystem.Archive(s.jobCtx(jobID), sources, destPath, format, password)
}

// Extract unpacks archivePath into destDir. password for protected rar/7z/zip when needed.
// Does not finish the job — call FinishJob after multi-extract, or CancelJob.
func (s *FileService) Extract(jobID string, archivePath, destDir, password string) error {
	if remote.IsRemote(archivePath) || remote.IsRemote(destDir) {
		return fmt.Errorf("extract is not supported for remote paths yet")
	}
	return filesystem.Extract(s.jobCtx(jobID), archivePath, destDir, password)
}

// ArchiveExtension returns the extension for a create format.
func (s *FileService) ArchiveExtension(format string) string {
	return filesystem.ExtensionForFormat(format)
}
