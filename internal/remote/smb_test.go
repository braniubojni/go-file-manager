package remote

import (
	"fmt"
	"os"
	"runtime"
	"strings"
	"testing"
)

func TestNTLMAttemptsOrder(t *testing.T) {
	t.Parallel()
	// Helper with empty user (Connect never does this — resolveSMBUser runs first):
	// Guest-only tries.
	anon := ntlmAttempts("", "", "")
	if len(anon) < 1 || anon[0].source != "guest" {
		t.Fatalf("empty resolved user: guest first expected: %+v", anon)
	}
	// Connect(empty form user) → resolveSMBUser → OS login → account first, Guest fallback.
	withOS := ntlmAttempts("erik", "", "")
	if len(withOS) < 3 || withOS[0].source != "account" {
		t.Fatalf("OS/resolved user: account first expected: %+v", withOS)
	}
	if withOS[len(withOS)-1].source != "guest-workgroup" && withOS[len(withOS)-1].source != "guest" {
		t.Fatalf("OS/resolved user: guest fallback expected at end: %+v", withOS)
	}
	// Explicit user + password → account first
	withPass := ntlmAttempts("erik", "CORP", "secret")
	if len(withPass) < 2 || withPass[0].source != "account" || withPass[0].pass != "secret" {
		t.Fatalf("with pass: account first expected: %+v", withPass)
	}
	// resolveSMBUser guest fallback → Guest-only (no duplicate account try)
	guestOnly := ntlmAttempts("Guest", "", "")
	if len(guestOnly) < 1 || guestOnly[0].source != "guest" {
		t.Fatalf("Guest user: guest first expected: %+v", guestOnly)
	}
	for _, tr := range guestOnly {
		if tr.source == "account" {
			t.Fatalf("Guest user must not add account try: %+v", guestOnly)
		}
	}
}

func TestSMBDestExists(t *testing.T) {
	t.Parallel()
	if !smbDestExists(os.ErrExist) {
		t.Fatal("os.ErrExist")
	}
	if !smbDestExists(fmt.Errorf("rename: %w", os.ErrExist)) {
		t.Fatal("wrapped ErrExist")
	}
	if !smbDestExists(fmt.Errorf("STATUS_OBJECT_NAME_COLLISION: The object name already exists.")) {
		t.Fatal("collision message")
	}
	if smbDestExists(fmt.Errorf("access denied")) {
		t.Fatal("permission should not look like dest exists")
	}
	if smbDestExists(nil) {
		t.Fatal("nil")
	}
}

func TestFilterSMBShares(t *testing.T) {
	t.Parallel()
	names := []string{"Documents", "IPC$", "C$", "print$", "Media", ""}
	got := FilterSMBShares(names, false)
	if len(got) != 2 || got[0].Name != "Documents" || got[1].Name != "Media" {
		t.Fatalf("visible: %+v", got)
	}
	all := FilterSMBShares(names, true)
	if len(all) != 4 {
		t.Fatalf("show hidden: %+v", all)
	}
	for _, s := range all {
		if strings.EqualFold(s.Name, "IPC$") {
			t.Fatal("IPC$ must stay hidden")
		}
	}
}

func TestClassifySMBError(t *testing.T) {
	t.Parallel()
	cases := []struct {
		err  string
		want string
	}{
		{"The attempted logon is invalid. This is either due to a bad username or authentication information.", smbClassAuth},
		{"STATUS_LOGON_FAILURE", smbClassAuth},
		{"dial tcp: lookup smb: no such host", smbClassNetwork},
		{"dial tcp 192.168.0.106:445: connect: no route to host", smbClassNetwork},
		{"connection refused", smbClassNetwork},
		{"connectex: A socket operation was attempted to an unreachable host.", smbClassNetwork},
		{"connectex: No connection could be made because the target machine actively refused it.", smbClassNetwork},
		{"STATUS_ACCOUNT_LOCKED_OUT", smbClassAuth},
		{"something else", smbClassOther},
	}
	for _, tc := range cases {
		if got := classifySMBError(fmt.Errorf("%s", tc.err)); got != tc.want {
			t.Errorf("%q: got %s want %s", tc.err, got, tc.want)
		}
	}
}

func TestNormalizeSMBDialHost(t *testing.T) {
	t.Parallel()
	if got := normalizeSMBDialHost(`\\NAS\Documents`); got != "NAS" {
		t.Fatalf("unc: %q", got)
	}
	if got := normalizeSMBDialHost("//nas.local/share"); got != "nas.local" {
		t.Fatalf("posix unc: %q", got)
	}
}

func TestResolveSMBUser(t *testing.T) {
	t.Parallel()
	n, d, src := resolveSMBUser(`CORP\bob`, "")
	if n != "bob" || d != "CORP" || src != "explicit" {
		t.Fatalf("domain user: %q %q %s", n, d, src)
	}
	n, d, src = resolveSMBUser("bob@corp.local", "")
	if n != "bob" || d != "corp.local" || src != "explicit" {
		t.Fatalf("upn: %q %q %s", n, d, src)
	}
	n, d, _ = resolveSMBUser("bob@corp.local", "OTHER")
	if n != "bob" || d != "OTHER" {
		t.Fatalf("explicit domain wins: %q %q", n, d)
	}
}

func TestWrapSMBConnectErrorHint(t *testing.T) {
	t.Parallel()
	err := wrapSMBConnectError("h:445", fmt.Errorf("no route to host"), smbClassNetwork)
	if !strings.Contains(err.Error(), "cannot reach") {
		t.Fatal(err)
	}
	switch runtime.GOOS {
	case "darwin":
		if !strings.Contains(err.Error(), "macOS") {
			t.Fatal(err)
		}
	case "windows":
		if !strings.Contains(err.Error(), "Windows") {
			t.Fatal(err)
		}
	default:
		if !strings.Contains(err.Error(), "Linux") {
			t.Fatal(err)
		}
	}
}

func TestValidateSMBHost(t *testing.T) {
	t.Parallel()
	if err := validateSMBHost("smb"); err == nil {
		t.Fatal("expected error for protocol-as-host")
	}
	if err := validateSMBHost("192.168.0.10"); err != nil {
		t.Fatal(err)
	}
}

func TestSMBManagerNotConnected(t *testing.T) {
	t.Parallel()
	m := NewSMBManager()
	if _, err := m.ListDir("smb://u@h:445/Share", true); err == nil {
		t.Fatal("expected not connected")
	} else if !strings.Contains(err.Error(), "not connected") {
		t.Fatalf("err: %v", err)
	}
	if err := m.Download([]string{"smb://u@h:445/Share/a"}, t.TempDir()); err == nil {
		t.Fatal("expected not connected")
	}
	if err := m.Upload([]string{t.TempDir()}, "smb://u@h:445/Share"); err == nil {
		t.Fatal("expected not connected")
	}
}
