//go:build darwin || linux

package ports

import (
	"errors"
	"fmt"
	"os/exec"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// List returns local TCP listeners (lsof).
func List() ([]domain.PortListener, error) {
	cmd := exec.Command("lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-F", "cPn")
	out, err := cmd.Output()
	if err != nil {
		var ee *exec.ExitError
		if errors.As(err, &ee) && len(out) == 0 {
			return []domain.PortListener{}, nil
		}
		if errors.Is(err, exec.ErrNotFound) {
			return nil, fmt.Errorf("lsof not found (install lsof to use Port killer): %w", err)
		}
		if len(out) == 0 {
			return nil, fmt.Errorf("lsof: %w", err)
		}
	}
	return parseLsofF(string(out)), nil
}
