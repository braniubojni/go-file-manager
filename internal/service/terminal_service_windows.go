//go:build windows

package service

import (
	"fmt"

	"github.com/wailsapp/wails/v3/pkg/application"
)

// TerminalService is a stub on Windows for now.
type TerminalService struct {
	app *application.App
}

func NewTerminalService() *TerminalService {
	return &TerminalService{}
}

func (t *TerminalService) SetApp(app *application.App) {
	t.app = app
}

func (t *TerminalService) Start(paneID, cwd string) error {
	return fmt.Errorf("interactive terminal is not yet supported on Windows")
}

func (t *TerminalService) Write(paneID, data string) error {
	return fmt.Errorf("interactive terminal is not yet supported on Windows")
}

func (t *TerminalService) Resize(paneID string, cols, rows int) error {
	return fmt.Errorf("interactive terminal is not yet supported on Windows")
}

func (t *TerminalService) Stop(paneID string) error {
	return nil
}

func (t *TerminalService) IsRunning(paneID string) bool {
	return false
}

func (t *TerminalService) SetCwd(paneID, cwd string) error {
	return nil
}
