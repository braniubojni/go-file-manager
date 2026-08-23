package ports

import (
	"encoding/csv"
	"strconv"
	"strings"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// parseLsofF parses `lsof -nP -iTCP -sTCP:LISTEN -F cPn` output.
func parseLsofF(s string) []domain.PortListener {
	var pid int
	var cmd, proto string
	var out []domain.PortListener
	for _, line := range strings.Split(s, "\n") {
		if line == "" {
			continue
		}
		tag, val := line[0], line[1:]
		switch tag {
		case 'p':
			pid, _ = strconv.Atoi(val)
			cmd, proto = "", ""
		case 'c':
			cmd = val
		case 'P':
			proto = strings.ToLower(val)
		case 'n':
			if proto != "" && proto != "tcp" {
				continue
			}
			port := parseAddrPort(val)
			if pid > 0 && port > 0 {
				out = append(out, domain.PortListener{
					Port: port, PID: pid, Process: cmd, Proto: "tcp",
				})
			}
		}
	}
	return Dedup(out)
}

func parseAddrPort(name string) int {
	name = strings.TrimSpace(name)
	if i := strings.Index(name, "->"); i >= 0 {
		name = name[:i]
	}
	if i := strings.IndexAny(name, " \t"); i >= 0 {
		name = name[:i]
	}
	name = strings.TrimSpace(name)
	i := strings.LastIndex(name, ":")
	if i < 0 || i+1 >= len(name) {
		return 0
	}
	p, err := strconv.Atoi(name[i+1:])
	if err != nil || p <= 0 || p > 65535 {
		return 0
	}
	return p
}

// parseNetstatANO parses `netstat -ano -p tcp` (Windows) LISTENING rows.
func parseNetstatANO(s string) []domain.PortListener {
	var out []domain.PortListener
	for _, line := range strings.Split(s, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 5 {
			continue
		}
		if !strings.EqualFold(fields[0], "TCP") {
			continue
		}
		state := strings.ToUpper(fields[len(fields)-2])
		if state != "LISTENING" {
			continue
		}
		pid, err := strconv.Atoi(fields[len(fields)-1])
		if err != nil || pid <= 0 {
			continue
		}
		port := parseAddrPort(fields[1])
		if port <= 0 {
			continue
		}
		out = append(out, domain.PortListener{
			Port: port, PID: pid, Proto: "tcp",
		})
	}
	return Dedup(out)
}

func parseTasklistCSV(s string) map[int]string {
	out := make(map[int]string)
	r := csv.NewReader(strings.NewReader(s))
	rows, err := r.ReadAll()
	if err != nil {
		return out
	}
	for _, row := range rows {
		if len(row) < 2 {
			continue
		}
		pid, err := strconv.Atoi(strings.TrimSpace(row[1]))
		if err != nil || pid <= 0 {
			continue
		}
		name := strings.TrimSpace(row[0])
		name = strings.TrimSuffix(name, ".exe")
		name = strings.TrimSuffix(name, ".EXE")
		out[pid] = name
	}
	return out
}

// Dedup keeps one row per port+PID, sorted by port then PID.
func Dedup(in []domain.PortListener) []domain.PortListener {
	type key struct{ port, pid int }
	seen := make(map[key]struct{}, len(in))
	out := make([]domain.PortListener, 0, len(in))
	for _, l := range in {
		k := key{l.Port, l.PID}
		if _, ok := seen[k]; ok {
			continue
		}
		seen[k] = struct{}{}
		if l.Proto == "" {
			l.Proto = "tcp"
		}
		out = append(out, l)
	}
	sortListeners(out)
	return out
}
