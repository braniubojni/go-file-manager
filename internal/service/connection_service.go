package service

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
	"github.com/erikharutyunyan/go-file-manager/internal/remote"
	"github.com/erikharutyunyan/go-file-manager/internal/storage"
)

const kvConnections = "connections"
const kvHostKeys = "ssh_host_keys"

// ConnectionService manages remote connection profiles and SSH sessions.
type ConnectionService struct {
	db      *storage.DB
	manager *remote.Manager
}

// NewConnectionService creates the service. manager may be shared with FileService.
func NewConnectionService(db *storage.DB, manager *remote.Manager) *ConnectionService {
	return &ConnectionService{db: db, manager: manager}
}

// ListProfiles returns saved connection profiles.
func (s *ConnectionService) ListProfiles() ([]domain.ConnectionProfile, error) {
	return s.loadProfiles()
}

// AddProfile parses a connection string (e.g. "ssh user@host") and saves it.
func (s *ConnectionService) AddProfile(spec string) (domain.ConnectionProfile, error) {
	parsed, err := remote.ParseSpec(spec)
	if err != nil {
		return domain.ConnectionProfile{}, err
	}
	list, err := s.loadProfiles()
	if err != nil {
		return domain.ConnectionProfile{}, err
	}
	// Dedupe by user@host:port
	key := parsed.SessionKey()
	for _, p := range list {
		if fmt.Sprintf("%s@%s:%d", p.User, p.Host, p.Port) == key && p.Protocol == "ssh" {
			return p, nil
		}
	}
	p := domain.ConnectionProfile{
		ID:       fmt.Sprintf("conn-%d", time.Now().UnixNano()),
		Protocol: "ssh",
		User:     parsed.User,
		Host:     parsed.Host,
		Port:     parsed.Port,
		Label:    fmt.Sprintf("%s@%s", parsed.User, parsed.Host),
	}
	if parsed.Port != 22 {
		p.Label = fmt.Sprintf("%s@%s:%d", parsed.User, parsed.Host, parsed.Port)
	}
	list = append(list, p)
	if err := s.saveProfiles(list); err != nil {
		return domain.ConnectionProfile{}, err
	}
	return p, nil
}

// RemoveProfile deletes a saved profile by id.
func (s *ConnectionService) RemoveProfile(id string) error {
	list, err := s.loadProfiles()
	if err != nil {
		return err
	}
	out := list[:0]
	for _, p := range list {
		if p.ID != id {
			out = append(out, p)
		}
	}
	return s.saveProfiles(out)
}

// ConnectProfile connects using a saved profile. password may be empty (keys/agent).
// Returns start path for the active pane.
func (s *ConnectionService) ConnectProfile(id string, password string) (domain.ConnectResult, error) {
	list, err := s.loadProfiles()
	if err != nil {
		return domain.ConnectResult{}, err
	}
	var prof *domain.ConnectionProfile
	for i := range list {
		if list[i].ID == id {
			prof = &list[i]
			break
		}
	}
	if prof == nil {
		return domain.ConnectResult{}, fmt.Errorf("profile not found")
	}
	if prof.Protocol != "ssh" {
		return domain.ConnectResult{}, fmt.Errorf("protocol %s not implemented yet", prof.Protocol)
	}
	spec := remote.Spec{User: prof.User, Host: prof.Host, Port: prof.Port}
	return s.connectSpec(spec, password)
}

// ConnectSpec connects from a free-form string (optionally saves). password may be empty.
func (s *ConnectionService) ConnectSpec(specStr string, password string, save bool) (domain.ConnectResult, error) {
	parsed, err := remote.ParseSpec(specStr)
	if err != nil {
		return domain.ConnectResult{}, err
	}
	if save {
		if _, err := s.AddProfile(specStr); err != nil {
			return domain.ConnectResult{}, err
		}
	}
	return s.connectSpec(parsed, password)
}

// Disconnect closes the session for key or virtual path.
func (s *ConnectionService) Disconnect(keyOrPath string) error {
	return s.manager.Disconnect(keyOrPath)
}

// ListSessions returns live SSH sessions.
func (s *ConnectionService) ListSessions() []domain.ActiveSession {
	return s.manager.ListSessions()
}

// ParseSpec validates a connection string (for the Add dialog).
func (s *ConnectionService) ParseSpec(spec string) (domain.ConnectionProfile, error) {
	parsed, err := remote.ParseSpec(spec)
	if err != nil {
		return domain.ConnectionProfile{}, err
	}
	label := fmt.Sprintf("%s@%s", parsed.User, parsed.Host)
	if parsed.Port != 22 {
		label = fmt.Sprintf("%s@%s:%d", parsed.User, parsed.Host, parsed.Port)
	}
	return domain.ConnectionProfile{
		Protocol: "ssh",
		User:     parsed.User,
		Host:     parsed.Host,
		Port:     parsed.Port,
		Label:    label,
	}, nil
}

func (s *ConnectionService) connectSpec(spec remote.Spec, password string) (domain.ConnectResult, error) {
	if err := s.manager.Connect(spec, password); err != nil {
		return domain.ConnectResult{}, err
	}
	home, err := s.manager.HomePath(spec)
	if err != nil {
		home = spec.RootPath()
	}
	return domain.ConnectResult{
		RootPath: spec.RootPath(),
		HomePath: home,
		Key:      spec.SessionKey(),
	}, nil
}

func (s *ConnectionService) loadProfiles() ([]domain.ConnectionProfile, error) {
	raw, err := s.db.GetKV(kvConnections)
	if err != nil {
		return nil, err
	}
	if len(raw) == 0 {
		return []domain.ConnectionProfile{}, nil
	}
	var list []domain.ConnectionProfile
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	if list == nil {
		list = []domain.ConnectionProfile{}
	}
	return list, nil
}

func (s *ConnectionService) saveProfiles(list []domain.ConnectionProfile) error {
	if list == nil {
		list = []domain.ConnectionProfile{}
	}
	raw, err := json.Marshal(list)
	if err != nil {
		return err
	}
	return s.db.SetKV(kvConnections, raw)
}

// hostKeyStore adapts storage.DB to remote.HostKeyStore.
type hostKeyStore struct {
	db *storage.DB
}

func NewHostKeyStore(db *storage.DB) remote.HostKeyStore {
	return &hostKeyStore{db: db}
}

func (h *hostKeyStore) GetHostKey(hostPort string) (string, error) {
	m, err := h.load()
	if err != nil {
		return "", err
	}
	return m[hostPort], nil
}

func (h *hostKeyStore) SetHostKey(hostPort string, fingerprint string) error {
	m, err := h.load()
	if err != nil {
		return err
	}
	m[hostPort] = fingerprint
	raw, err := json.Marshal(m)
	if err != nil {
		return err
	}
	return h.db.SetKV(kvHostKeys, raw)
}

func (h *hostKeyStore) load() (map[string]string, error) {
	raw, err := h.db.GetKV(kvHostKeys)
	if err != nil {
		return nil, err
	}
	m := map[string]string{}
	if len(raw) == 0 {
		return m, nil
	}
	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// NewRemoteManager builds a remote.Manager with encrypted host-key TOFU store.
func NewRemoteManager(db *storage.DB) *remote.Manager {
	return remote.NewManager(NewHostKeyStore(db))
}

// IsAuthError reports whether the user should be prompted for a password.
func IsAuthError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "authentication required") ||
		strings.Contains(msg, "unable to authenticate") ||
		strings.Contains(msg, "no authentication methods")
}
