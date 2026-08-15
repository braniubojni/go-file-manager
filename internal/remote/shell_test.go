package remote

import "testing"

func TestShellSession_closeIdempotent(t *testing.T) {
	t.Parallel()
	sh := &ShellSession{}
	if err := sh.Close(); err != nil {
		t.Fatalf("first close: %v", err)
	}
	if err := sh.Close(); err != nil {
		t.Fatalf("second close: %v", err)
	}
}
