package remote

import "testing"

func TestUnixShellQuote(t *testing.T) {
	tests := []struct {
		in, want string
	}{
		{"/tmp/a", `'/tmp/a'`},
		{"it's", `'it'"'"'s'`},
		{"", `''`},
	}
	for _, tc := range tests {
		if got := unixShellQuote(tc.in); got != tc.want {
			t.Fatalf("unixShellQuote(%q)=%q want %q", tc.in, got, tc.want)
		}
	}
}
