//go:build linux

package clipboard

import "os/exec"

func Files() []string {
	out, err := exec.Command("wl-paste", "-t", "text/uri-list").Output()
	if err != nil {
		out, err = exec.Command("xclip", "-selection", "clipboard", "-t", "text/uri-list", "-o").Output()
		if err != nil {
			return nil
		}
	}
	return parseURIList(string(out))
}

func PNG() []byte {
	out, err := exec.Command("wl-paste", "-t", "image/png").Output()
	if err != nil {
		out, err = exec.Command("xclip", "-selection", "clipboard", "-t", "image/png", "-o").Output()
		if err != nil {
			return nil
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}
