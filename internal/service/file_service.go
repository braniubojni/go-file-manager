package service

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/erikharutyunyan/go-file-manager/internal/config"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
	"github.com/erikharutyunyan/go-file-manager/internal/remote"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// TrashMaxAge is how long an undoable delete stays on disk.
const TrashMaxAge = 24 * time.Hour

// FileService exposes filesystem operations to the frontend.
type FileService struct {
	jobs   sync.Map // jobID -> *jobHandle
	jobSeq atomic.Uint64
	remote *remote.Manager
	smb    *remote.SMBManager
	trash  *filesystem.Trash
	app    *application.App
}

type remoteBackend interface {
	ListDir(path string, showHidden bool) ([]domain.FileEntry, error)
	ListPathCompletions(partial string) ([]string, error)
	Exists(path string) (bool, error)
	CopyWithin(sources []string, destDir string) error
	MoveWithin(sources []string, destDir string) error
	Download(sources []string, destDir string) error
	Upload(sources []string, destDir string) error
	Delete(paths []string) error
	Rename(oldPath, newName string) (string, error)
	Mkdir(parent, name string) (string, error)
	ReadTextFile(path string) (string, error)
	WriteTextFile(path, content string) error
	DirChildSizesCtx(ctx context.Context, dir string) (domain.DirSizes, error)
}

func NewFileService(remoteMgr *remote.Manager, smbMgr *remote.SMBManager, trashDir string) *FileService {
	return &FileService{remote: remoteMgr, smb: smbMgr, trash: filesystem.NewTrash(trashDir)}
}

func (s *FileService) backendFor(path string) (remoteBackend, error) {
	if remote.IsSMB(path) {
		if s.smb == nil {
			return nil, fmt.Errorf("remote not available")
		}
		return s.smb, nil
	}
	if remote.IsRemote(path) {
		if s.remote == nil {
			return nil, fmt.Errorf("remote not available")
		}
		return s.remote, nil
	}
	return nil, fmt.Errorf("not a remote path")
}

// PurgeTrash drops undo batches older than TrashMaxAge (called at startup).
func (s *FileService) PurgeTrash() error {
	return s.trash.PurgeOlderThan(TrashMaxAge)
}

// SetApp injects the application for search event emission (call after application.New).
// Backend wiring only — not part of the frontend IPC surface.
//
//wails:ignore
func (s *FileService) SetApp(app *application.App) {
	s.app = app
}

func (s *FileService) emit(name string, data any) {
	if s.app != nil {
		s.app.Event.Emit(name, data)
	}
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
		be, err := s.backendFor(path)
		if err != nil {
			return nil, err
		}
		return be.ListDir(path, showHidden)
	}
	return filesystem.ListDir(path, showHidden)
}

func (s *FileService) ListPathCompletions(partial string) ([]string, error) {
	if remote.IsRemote(partial) {
		be, err := s.backendFor(partial)
		if err != nil {
			return nil, err
		}
		return be.ListPathCompletions(partial)
	}
	return filesystem.ListPathCompletions(partial)
}

func (s *FileService) GetHomeDir() (string, error) {
	return filesystem.HomeDir()
}

func (s *FileService) Exists(path string) (bool, error) {
	if remote.IsRemote(path) {
		be, err := s.backendFor(path)
		if err != nil {
			return false, err
		}
		return be.Exists(path)
	}
	return filesystem.Exists(path)
}

func (s *FileService) Copy(sources []string, destDir string) error {
	kind, err := transferKind(sources, destDir)
	if err != nil {
		return err
	}
	switch kind {
	case transferLocal:
		return filesystem.Copy(sources, destDir)
	case transferRemoteWithin:
		be, err := s.backendFor(destDir)
		if err != nil {
			return err
		}
		return be.CopyWithin(sources, destDir)
	case transferDownload:
		be, err := s.backendFor(sources[0])
		if err != nil {
			return err
		}
		return be.Download(sources, destDir)
	case transferUpload:
		be, err := s.backendFor(destDir)
		if err != nil {
			return err
		}
		return be.Upload(sources, destDir)
	default:
		return fmt.Errorf("unsupported copy")
	}
}

func (s *FileService) Move(sources []string, destDir string) error {
	kind, err := transferKind(sources, destDir)
	if err != nil {
		return err
	}
	switch kind {
	case transferLocal:
		return filesystem.Move(sources, destDir)
	case transferRemoteWithin:
		be, err := s.backendFor(destDir)
		if err != nil {
			return err
		}
		return be.MoveWithin(sources, destDir)
	case transferDownload:
		be, err := s.backendFor(sources[0])
		if err != nil {
			return err
		}
		if err := be.Download(sources, destDir); err != nil {
			return err
		}
		return be.Delete(sources)
	case transferUpload:
		be, err := s.backendFor(destDir)
		if err != nil {
			return err
		}
		if err := be.Upload(sources, destDir); err != nil {
			return err
		}
		return filesystem.Delete(sources)
	default:
		return fmt.Errorf("unsupported move")
	}
}

type xferKind int

const (
	transferLocal xferKind = iota
	transferRemoteWithin
	transferDownload // remote → local
	transferUpload   // local → remote
)

func transferKind(sources []string, destDir string) (xferKind, error) {
	if len(sources) == 0 {
		return 0, fmt.Errorf("no sources")
	}
	srcRemote := allRemote(sources)
	srcAnyRemote := anyRemote(sources)
	if srcAnyRemote && !srcRemote {
		return 0, fmt.Errorf("mixed local/remote selection is not supported")
	}
	destRemote := remote.IsRemote(destDir)
	if srcRemote && destRemote {
		scheme := remote.SchemeOf(destDir)
		for _, src := range sources {
			if remote.SchemeOf(src) != scheme {
				return 0, fmt.Errorf("cross-protocol copy not supported")
			}
		}
	}
	switch {
	case !srcRemote && !destRemote:
		return transferLocal, nil
	case srcRemote && destRemote:
		return transferRemoteWithin, nil
	case srcRemote && !destRemote:
		return transferDownload, nil
	case !srcRemote && destRemote:
		return transferUpload, nil
	default:
		return 0, fmt.Errorf("unsupported transfer")
	}
}

// Delete removes paths and returns an undo batch id. The id is empty when the
// delete cannot be undone: remote (SFTP has no trash) or a cross-volume path
// that had to be removed outright. The frontend only offers Undo for a non-empty id.
func (s *FileService) Delete(paths []string) (string, error) {
	if anyRemote(paths) {
		if !allRemote(paths) {
			return "", fmt.Errorf("mixed local/remote delete not supported")
		}
		scheme := remote.SchemeOf(paths[0])
		for _, p := range paths {
			if remote.SchemeOf(p) != scheme {
				return "", fmt.Errorf("cross-protocol delete not supported")
			}
		}
		be, err := s.backendFor(paths[0])
		if err != nil {
			return "", err
		}
		return "", be.Delete(paths)
	}
	return s.trash.MoveToTrash(paths)
}

// RestoreDeleted puts a delete batch back where it came from.
func (s *FileService) RestoreDeleted(batchID string) error {
	return s.trash.Restore(batchID)
}

func (s *FileService) Rename(oldPath, newName string) (string, error) {
	if remote.IsRemote(oldPath) {
		be, err := s.backendFor(oldPath)
		if err != nil {
			return "", err
		}
		return be.Rename(oldPath, newName)
	}
	return filesystem.Rename(oldPath, newName)
}

func (s *FileService) Mkdir(parent, name string) (string, error) {
	if remote.IsRemote(parent) {
		be, err := s.backendFor(parent)
		if err != nil {
			return "", err
		}
		return be.Mkdir(parent, name)
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

// ReadTextFile reads a text file for the built-in editor (local or remote).
func (s *FileService) ReadTextFile(path string) (string, error) {
	if remote.IsRemote(path) {
		be, err := s.backendFor(path)
		if err != nil {
			return "", err
		}
		return be.ReadTextFile(path)
	}
	return filesystem.ReadTextFile(path)
}

// WriteTextFile writes a text file from the built-in editor (local or remote).
func (s *FileService) WriteTextFile(path, content string) error {
	if remote.IsRemote(path) {
		be, err := s.backendFor(path)
		if err != nil {
			return err
		}
		return be.WriteTextFile(path, content)
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

// StartSearch runs a cancellable content or folder-name search and streams
// events: search:hit, search:denied, search:done, search:error.
// jobID should come from NewJobID. Mode is domain.SearchModeContent or SearchModeFolders.
func (s *FileService) StartSearch(
	jobID, root, query, mode, include, exclude string,
	caseSensitive, showHidden bool,
	limit int,
) error {
	if remote.IsRemote(root) {
		return fmt.Errorf("search is not available on remote connections yet")
	}
	if jobID == "" {
		return fmt.Errorf("jobID required")
	}
	ctx := s.jobCtx(jobID)
	go s.runSearch(ctx, jobID, root, query, mode, include, exclude, caseSensitive, showHidden, limit)
	return nil
}

func (s *FileService) runSearch(
	ctx context.Context,
	jobID, root, query, mode, include, exclude string,
	caseSensitive, showHidden bool,
	limit int,
) {
	defer func() { _ = s.FinishJob(jobID) }()

	if mode == "" {
		mode = domain.SearchModeContent
	}
	var (
		truncated   bool
		err         error
		hitCount    int
		deniedCount int
	)

	onDenied := func(path string, derr error) {
		deniedCount++
		msg := ""
		if derr != nil {
			msg = derr.Error()
		}
		s.emit("search:denied", domain.SearchDeniedPayload{
			JobID: jobID,
			Path:  path,
			Error: msg,
		})
	}

	switch mode {
	case domain.SearchModeFolders:
		truncated, err = filesystem.SearchFolders(ctx, root, query, include, exclude, showHidden, limit, filesystem.FolderSearchCallbacks{
			OnHit: func(h domain.SearchHit) {
				hitCount++
				cp := h
				s.emit("search:hit", domain.SearchHitPayload{
					JobID:  jobID,
					Mode:   domain.SearchModeFolders,
					Folder: &cp,
				})
			},
			OnDenied: onDenied,
		})
	default:
		truncated, err = filesystem.SearchContent(ctx, root, query, include, exclude, showHidden, caseSensitive, limit, filesystem.ContentSearchCallbacks{
			OnHit: func(h domain.ContentSearchHit) {
				hitCount++
				cp := h
				s.emit("search:hit", domain.SearchHitPayload{
					JobID:   jobID,
					Mode:    domain.SearchModeContent,
					Content: &cp,
				})
			},
			OnDenied: onDenied,
		})
	}

	if err != nil && ctx.Err() == nil {
		s.emit("search:error", domain.SearchErrorPayload{JobID: jobID, Error: err.Error()})
		return
	}
	s.emit("search:done", domain.SearchDonePayload{
		JobID:       jobID,
		Truncated:   truncated,
		HitCount:    hitCount,
		DeniedCount: deniedCount,
	})
}

// ReplaceOccurrence replaces one content match at path:line:column.
func (s *FileService) ReplaceOccurrence(path, find, replace string, line, column int, caseSensitive bool) error {
	if remote.IsRemote(path) {
		return fmt.Errorf("replace is not available on remote connections yet")
	}
	return filesystem.ReplaceOccurrence(path, find, replace, line, column, caseSensitive)
}

// ReplaceAllInPaths replaces find with replace in each path (all occurrences per file).
func (s *FileService) ReplaceAllInPaths(paths []string, find, replace string, caseSensitive bool) (domain.ReplaceAllResult, error) {
	for _, p := range paths {
		if remote.IsRemote(p) {
			return domain.ReplaceAllResult{}, fmt.Errorf("replace is not available on remote connections yet")
		}
	}
	files, reps, err := filesystem.ReplaceAllInPaths(paths, find, replace, caseSensitive)
	if err != nil {
		return domain.ReplaceAllResult{}, err
	}
	return domain.ReplaceAllResult{FilesChanged: files, Replacements: reps}, nil
}

// OpenPrivacySettings opens OS privacy / full-disk access settings when possible.
func (s *FileService) OpenPrivacySettings() error {
	return config.OpenPrivacySettings()
}

// OpenLocalNetworkSettings opens OS Local Network / firewall settings when possible.
func (s *FileService) OpenLocalNetworkSettings() error {
	return config.OpenLocalNetworkSettings()
}

// Open opens a path with the OS default application.
func (s *FileService) Open(path string) error {
	if remote.IsRemote(path) {
		return fmt.Errorf("open is not supported for remote paths yet")
	}
	return config.OpenInOS(path)
}

// DirChildSizes returns recursive sizes for immediate child directories, plus
// the children that could not be fully read (permission denied).
// jobID from NewJobID enables CancelJob; empty jobID is non-cancellable.
func (s *FileService) DirChildSizes(jobID string, dir string) (domain.DirSizes, error) {
	defer func() { _ = s.FinishJob(jobID) }()
	if remote.IsRemote(dir) {
		be, err := s.backendFor(dir)
		if err != nil {
			return domain.DirSizes{}, err
		}
		return be.DirChildSizesCtx(s.jobCtx(jobID), dir)
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
