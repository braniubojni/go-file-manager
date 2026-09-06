package remote

import (
	"strings"
	"testing"
)

func TestMEGAManagerNotConnected(t *testing.T) {
	t.Parallel()
	m := NewMEGAManager()
	_, err := m.ListDir("mega://alice@gmail.com/", true)
	if err == nil {
		t.Fatal("expected not connected")
	}
	if !strings.Contains(err.Error(), "not connected") {
		t.Fatalf("got %v", err)
	}
	if err := m.Download([]string{"mega://alice@gmail.com/x"}, t.TempDir()); err == nil {
		t.Fatal("expected not connected")
	} else if !strings.Contains(err.Error(), "not connected") {
		t.Fatalf("download: %v", err)
	}
	if err := m.Disconnect("mega://alice@gmail.com/"); err != nil {
		t.Fatal(err)
	}
	if n := len(m.ListSessions()); n != 0 {
		t.Fatalf("sessions: %d", n)
	}
}
