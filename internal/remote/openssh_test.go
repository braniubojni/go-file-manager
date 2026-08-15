package remote

import (
	"os"
	"strings"
	"testing"
)

func TestOpenSSHTarget_alias(t *testing.T) {
	t.Parallel()
	target, extra := openSSHTarget(Spec{
		User: "mfmso", Host: "100.97.100.94", Port: 22, ConfigAlias: "pahestain",
	})
	if target != "pahestain" {
		t.Fatalf("want alias target, got %q", target)
	}
	if len(extra) != 0 {
		t.Fatalf("extra args: %v", extra)
	}
}

func TestIsOpenSSHConnectionError(t *testing.T) {
	t.Parallel()
	conn := formatOpenSSHErr(nil, "ssh: connect to host 192.168.0.5 port 22: Operation timed out")
	if !isOpenSSHConnectionError(conn) {
		t.Fatal("expected timeout to be connection error")
	}
	auth := formatOpenSSHErr(nil, "Permission denied (publickey).")
	if isOpenSSHConnectionError(auth) {
		t.Fatal("auth should not be connection error")
	}
	if !isOpenSSHAuthError(auth) {
		t.Fatal("expected auth sentinel")
	}
	// Bare "timeout" in an auth-ish message must not skip native fallback.
	kex := formatOpenSSHErr(nil, "keyboard-interactive prompt timeout")
	if isOpenSSHConnectionError(kex) {
		t.Fatal("generic timeout must not classify as connection error")
	}
}

func TestOpenSSHTarget_userHostPort(t *testing.T) {
	t.Parallel()
	target, extra := openSSHTarget(Spec{User: "u", Host: "h.example", Port: 2222})
	if target != "u@h.example" {
		t.Fatalf("target: %q", target)
	}
	if len(extra) != 2 || extra[0] != "-p" || extra[1] != "2222" {
		t.Fatalf("extra: %v", extra)
	}
}

func TestIsIPLiteral(t *testing.T) {
	t.Parallel()
	if !isIPLiteral("100.97.100.94") {
		t.Fatal("expected IP")
	}
	if isIPLiteral("pahestain") {
		t.Fatal("alias is not IP")
	}
}

func TestOpenSSHBaseArgs_passwordDisablesBatchMode(t *testing.T) {
	t.Parallel()
	spec := Spec{User: "root", Host: "45.76.7.10", Port: 22, IdentityFiles: []string{"/tmp/id_ed25519"}}
	target, args := openSSHBaseArgs(spec, "secret")
	if target != "root@45.76.7.10" {
		t.Fatalf("target: %q", target)
	}
	joined := strings.Join(args, " ")
	if containsFold(joined, "BatchMode=yes") {
		t.Fatalf("password auth must not set BatchMode: %v", args)
	}
	if !containsFold(joined, "-i") || !containsFold(joined, "/tmp/id_ed25519") {
		t.Fatalf("expected identity -i: %v", args)
	}
	if !containsFold(joined, "PreferredAuthentications=publickey,password,keyboard-interactive") {
		t.Fatalf("expected PreferredAuthentications without alias: %v", args)
	}
}

func TestOpenSSHBaseArgs_aliasSkipsPreferredAuth(t *testing.T) {
	t.Parallel()
	_, args := openSSHBaseArgs(Spec{
		User: "u", Host: "h", Port: 22, ConfigAlias: "pahestain",
	}, "")
	if containsFold(strings.Join(args, " "), "PreferredAuthentications=") {
		t.Fatalf("alias must not force PreferredAuthentications: %v", args)
	}
}

func TestOpenSSHBaseArgs_noPasswordUsesBatchMode(t *testing.T) {
	t.Parallel()
	_, args := openSSHBaseArgs(Spec{User: "u", Host: "h.example", Port: 22}, "")
	if !containsFold(strings.Join(args, " "), "BatchMode=yes") {
		t.Fatalf("key-only should BatchMode: %v", args)
	}
}

func TestOpenSSHBaseArgs_configFileAndPort(t *testing.T) {
	t.Parallel()
	target, args := openSSHBaseArgs(Spec{
		User: "u", Host: "h.example", Port: 2222, ConfigFile: "/tmp/ssh_config",
	}, "")
	if target != "u@h.example" {
		t.Fatalf("target: %q", target)
	}
	joined := strings.Join(args, " ")
	if !containsFold(joined, "-F") || !containsFold(joined, "/tmp/ssh_config") {
		t.Fatalf("expected -F: %v", args)
	}
	if !containsFold(joined, "-p") || !containsFold(joined, "2222") {
		t.Fatalf("expected -p 2222: %v", args)
	}
}

func TestDialOpenSSH_missingBinary(t *testing.T) {
	t.Parallel()
	// dialOpenSSH looks up ssh on PATH; we only assert openSSHTarget + format helpers
	// here. Integration requires a real host.
	err := formatOpenSSHErr(nil, "Permission denied (publickey).")
	if err == nil || !containsAuth(err.Error()) {
		t.Fatalf("want auth error, got %v", err)
	}
}

func containsAuth(s string) bool {
	return len(s) > 0 && (containsFold(s, "authentication required") || containsFold(s, "permission denied"))
}

func containsFold(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 ||
		indexFold(s, sub) >= 0)
}

func indexFold(s, sub string) int {
	// small helper without strings.ToLower alloc loops for tests
	sl, subl := []rune(s), []rune(sub)
	for i := 0; i+len(subl) <= len(sl); i++ {
		ok := true
		for j := range subl {
			a, b := sl[i+j], subl[j]
			if a >= 'A' && a <= 'Z' {
				a += 'a' - 'A'
			}
			if b >= 'A' && b <= 'Z' {
				b += 'a' - 'A'
			}
			if a != b {
				ok = false
				break
			}
		}
		if ok {
			return i
		}
	}
	return -1
}

func TestDialOpenSSH_livePahestain(t *testing.T) {
	if os.Getenv("GFM_LIVE_SSH") == "" {
		t.Skip("set GFM_LIVE_SSH=1 to run")
	}
	m := NewManager(nil)
	spec := Spec{User: "mfmso", Host: "100.97.100.94", Port: 22, ConfigAlias: "pahestain"}
	if err := m.Connect(spec, ""); err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer func() { _ = m.Disconnect(spec.SessionKey()) }()
	home, err := m.HomePath(spec)
	if err != nil {
		t.Fatalf("home: %v", err)
	}
	entries, err := m.ListDir(home, true)
	if err != nil {
		t.Fatalf("list %s: %v", home, err)
	}
	if len(entries) == 0 {
		t.Fatal("empty listing")
	}
	t.Logf("home=%s entries=%d first=%s", home, len(entries), entries[0].Name)
}
