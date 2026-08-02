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

// AddProfile parses a connection string (e.g. "ssh user@host" or config alias) and saves it.
func (s *ConnectionService) AddProfile(spec string) (domain.ConnectionProfile, error) {
	parsed, err := remote.ParseSpec(spec)
	if err != nil {
		return domain.ConnectionProfile{}, err
	}
	parsed = remote.EnrichSpec(parsed)
	list, err := s.loadProfiles()
	if err != nil {
		return domain.ConnectionProfile{}, err
	}
	key := parsed.SessionKey()
	for _, p := range list {
		if fmt.Sprintf("%s@%s:%d", p.User, p.Host, p.Port) == key && p.Protocol == "ssh" {
			return p, nil
		}
	}
	p := profileFromSpec(parsed, "")
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

// SetProfileDefaultWorkDir stores the preferred start path for a saved profile.
func (s *ConnectionService) SetProfileDefaultWorkDir(profileID, vpath string) error {
	profileID = strings.TrimSpace(profileID)
	if profileID == "" {
		return fmt.Errorf("profile id required")
	}
	if !remote.IsRemote(vpath) {
		return fmt.Errorf("default workdir must be a remote ssh:// path")
	}
	list, err := s.loadProfiles()
	if err != nil {
		return err
	}
	found := false
	for i := range list {
		if list[i].ID == profileID {
			list[i].DefaultWorkDir = vpath
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("profile not found")
	}
	return s.saveProfiles(list)
}

// ConnectProfile connects using a saved profile. password may be empty (keys/agent).
// password is also tried as a private-key passphrase.
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
	spec := remote.Spec{
		User:          prof.User,
		Host:          prof.Host,
		Port:          prof.Port,
		IdentityFiles: append([]string(nil), prof.IdentityFiles...),
		ConfigAlias:   prof.ConfigAlias,
	}
	// Re-resolve ~/.ssh/config on every connect (IdentityFile may change)
	spec = remote.EnrichSpec(spec)
	// Persist refreshed identity files back when they changed
	if !stringSlicesEqual(prof.IdentityFiles, spec.IdentityFiles) ||
		(spec.ConfigAlias != "" && prof.ConfigAlias == "") {
		for i := range list {
			if list[i].ID == id {
				list[i].IdentityFiles = append([]string(nil), spec.IdentityFiles...)
				if list[i].ConfigAlias == "" {
					list[i].ConfigAlias = spec.ConfigAlias
				}
				_ = s.saveProfiles(list)
				break
			}
		}
	}
	res, err := s.connectSpec(spec, password)
	if err != nil {
		return domain.ConnectResult{}, err
	}
	res.ProfileID = prof.ID
	res.DefaultWorkDir = prof.DefaultWorkDir
	return res, nil
}

// ConnectSpec connects from a free-form string (optionally saves). password may be empty.
func (s *ConnectionService) ConnectSpec(specStr string, password string, save bool) (domain.ConnectResult, error) {
	parsed, err := remote.ParseSpec(specStr)
	if err != nil {
		return domain.ConnectResult{}, err
	}
	parsed = remote.EnrichSpec(parsed)
	var profileID string
	if save {
		p, err := s.upsertProfileFromSpec(parsed, "")
		if err != nil {
			return domain.ConnectResult{}, err
		}
		profileID = p.ID
	}
	res, err := s.connectSpec(parsed, password)
	if err != nil {
		return domain.ConnectResult{}, err
	}
	res.ProfileID = profileID
	if profileID != "" {
		if p, ok := s.findProfile(profileID); ok {
			res.DefaultWorkDir = p.DefaultWorkDir
		}
	}
	return res, nil
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
	parsed = remote.EnrichSpec(parsed)
	return profileFromSpec(parsed, ""), nil
}

func (s *ConnectionService) connectSpec(spec remote.Spec, password string) (domain.ConnectResult, error) {
	spec = remote.EnrichSpec(spec)
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

func (s *ConnectionService) findProfile(id string) (domain.ConnectionProfile, bool) {
	list, err := s.loadProfiles()
	if err != nil {
		return domain.ConnectionProfile{}, false
	}
	for _, p := range list {
		if p.ID == id {
			return p, true
		}
	}
	return domain.ConnectionProfile{}, false
}

func profileFromSpec(spec remote.Spec, label string) domain.ConnectionProfile {
	if label == "" {
		if spec.ConfigAlias != "" {
			label = spec.ConfigAlias
		} else {
			label = fmt.Sprintf("%s@%s", spec.User, spec.Host)
			if spec.Port != 22 {
				label = fmt.Sprintf("%s@%s:%d", spec.User, spec.Host, spec.Port)
			}
		}
	}
	return domain.ConnectionProfile{
		ID:            fmt.Sprintf("conn-%d", time.Now().UnixNano()),
		Protocol:      "ssh",
		User:          spec.User,
		Host:          spec.Host,
		Port:          spec.Port,
		Label:         label,
		ConfigAlias:   spec.ConfigAlias,
		IdentityFiles: append([]string(nil), spec.IdentityFiles...),
	}
}

func (s *ConnectionService) upsertProfileFromSpec(spec remote.Spec, label string) (domain.ConnectionProfile, error) {
	list, err := s.loadProfiles()
	if err != nil {
		return domain.ConnectionProfile{}, err
	}
	key := spec.SessionKey()
	for i, p := range list {
		if fmt.Sprintf("%s@%s:%d", p.User, p.Host, p.Port) == key && p.Protocol == "ssh" {
			// Refresh identity / alias metadata
			list[i].IdentityFiles = mergeUniqueStrings(list[i].IdentityFiles, spec.IdentityFiles)
			if list[i].ConfigAlias == "" && spec.ConfigAlias != "" {
				list[i].ConfigAlias = spec.ConfigAlias
			}
			if label != "" {
				list[i].Label = label
			}
			if err := s.saveProfiles(list); err != nil {
				return domain.ConnectionProfile{}, err
			}
			return list[i], nil
		}
	}
	p := profileFromSpec(spec, label)
	list = append(list, p)
	if err := s.saveProfiles(list); err != nil {
		return domain.ConnectionProfile{}, err
	}
	return p, nil
}

func mergeUniqueStrings(a, b []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, s := range append(append([]string{}, a...), b...) {
		s = strings.TrimSpace(s)
		if s == "" || seen[s] {
			continue
		}
		seen[s] = true
		out = append(out, s)
	}
	return out
}

func stringSlicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
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

// IsAuthError reports whether the user should be prompted for a password / key passphrase.
func IsAuthError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "authentication required") ||
		strings.Contains(msg, "unable to authenticate") ||
		strings.Contains(msg, "no authentication methods") ||
		strings.Contains(msg, "public key auth failed") ||
		strings.Contains(msg, "passphrase")
}

// DefaultSSHConfigPaths returns the standard OpenSSH client config file paths.
func (s *ConnectionService) DefaultSSHConfigPaths() []string {
	return remote.DefaultSSHConfigPaths()
}

// ListSSHConfigHosts parses an SSH config file and returns its host entries.
func (s *ConnectionService) ListSSHConfigHosts(configPath string) ([]domain.SSHConfigHost, error) {
	return remote.ParseSSHConfigFile(configPath)
}

// ConnectFromConfig connects using a host entry parsed from an SSH config file.
// If save is true the host is also stored as a named connection profile (with IdentityFiles).
func (s *ConnectionService) ConnectFromConfig(host domain.SSHConfigHost, password string, save bool) (domain.ConnectResult, error) {
	spec := remote.SpecFromSSHConfigHost(host)
	spec = remote.EnrichSpec(spec)
	var profileID string
	var defaultWD string
	if save {
		p, err := s.upsertProfileFromSpec(spec, host.Alias)
		if err != nil {
			return domain.ConnectResult{}, err
		}
		profileID = p.ID
		defaultWD = p.DefaultWorkDir
	}
	res, err := s.connectSpec(spec, password)
	if err != nil {
		return domain.ConnectResult{}, err
	}
	res.ProfileID = profileID
	res.DefaultWorkDir = defaultWD
	return res, nil
}

// GetRecentPaths returns recently visited remote paths for a session key.
func (s *ConnectionService) GetRecentPaths(sessionKey string) ([]domain.RemoteRecent, error) {
	return s.db.GetRemoteRecent(sessionKey)
}

// AddRecentPath records a remote virtual path as recently visited.
func (s *ConnectionService) AddRecentPath(vpath string) error {
	if !remote.IsRemote(vpath) {
		return nil
	}
	loc, err := remote.ParseLocation(vpath)
	if err != nil {
		return err
	}
	return s.db.AddRemoteRecent(loc.SessionKey(), vpath, loc.RemotePath)
}

// RemoveRecentPath forgets one remembered remote working directory.
func (s *ConnectionService) RemoveRecentPath(vpath string) error {
	return s.db.DeleteRemoteRecent(vpath)
}
