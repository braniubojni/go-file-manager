//go:build !darwin && !linux && !windows

package ports

import "github.com/erikharutyunyan/go-file-manager/internal/domain"

func ListProcesses() ([]domain.ProcessInfo, error) {
	return []domain.ProcessInfo{}, nil
}
