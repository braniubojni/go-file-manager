package remote

import (
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

// HostKeyStore loads/saves TOFU host key fingerprints (base64 SHA256).
type HostKeyStore interface {
	GetHostKey(hostPort string) (string, error)
	SetHostKey(hostPort string, fingerprint string) error
}

// Manager holds live SSH+SFTP sessions.
type Manager struct {
	mu       sync.Mutex
	sessions map[string]*Session // SessionKey
	keys     HostKeyStore
}

// Session is one connected SSH host.
type Session struct {
	Spec   Spec
	client *ssh.Client
	sftp   *sftp.Client
}

// NewManager creates a session manager. keys may be nil (accept all first-seen; no persist).
func NewManager(keys HostKeyStore) *Manager {
	return &Manager{
		sessions: make(map[string]*Session),
		keys:     keys,
	}
}

// Connect dials SSH and opens SFTP. password may be empty (try keys/agent first).
func (m *Manager) Connect(spec Spec, password string) error {
	if spec.Port <= 0 {
		spec.Port = 22
	}
	key := spec.SessionKey()

	m.mu.Lock()
	if existing, ok := m.sessions[key]; ok {
		m.mu.Unlock()
		// already connected
		_ = existing
		return nil
	}
	m.mu.Unlock()

	auth := buildAuthMethods(spec.User, password)
	if len(auth) == 0 {
		return fmt.Errorf("no authentication methods available; provide a password")
	}

	cfg := &ssh.ClientConfig{
		User:            spec.User,
		Auth:            auth,
		HostKeyCallback: m.hostKeyCallback(spec),
		Timeout:         15 * time.Second,
	}

	conn, err := ssh.Dial("tcp", spec.DialAddr(), cfg)
	if err != nil {
		// Common password hint
		if password == "" && strings.Contains(err.Error(), "unable to authenticate") {
			return fmt.Errorf("authentication required: %w", err)
		}
		return fmt.Errorf("ssh dial %s: %w", spec.DialAddr(), err)
	}

	sftpClient, err := sftp.NewClient(conn)
	if err != nil {
		_ = conn.Close()
		return fmt.Errorf("sftp: %w", err)
	}

	sess := &Session{Spec: spec, client: conn, sftp: sftpClient}

	m.mu.Lock()
	// Close race-created duplicate
	if old, ok := m.sessions[key]; ok {
		m.mu.Unlock()
		_ = sftpClient.Close()
		_ = conn.Close()
		_ = old
		return nil
	}
	m.sessions[key] = sess
	m.mu.Unlock()
	return nil
}

// Disconnect closes a session by key (user@host:port) or any path under that host.
func (m *Manager) Disconnect(keyOrPath string) error {
	key := keyOrPath
	if IsRemote(keyOrPath) {
		loc, err := ParseLocation(keyOrPath)
		if err != nil {
			return err
		}
		key = loc.SessionKey()
	}
	m.mu.Lock()
	sess, ok := m.sessions[key]
	if ok {
		delete(m.sessions, key)
	}
	m.mu.Unlock()
	if !ok {
		return nil
	}
	_ = sess.sftp.Close()
	return sess.client.Close()
}

// ListSessions returns active session keys.
func (m *Manager) ListSessions() []domain.ActiveSession {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := make([]domain.ActiveSession, 0, len(m.sessions))
	for _, s := range m.sessions {
		out = append(out, domain.ActiveSession{
			Key:      s.Spec.SessionKey(),
			Protocol: "ssh",
			User:     s.Spec.User,
			Host:     s.Spec.Host,
			Port:     s.Spec.Port,
			RootPath: s.Spec.RootPath(),
		})
	}
	return out
}

// CloseAll closes every session (app shutdown).
func (m *Manager) CloseAll() {
	m.mu.Lock()
	defer m.mu.Unlock()
	for k, s := range m.sessions {
		_ = s.sftp.Close()
		_ = s.client.Close()
		delete(m.sessions, k)
	}
}

func (m *Manager) get(loc Location) (*Session, error) {
	key := loc.SessionKey()
	m.mu.Lock()
	s, ok := m.sessions[key]
	m.mu.Unlock()
	if !ok {
		return nil, fmt.Errorf("not connected to %s; connect first", key)
	}
	return s, nil
}

// HomePath returns remote home directory as virtual path, or root.
func (m *Manager) HomePath(spec Spec) (string, error) {
	loc := Location{Spec: spec, RemotePath: "."}
	s, err := m.get(loc)
	if err != nil {
		return "", err
	}
	wd, err := s.sftp.Getwd()
	if err != nil || wd == "" {
		return spec.RootPath(), nil
	}
	if !strings.HasPrefix(wd, "/") {
		wd = "/" + wd
	}
	return spec.JoinPath(wd), nil
}

// ListDir lists a remote directory (virtual path).
func (m *Manager) ListDir(vpath string, showHidden bool) ([]domain.FileEntry, error) {
	loc, err := ParseLocation(vpath)
	if err != nil {
		return nil, err
	}
	s, err := m.get(loc)
	if err != nil {
		return nil, err
	}
	rp := loc.RemotePath
	if rp == "" {
		rp = "/"
	}
	entries, err := s.sftp.ReadDir(rp)
	if err != nil {
		return nil, fmt.Errorf("list %s: %w", rp, err)
	}

	result := make([]domain.FileEntry, 0, len(entries)+1)
	// Parent ".."
	if rp != "/" {
		parent := ParentRemote(loc)
		result = append(result, domain.FileEntry{
			Name:  "..",
			Path:  parent.JoinPath(parent.RemotePath),
			IsDir: true,
		})
	}

	for _, e := range entries {
		name := e.Name()
		if !showHidden && strings.HasPrefix(name, ".") {
			continue
		}
		child := path.Join(rp, name)
		if !strings.HasPrefix(child, "/") {
			child = "/" + child
		}
		mode := e.Mode()
		isDir := e.IsDir()
		// Follow symlink type for listing convenience
		if mode&os.ModeSymlink != 0 {
			if st, err := s.sftp.Stat(child); err == nil {
				isDir = st.IsDir()
			}
		}
		ext := ""
		if !isDir {
			ext = strings.TrimPrefix(filepath.Ext(name), ".")
		}
		result = append(result, domain.FileEntry{
			Name:      name,
			Path:      loc.JoinPath(child),
			IsDir:     isDir,
			Size:      e.Size(),
			ModTime:   e.ModTime().UnixMilli(),
			Ext:       ext,
			IsSymlink: mode&os.ModeSymlink != 0,
		})
	}
	return result, nil
}

// Exists checks a virtual path.
func (m *Manager) Exists(vpath string) (bool, error) {
	loc, err := ParseLocation(vpath)
	if err != nil {
		return false, err
	}
	s, err := m.get(loc)
	if err != nil {
		return false, err
	}
	_, err = s.sftp.Stat(loc.RemotePath)
	if err == nil {
		return true, nil
	}
	if os.IsNotExist(err) {
		return false, nil
	}
	// sftp may wrap
	if strings.Contains(err.Error(), "not exist") || strings.Contains(err.Error(), "no such file") {
		return false, nil
	}
	return false, err
}

// Mkdir creates a directory under parent virtual path.
func (m *Manager) Mkdir(parentV, name string) (string, error) {
	loc, err := ParseLocation(parentV)
	if err != nil {
		return "", err
	}
	s, err := m.get(loc)
	if err != nil {
		return "", err
	}
	name = strings.TrimSpace(name)
	if name == "" || strings.Contains(name, "/") || strings.Contains(name, "\\") {
		return "", fmt.Errorf("invalid name")
	}
	full := path.Join(loc.RemotePath, name)
	if err := s.sftp.Mkdir(full); err != nil {
		return "", err
	}
	return loc.JoinPath(full), nil
}

// Rename renames a remote entry (newName is basename only).
func (m *Manager) Rename(oldV, newName string) (string, error) {
	loc, err := ParseLocation(oldV)
	if err != nil {
		return "", err
	}
	s, err := m.get(loc)
	if err != nil {
		return "", err
	}
	newName = strings.TrimSpace(newName)
	if newName == "" || strings.ContainsAny(newName, `/\`) {
		return "", fmt.Errorf("invalid name")
	}
	dir := path.Dir(loc.RemotePath)
	next := path.Join(dir, newName)
	if err := s.sftp.Rename(loc.RemotePath, next); err != nil {
		return "", err
	}
	return loc.JoinPath(next), nil
}

// Delete removes remote paths (files or recursive dirs).
func (m *Manager) Delete(paths []string) error {
	for _, p := range paths {
		loc, err := ParseLocation(p)
		if err != nil {
			return err
		}
		s, err := m.get(loc)
		if err != nil {
			return err
		}
		if err := removeAll(s.sftp, loc.RemotePath); err != nil {
			return err
		}
	}
	return nil
}

func removeAll(c *sftp.Client, p string) error {
	st, err := c.Stat(p)
	if err != nil {
		return err
	}
	if !st.IsDir() {
		return c.Remove(p)
	}
	entries, err := c.ReadDir(p)
	if err != nil {
		return err
	}
	for _, e := range entries {
		if err := removeAll(c, path.Join(p, e.Name())); err != nil {
			return err
		}
	}
	return c.RemoveDirectory(p)
}

// CopyWithin copies sources into destDir on the same host (remote only).
func (m *Manager) CopyWithin(sources []string, destDir string) error {
	dloc, err := ParseLocation(destDir)
	if err != nil {
		return err
	}
	ds, err := m.get(dloc)
	if err != nil {
		return err
	}
	for _, src := range sources {
		sloc, err := ParseLocation(src)
		if err != nil {
			return err
		}
		if sloc.SessionKey() != dloc.SessionKey() {
			return fmt.Errorf("cross-host copy not supported")
		}
		base := path.Base(sloc.RemotePath)
		dest := path.Join(dloc.RemotePath, base)
		if err := copyRemote(ds.sftp, sloc.RemotePath, dest); err != nil {
			return err
		}
	}
	return nil
}

// MoveWithin moves sources into destDir on the same host.
func (m *Manager) MoveWithin(sources []string, destDir string) error {
	dloc, err := ParseLocation(destDir)
	if err != nil {
		return err
	}
	ds, err := m.get(dloc)
	if err != nil {
		return err
	}
	for _, src := range sources {
		sloc, err := ParseLocation(src)
		if err != nil {
			return err
		}
		if sloc.SessionKey() != dloc.SessionKey() {
			return fmt.Errorf("cross-host move not supported")
		}
		base := path.Base(sloc.RemotePath)
		dest := path.Join(dloc.RemotePath, base)
		if err := ds.sftp.Rename(sloc.RemotePath, dest); err != nil {
			// fallback copy+delete for cross-device
			if err2 := copyRemote(ds.sftp, sloc.RemotePath, dest); err2 != nil {
				return err
			}
			if err2 := removeAll(ds.sftp, sloc.RemotePath); err2 != nil {
				return err2
			}
		}
	}
	return nil
}

func copyRemote(c *sftp.Client, src, dst string) error {
	st, err := c.Stat(src)
	if err != nil {
		return err
	}
	if st.IsDir() {
		if err := c.MkdirAll(dst); err != nil {
			return err
		}
		entries, err := c.ReadDir(src)
		if err != nil {
			return err
		}
		for _, e := range entries {
			if err := copyRemote(c, path.Join(src, e.Name()), path.Join(dst, e.Name())); err != nil {
				return err
			}
		}
		return nil
	}
	in, err := c.Open(src)
	if err != nil {
		return err
	}
	defer func() { _ = in.Close() }()
	out, err := c.Create(dst)
	if err != nil {
		return err
	}
	defer func() { _ = out.Close() }()
	if _, err = io.Copy(out, in); err != nil {
		return err
	}
	return out.Close()
}

func buildAuthMethods(user, password string) []ssh.AuthMethod {
	var methods []ssh.AuthMethod

	// SSH agent
	if sock := os.Getenv("SSH_AUTH_SOCK"); sock != "" {
		if ag, err := net.Dial("unix", sock); err == nil {
			methods = append(methods, ssh.PublicKeysCallback(agent.NewClient(ag).Signers))
		}
	}

	// Default private keys
	home, _ := os.UserHomeDir()
	if home != "" {
		for _, name := range []string{"id_ed25519", "id_rsa", "id_ecdsa"} {
			keyPath := filepath.Join(home, ".ssh", name)
			if m := publicKeyFile(keyPath); m != nil {
				methods = append(methods, m)
			}
		}
	}

	if password != "" {
		methods = append(methods, ssh.Password(password))
		// keyboard-interactive common for some servers
		methods = append(methods, ssh.KeyboardInteractive(func(name, instruction string, questions []string, echos []bool) ([]string, error) {
			answers := make([]string, len(questions))
			for i := range questions {
				answers[i] = password
			}
			return answers, nil
		}))
	}

	_ = user
	return methods
}

func publicKeyFile(path string) ssh.AuthMethod {
	key, err := os.ReadFile(path)
	if err != nil {
		return nil
	}
	signer, err := ssh.ParsePrivateKey(key)
	if err != nil {
		// encrypted key without passphrase — skip
		return nil
	}
	return ssh.PublicKeys(signer)
}

func (m *Manager) hostKeyCallback(spec Spec) ssh.HostKeyCallback {
	hostPort := spec.DialAddr()
	return func(hostname string, remote net.Addr, key ssh.PublicKey) error {
		fp := fingerprint(key)
		if m.keys != nil {
			stored, err := m.keys.GetHostKey(hostPort)
			if err == nil && stored != "" {
				if stored != fp {
					return fmt.Errorf("host key mismatch for %s (possible MITM)", hostPort)
				}
				return nil
			}
			// TOFU: store first seen
			_ = m.keys.SetHostKey(hostPort, fp)
			return nil
		}
		// No store: accept first key (dev / tests)
		_ = hostname
		_ = remote
		return nil
	}
}

func fingerprint(key ssh.PublicKey) string {
	return key.Type() + " " + base64.StdEncoding.EncodeToString(key.Marshal())
}
