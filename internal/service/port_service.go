package service

import (
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/ports"
)

// PortService lists local TCP listeners and force-kills processes by PID.
type PortService struct{}

func NewPortService() *PortService {
	return &PortService{}
}

func (s *PortService) List() ([]domain.PortListener, error) {
	return ports.List()
}

func (s *PortService) Kill(pid int) error {
	return ports.Kill(pid)
}

func (s *PortService) KillAll(pids []int) error {
	return ports.KillAll(pids)
}
