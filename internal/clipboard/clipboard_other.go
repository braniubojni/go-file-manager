//go:build !darwin && !linux && !windows

package clipboard

func Files() []string { return nil }

func PNG() []byte { return nil }
