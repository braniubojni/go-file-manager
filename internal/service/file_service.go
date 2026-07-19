package service

import (
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/filesystem"
)

// FileService exposes filesystem operations to the frontend.
type FileService struct{}

func NewFileService() *FileService {
	return &FileService{}
}

func (s *FileService) ListDir(path string) ([]domain.FileEntry, error) {
	return filesystem.ListDir(path)
}

func (s *FileService) GetHomeDir() (string, error) {
	return filesystem.HomeDir()
}

func (s *FileService) Exists(path string) (bool, error) {
	return filesystem.Exists(path)
}

func (s *FileService) Copy(sources []string, destDir string) error {
	return filesystem.Copy(sources, destDir)
}

func (s *FileService) Move(sources []string, destDir string) error {
	return filesystem.Move(sources, destDir)
}

func (s *FileService) Delete(paths []string) error {
	return filesystem.Delete(paths)
}

func (s *FileService) Rename(oldPath, newName string) (string, error) {
	return filesystem.Rename(oldPath, newName)
}

func (s *FileService) Mkdir(parent, name string) (string, error) {
	return filesystem.Mkdir(parent, name)
}
