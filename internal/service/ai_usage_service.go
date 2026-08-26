package service

import (
	"github.com/erikharutyunyan/go-file-manager/internal/aiusage"
	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// AIUsageService reports quota snapshots for locally installed AI coding-agent CLIs.
type AIUsageService struct{}

func NewAIUsageService() *AIUsageService {
	return &AIUsageService{}
}

func (s *AIUsageService) List() ([]domain.AIUsage, error) {
	return aiusage.List(), nil
}
