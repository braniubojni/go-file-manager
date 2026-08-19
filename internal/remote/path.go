package remote

import (
	"fmt"
	"net"
	"net/url"
	"regexp"
	"strconv"
	"strings"
)

// Virtual path forms:
//
//	ssh://user@host:port/abs/path
//	smb://user@host:port/Share/path
//
// Port is always present after normalize (ssh default 22, smb default 445).

var (
	// ssh user@host, ssh user@host:port, user@host, user@host:port
	specRe = regexp.MustCompile(`(?i)^(?:ssh\s+)?([^@\s]+)@([^@:\s]+)(?::(\d+))?$`)
	// host or user@host[:port] after an "smb" prefix
	smbSpecRe = regexp.MustCompile(`(?i)^(?:([^@\s]*)@)?([^@:\s]+)(?::(\d+))?$`)
)

// Spec is a parsed remote connection target (SSH or SMB).
type Spec struct {
	Scheme        string // "ssh" (default) or "smb"
	User          string
	Host          string
	Port          int
	Domain        string   // SMB NTLM domain
	IdentityFiles []string // private key paths to try (e.g. from SSH config IdentityFile)
	ConfigAlias   string   // optional ~/.ssh/config Host alias used for re-resolve
	ConfigFile    string   // optional ssh -F path (when host came from a non-default config)
}

func (s Spec) scheme() string {
	if strings.EqualFold(s.Scheme, "smb") {
		return "smb"
	}
	return "ssh"
}

// IsSMB reports whether this spec targets SMB.
func (s Spec) IsSMB() bool { return s.scheme() == "smb" }

func (s Spec) defaultPort() int {
	if s.IsSMB() {
		return 445
	}
	return 22
}

// SessionKey returns user@host:port for SSH, or smb:user@host:port for SMB.
func (s Spec) SessionKey() string {
	if s.IsSMB() {
		return fmt.Sprintf("smb:%s@%s:%d", s.User, s.Host, s.Port)
	}
	return fmt.Sprintf("%s@%s:%d", s.User, s.Host, s.Port)
}

// RootPath returns scheme://user@host:port/ (user omitted when empty).
func (s Spec) RootPath() string {
	return s.JoinPath("/")
}

// JoinPath builds scheme://user@host:port/remotePath (remotePath must be absolute).
// Host authority uses net.JoinHostPort so IPv6 literals are bracketed.
func (s Spec) JoinPath(remotePath string) string {
	p := remotePath
	if p == "" {
		p = "/"
	}
	if !strings.HasPrefix(p, "/") {
		p = "/" + p
	}
	for strings.Contains(p, "//") {
		p = strings.ReplaceAll(p, "//", "/")
	}
	authority := net.JoinHostPort(s.Host, strconv.Itoa(s.Port))
	if s.User != "" {
		authority = s.User + "@" + authority
	}
	return fmt.Sprintf("%s://%s%s", s.scheme(), authority, p)
}

// ParseSpec parses "ssh user@host", "user@host:22", an SSH config Host alias,
// or an SMB target ("smb://user@host", "smb host", "smb:user@host:445").
func ParseSpec(input string) (Spec, error) {
	raw := strings.TrimSpace(input)
	if raw == "" {
		return Spec{}, fmt.Errorf("empty connection string")
	}
	if isSMBInput(raw) {
		return parseSMBSpec(raw)
	}
	// Allow full URL form as input too
	if strings.HasPrefix(strings.ToLower(raw), "ssh://") {
		loc, err := ParseLocation(raw)
		if err != nil {
			return Spec{}, err
		}
		return EnrichSpec(loc.Spec), nil
	}
	m := specRe.FindStringSubmatch(raw)
	if m != nil {
		port := 22
		if m[3] != "" {
			p, err := strconv.Atoi(m[3])
			if err != nil || p <= 0 || p > 65535 {
				return Spec{}, fmt.Errorf("invalid port")
			}
			port = p
		}
		return EnrichSpec(Spec{Scheme: "ssh", User: m[1], Host: m[2], Port: port}), nil
	}
	// Bare token: treat as ~/.ssh/config Host alias (e.g. "pahestain")
	if !strings.ContainsAny(raw, " @/") {
		if h, ok := LookupSSHConfigHost(raw); ok {
			return SpecFromSSHConfigHost(h), nil
		}
	}
	return Spec{}, fmt.Errorf("invalid format; use: ssh user@host, user@host:port, smb://host, or an SSH config Host alias")
}

func isSMBInput(raw string) bool {
	lower := strings.ToLower(strings.TrimSpace(raw))
	return strings.HasPrefix(lower, "smb://") ||
		strings.HasPrefix(lower, "smb:") ||
		strings.HasPrefix(lower, "smb ")
}

func parseSMBSpec(raw string) (Spec, error) {
	raw = strings.TrimSpace(raw)
	if strings.HasPrefix(strings.ToLower(raw), "smb://") {
		loc, err := ParseLocation(raw)
		if err != nil {
			return Spec{}, err
		}
		return loc.Spec, nil
	}
	rest := raw
	if strings.HasPrefix(strings.ToLower(rest), "smb:") {
		rest = strings.TrimSpace(rest[4:])
	} else if strings.HasPrefix(strings.ToLower(rest), "smb ") {
		rest = strings.TrimSpace(rest[4:])
	}
	if rest == "" {
		return Spec{}, fmt.Errorf("invalid smb target; use: smb://host, smb user@host, or smb host")
	}
	m := smbSpecRe.FindStringSubmatch(rest)
	if m == nil {
		return Spec{}, fmt.Errorf("invalid smb target; use: smb://host, smb user@host, or smb host")
	}
	user, domain := splitDomainUser(m[1])
	port := 445
	if m[3] != "" {
		p, err := strconv.Atoi(m[3])
		if err != nil || p <= 0 || p > 65535 {
			return Spec{}, fmt.Errorf("invalid port")
		}
		port = p
	}
	return Spec{Scheme: "smb", User: user, Host: m[2], Port: port, Domain: domain}, nil
}

func splitDomainUser(user string) (name, domain string) {
	user = strings.TrimSpace(user)
	if user == "" {
		return "", ""
	}
	if i := strings.IndexAny(user, `\/`); i > 0 {
		return user[i+1:], user[:i]
	}
	// Windows UPN: user@CORP.LOCAL
	if i := strings.LastIndex(user, "@"); i > 0 && i < len(user)-1 {
		return user[:i], user[i+1:]
	}
	return user, ""
}

// Location is a remote virtual path split into session + remote filesystem path.
type Location struct {
	Spec
	RemotePath string // absolute path on remote, e.g. /home/user or /Share/folder
}

// IsRemote reports whether path is an ssh:// or smb:// virtual path.
func IsRemote(path string) bool {
	return IsSSH(path) || IsSMB(path)
}

// IsSSH reports whether path is an ssh:// virtual path.
func IsSSH(path string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(path)), "ssh://")
}

// IsSMB reports whether path is an smb:// virtual path.
func IsSMB(path string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(path)), "smb://")
}

// SchemeOf returns "ssh", "smb", or "" for a path.
func SchemeOf(path string) string {
	switch {
	case IsSMB(path):
		return "smb"
	case IsSSH(path):
		return "ssh"
	default:
		return ""
	}
}

// ParseLocation parses ssh://user@host:port/path or smb://[user@]host[:port]/Share/path.
func ParseLocation(path string) (Location, error) {
	raw := strings.TrimSpace(path)
	if raw == "" {
		return Location{}, fmt.Errorf("empty path")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return Location{}, fmt.Errorf("invalid remote path: %w", err)
	}
	scheme := strings.ToLower(u.Scheme)
	if scheme != "ssh" && scheme != "smb" {
		return Location{}, fmt.Errorf("unsupported scheme %q", u.Scheme)
	}
	user := ""
	if u.User != nil {
		user = u.User.Username()
	}
	if scheme == "ssh" && user == "" {
		return Location{}, fmt.Errorf("missing user in remote path")
	}
	host := u.Hostname()
	if host == "" {
		return Location{}, fmt.Errorf("missing host in remote path")
	}
	port := 22
	if scheme == "smb" {
		port = 445
	}
	if p := u.Port(); p != "" {
		n, err := strconv.Atoi(p)
		if err != nil || n <= 0 {
			return Location{}, fmt.Errorf("invalid port")
		}
		port = n
	}
	name, domain := splitDomainUser(user)
	if q := u.Query().Get("domain"); q != "" {
		domain = q
	}
	rp := u.Path
	if rp == "" {
		rp = "/"
	}
	return Location{
		Spec: Spec{
			Scheme: scheme,
			User:   name,
			Host:   host,
			Port:   port,
			Domain: domain,
		},
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

// ShareName is the first path segment of an SMB location, or "".
func (loc Location) ShareName() string {
	if !loc.IsSMB() {
		return ""
	}
	p := strings.Trim(loc.RemotePath, "/")
	if p == "" {
		return ""
	}
	if i := strings.Index(p, "/"); i >= 0 {
		return p[:i]
	}
	return p
}

// PathOnShare is the path inside the SMB share (`.`, `folder`, `folder/file`).
func (loc Location) PathOnShare() string {
	if !loc.IsSMB() {
		return loc.RemotePath
	}
	share := loc.ShareName()
	if share == "" {
		return "."
	}
	p := strings.TrimPrefix(loc.RemotePath, "/")
	rest := strings.TrimPrefix(p, share)
	rest = strings.TrimPrefix(rest, "/")
	if rest == "" {
		return "."
	}
	return rest
}
