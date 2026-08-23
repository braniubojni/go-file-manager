//go:build !darwin && !linux && !windows

package volumes

import "github.com/erikharutyunyan/go-file-manager/internal/domain"

func listOS() ([]domain.Volume, error) {
	return nil, nil
}
