package service

import (
	"fmt"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

func (s *FileService) ListVolumes() ([]domain.Volume, error) {
	if s.vols == nil {
		return nil, nil
	}
	return s.vols.List()
}

func (s *FileService) UnmountVolume(path string) error {
	if s.vols == nil {
		return fmt.Errorf("volumes not available")
	}
	if err := s.vols.Unmount(path); err != nil {
		return err
	}
	s.emit("volumes:changed", map[string]any{})
	return nil
}

func (s *FileService) AttachDiskImage(path string) (string, error) {
	if s.vols == nil {
		return "", fmt.Errorf("volumes not available")
	}
	mp, err := s.vols.AttachDiskImage(path)
	if err != nil {
		return "", err
	}
	s.emit("volumes:changed", map[string]any{})
	return mp, nil
}

func (s *FileService) rewriteDMGParent(path string, entries []domain.FileEntry) {
	if s.vols == nil || len(entries) == 0 {
		return
	}
	parent := s.vols.ParentOverride(path)
	if parent == "" {
		return
	}
	for i := range entries {
		if entries[i].Name == ".." {
			entries[i].Path = parent
		}
	}
}
