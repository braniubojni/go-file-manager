//go:build !darwin && !linux && !windows

package ports

import "github.com/erikharutyunyan/go-file-manager/internal/domain"

func List() ([]domain.PortListener, error) {
	return []domain.PortListener{}, nil
}
