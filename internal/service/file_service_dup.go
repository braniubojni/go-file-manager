package service

import (
	"context"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
	"github.com/erikharutyunyan/go-file-manager/internal/remote"
)

func dupLog(jobID, msg string, args ...any) {
	log.Printf("[dup] job=%s "+msg, append([]any{jobID}, args...)...)
}

func (s *FileService) tryStartDup(jobID string) error {
	s.dupMu.Lock()
	defer s.dupMu.Unlock()
	if s.dupJob != "" {
		return fmt.Errorf("a duplicates job is already running")
	}
	s.dupJob = jobID
	return nil
}

func (s *FileService) clearDupJob(jobID string) {
	s.dupMu.Lock()
	defer s.dupMu.Unlock()
	if s.dupJob == jobID {
		s.dupJob = ""
	}
}

func (s *FileService) dupRunning() bool {
	s.dupMu.Lock()
	defer s.dupMu.Unlock()
	return s.dupJob != ""
}

func (s *FileService) trashRootLocal() string {
	if s == nil || s.trash == nil {
		return ""
	}
	return s.trash.Root()
}

func (s *FileService) megaCacheDir() string {
	if s != nil && s.dupCacheDir != "" {
		return s.dupCacheDir
	}
	return os.TempDir()
}

func (s *FileService) validateDupRoot(root string) error {
	if strings.TrimSpace(root) == "" {
		return fmt.Errorf("root path is required")
	}
	if !remote.IsRemote(root) && filesystem.IsArchivePath(root) {
		return fmt.Errorf("duplicate scan is not available inside archives")
	}
	if _, err := s.ListDir(root, true); err != nil {
		return err
	}
	return nil
}

func (s *FileService) listForDup(root string) (listDirFunc, error) {
	if s.listDup != nil {
		return s.listDup, nil
	}
	if remote.IsRemote(root) {
		be, err := s.backendFor(root)
		if err != nil {
			return nil, err
		}
		return be.ListDir, nil
	}
	return filesystem.ListDir, nil
}

func (s *FileService) hashPath(ctx context.Context, jobID, path string) (string, error) {
	if s.hashFile != nil {
		return s.hashFile(ctx, path)
	}
	ctx = remote.WithDupJobID(ctx, jobID)
	switch remote.SchemeOf(path) {
	case "mega":
		return s.mega.HashFile(ctx, path, s.megaCacheDir())
	case "smb", "ssh":
		be, err := s.backendFor(path)
		if err != nil {
			return "", err
		}
		r, err := be.OpenRead(path)
		if err != nil {
			return "", err
		}
		return filesystem.HashReader(ctx, r)
	default:
		return filesystem.HashFile(ctx, path)
	}
}

// EstimateDuplicateScan counts files and bytes under root without hashing.
func (s *FileService) EstimateDuplicateScan(root string, includeHidden bool, minSize int64, exclude string) (domain.ScanEstimate, error) {
	if s.dupRunning() {
		return domain.ScanEstimate{}, fmt.Errorf("a duplicates job is already running")
	}
	if err := s.validateDupRoot(root); err != nil {
		return domain.ScanEstimate{}, err
	}
	list, err := s.listForDup(root)
	if err != nil {
		return domain.ScanEstimate{}, err
	}
	trash := ""
	if !remote.IsRemote(root) {
		trash = s.trashRootLocal()
	}
	files, _, err := walkForDuplicates(context.Background(), list, root, includeHidden, minSize, trash, exclude)
	if err != nil {
		return domain.ScanEstimate{}, err
	}
	var bytes int64
	for _, f := range files {
		bytes += f.Size
	}
	proto := scanProtocol(root)
	return domain.ScanEstimate{
		FileCount:    int64(len(files)),
		ByteCount:    bytes,
		EtaSeconds:   etaSeconds(bytes, proto),
		Protocol:     proto,
		MegaDownload: proto == "mega",
	}, nil
}

// StartDuplicateScan runs a cancellable SHA-256 duplicate scan in the background.
func (s *FileService) StartDuplicateScan(jobID, root string, includeHidden bool, minSize int64, exclude string) error {
	if jobID == "" {
		return fmt.Errorf("jobID required")
	}
	if err := s.validateDupRoot(root); err != nil {
		return err
	}
	if err := s.tryStartDup(jobID); err != nil {
		return err
	}
	ctx := remote.WithDupJobID(s.storeJob(jobID), jobID)
	dupLog(jobID, "start root=%q hidden=%v minSize=%d exclude=%q", root, includeHidden, minSize, exclude)
	go s.runDuplicateScan(ctx, jobID, root, includeHidden, minSize, exclude)
	return nil
}

func (s *FileService) runDuplicateScan(ctx context.Context, jobID, root string, includeHidden bool, minSize int64, exclude string) {
	defer func() { _ = s.FinishJob(jobID) }()
	defer s.clearDupJob(jobID)

	var collected []domain.DuplicateGroup
	finish := func(path string, err error) {
		msg := ""
		if err != nil {
			msg = err.Error()
			if ctx.Err() != nil {
				dupLog(jobID, "cancel received")
			}
			dupLog(jobID, "fatal path=%s err=%s", path, msg)
			s.emit("dup:error", domain.DupErrorPayload{
				JobID:   jobID,
				Path:    path,
				Message: msg,
				Fatal:   true,
			})
		} else {
			dupLog(jobID, "done groups=%d", len(collected))
		}
		s.emit("dup:done", domain.DupDonePayload{JobID: jobID, Error: msg, Groups: collected})
	}

	if err := ctx.Err(); err != nil {
		finish(root, err)
		return
	}
	list, err := s.listForDup(root)
	if err != nil {
		finish(root, err)
		return
	}
	trash := ""
	if !remote.IsRemote(root) {
		trash = s.trashRootLocal()
	}
	files, skipped, err := walkForDuplicates(ctx, list, root, includeHidden, minSize, trash, exclude)
	if err != nil {
		finish(root, err)
		return
	}

	proto := scanProtocol(root)
	var totalBytes int64
	for _, f := range files {
		totalBytes += f.Size
	}
	totalFiles := int64(len(files))
	groups := 0
	skipN := len(skipped)
	var doneFiles, doneBytes int64
	progress := func(path string) {
		s.emit("dup:progress", domain.DupProgressPayload{
			JobID:       jobID,
			DoneFiles:   doneFiles,
			TotalFiles:  totalFiles,
			DoneBytes:   doneBytes,
			TotalBytes:  totalBytes,
			Groups:      groups,
			Skipped:     skipN,
			CurrentPath: path,
		})
	}
	dupLog(jobID, "progress totals files=%d bytes=%d", totalFiles, totalBytes)
	progress(root)
	for _, sk := range skipped {
		s.emit("dup:error", domain.DupErrorPayload{
			JobID:   jobID,
			Path:    sk.Path,
			Message: sk.Reason,
			Fatal:   false,
		})
	}

	buckets := map[int64][]dupFile{}
	for _, f := range files {
		buckets[f.Size] = append(buckets[f.Size], f)
	}
	var toHash [][]dupFile
	for _, bucket := range buckets {
		if len(bucket) < 2 {
			for _, f := range bucket {
				doneFiles++
				doneBytes += f.Size
			}
			continue
		}
		toHash = append(toHash, bucket)
	}
	lastEmit := time.Time{}
	tick := func(path string, force bool) {
		now := time.Now()
		if !force && !lastEmit.IsZero() && now.Sub(lastEmit) < 100*time.Millisecond {
			return
		}
		lastEmit = now
		progress(path)
	}
	tick(root, true)

	for _, bucket := range toHash {
		if err := ctx.Err(); err != nil {
			finish(root, err)
			return
		}
		byHash := map[string][]dupFile{}
		for _, f := range bucket {
			if err := ctx.Err(); err != nil {
				finish(f.Path, err)
				return
			}
			sum, herr := s.hashPath(ctx, jobID, f.Path)
			if herr != nil {
				if ctx.Err() != nil || isDupFatalErr(herr) {
					finish(f.Path, herr)
					return
				}
				skipN++
				s.emit("dup:error", domain.DupErrorPayload{
					JobID:   jobID,
					Path:    f.Path,
					Message: herr.Error(),
					Fatal:   false,
				})
				doneFiles++
				doneBytes += f.Size
				tick(f.Path, false)
				continue
			}
			byHash[sum] = append(byHash[sum], f)
			doneFiles++
			doneBytes += f.Size
			tick(f.Path, false)
		}
		for h, members := range byHash {
			if len(members) < 2 {
				continue
			}
			sort.Slice(members, func(i, j int) bool { return members[i].Path < members[j].Path })
			g := domain.DuplicateGroup{Hash: h, Size: members[0].Size}
			for _, m := range members {
				g.Files = append(g.Files, domain.DuplicateFile{
					Path:     m.Path,
					Name:     m.Name,
					Size:     m.Size,
					ModTime:  m.ModTime,
					Protocol: proto,
				})
			}
			groups++
			collected = append(collected, g)
			tick(members[0].Path, false)
		}
	}
	tick(root, true)
	finish("", nil)
}
