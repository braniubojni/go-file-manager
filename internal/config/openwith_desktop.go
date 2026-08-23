package config

import "strings"

type desktopApp struct {
	ID        string
	Name      string
	MimeTypes []string
}

// parseDesktopEntry returns a launchable Application entry, or false if the
// file should be ignored (non-app, hidden, or missing name).
func parseDesktopEntry(id, content string) (desktopApp, bool) {
	app := desktopApp{ID: id}
	inEntry := false
	hidden := false
	noDisplay := false
	typ := ""
	for raw := range strings.SplitSeq(content, "\n") {
		line := strings.TrimSpace(raw)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "[") {
			inEntry = line == "[Desktop Entry]"
			continue
		}
		if !inEntry {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.TrimSpace(val)
		switch key {
		case "Name":
			app.Name = val
		case "MimeType":
			app.MimeTypes = splitDesktopMimes(val)
		case "Type":
			typ = val
		case "Hidden":
			hidden = strings.EqualFold(val, "true")
		case "NoDisplay":
			noDisplay = strings.EqualFold(val, "true")
		}
	}
	if hidden || noDisplay || typ != "Application" || app.Name == "" {
		return desktopApp{}, false
	}
	return app, true
}

func splitDesktopMimes(val string) []string {
	parts := strings.Split(val, ";")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

func desktopMatchesMIME(listed []string, fileMIME string) bool {
	fileMIME = strings.ToLower(strings.TrimSpace(fileMIME))
	if fileMIME == "" {
		return false
	}
	for _, m := range listed {
		m = strings.ToLower(strings.TrimSpace(m))
		if m == "" {
			continue
		}
		if m == fileMIME || m == "*/*" {
			return true
		}
		if strings.HasSuffix(m, "/*") {
			prefix := strings.TrimSuffix(m, "/*")
			if prefix != "" && strings.HasPrefix(fileMIME, prefix+"/") {
				return true
			}
		}
	}
	return false
}
