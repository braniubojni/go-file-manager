package ports

import (
	"sort"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

func sortListeners(out []domain.PortListener) {
	sort.Slice(out, func(i, j int) bool {
		if out[i].Port != out[j].Port {
			return out[i].Port < out[j].Port
		}
		return out[i].PID < out[j].PID
	})
}
