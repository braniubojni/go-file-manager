package remote

import (
	"fmt"
	"net"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

// Virtual path form: ssh://user@host:port/abs/path
// Port is always present after normalize (default 22).

var (
	// ssh user@host, ssh user@host:port, user@host, user@host:port
	specRe = regexp.MustCompile(`(?i)^(?:ssh\s+)?([^@\s]+)@([^@:\s]+)(?::(\d+))?$`)
)

// Spec is a parsed SSH connection target.
type Spec struct {
	User string
	Host string
	Port int
}

// SessionKey returns user@host:port.
func (s Spec) SessionKey() string {
	return fmt.Sprintf("%s@%s:%d", s.User, s.Host, s.Port)
}

// RootPath returns ssh://user@host:port/
func (s Spec) RootPath() string {
	return fmt.Sprintf("ssh://%s@%s:%d/", s.User, s.Host, s.Port)
}

// JoinPath builds ssh://user@host:port/remotePath (remotePath must be absolute).
func (s Spec) JoinPath(remotePath string) string {
	p := remotePath
	if p == "" {
		p = "/"
	}
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	// Collapse //
	for strings.Contains(p, "//") {
		p = strings.ReplaceAll(p, "//", "/")
	}
	return fmt.Sprintf("ssh://%s@%s:%d%s", s.User, s.Host, s.Port, p)
}

// ParseSpec parses "ssh user@host", "user@host:22", etc.
func ParseSpec(input string) (Spec, error) {
	raw := strings.TrimSpace(input)
	if raw == "" {
		return Spec{}, fmt.Errorf("empty connection string")
	}
	// Allow full URL form as input too
	if strings.HasPrefix(strings.ToLower(raw), "ssh://") {
		loc, err := ParseLocation(raw)
		if err != nil {
			return Spec{}, err
		}
		return loc.Spec, nil
	}
	m := specRe.FindStringSubmatch(raw)
	if m == nil {
		return Spec{}, fmt.Errorf("invalid format; use: ssh username@host or username@host:port")
	}
	port := 22
	if m[3] != "" {
		p, err := strconv.Atoi(m[3])
		if err != nil || p <= 0 || p > 65535 {
			return Spec{}, fmt.Errorf("invalid port")
		}
		port = p
	}
	return Spec{User: m[1], Host: m[2], Port: port}, nil
}

// Location is a remote virtual path split into session + remote filesystem path.
type Location struct {
	Spec
	RemotePath string // absolute path on remote, e.g. /home/user
}

// IsRemote reports whether path is an ssh:// virtual path.
func IsRemote(path string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(path)), "ssh://")
}

// ParseLocation parses ssh://user@host:port/path
func ParseLocation(path string) (Location, error) {
	raw := strings.TrimSpace(path)
	if raw == "" {
		return Location{}, fmt.Errorf("empty path")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return Location{}, fmt.Errorf("invalid remote path: %w", err)
	}
	if !strings.EqualFold(u.Scheme, "ssh") {
		return Location{}, fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	user := ""
	if u.User != nil {
		user = u.User.Username()
	}
	if user == "" {
		return Location{}, fmt.Errorf("missing user in remote path")
	}
	host := u.Hostname()
	if host == "" {
		return Location{}, fmt.Errorf("missing host in remote path")
	}
	port := 22
	if p := u.Port(); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil || n <= 0 {
			return Location{}, fmt.Errorf("invalid port")
		}
		port = n
	}
	rp := u.Path
	if rp == "" {
		rp = "/"
	}
	// url.Path may be unescaped; keep as-is for SFTP
	return Location{
		Spec:       Spec{User: user, Host: host, Port: port},
		RemotePath: rp,
	}, nil
}

// ParentRemote returns parent of a remote location path.
func ParentRemote(loc Location) Location {
	p := strings.TrimRight(loc.RemotePath, "/")
	if p == "" || p == "/" {
		loc.RemotePath = "/"
		return loc
	}
	i := strings.LastIndex(p, "/")
	if i <= 0 {
		loc.RemotePath = "/"
		return loc
	}
	loc.RemotePath = p[:i]
	if loc.RemotePath == "" {
		loc.RemotePath = "/"
	}
	return loc
}

// DialAddr returns host:port for net.Dial.
func (s Spec) DialAddr() string {
	return net.JoinHostPort(s.Host, strconv.Itoa(s.Port))
}
