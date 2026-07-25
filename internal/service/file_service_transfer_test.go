package service

import (
	"strings"
	"testing"
)

func TestTransferKind(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name    string
		sources []string
		dest    string
		want    xferKind
		errSub  string
	}{
		{
			name:    "local to local",
			sources: []string{"/tmp/a"},
			dest:    "/tmp/b",
			want:    transferLocal,
		},
		{
			name:    "remote to remote",
			sources: []string{"ssh://u@h:22/a"},
			dest:    "ssh://u@h:22/b",
			want:    transferRemoteWithin,
		},
		{
			name:    "remote to local download",
			sources: []string{"ssh://u@h:22/home/u/file.txt"},
			dest:    "/tmp/out",
			want:    transferDownload,
		},
		{
			name:    "local to remote upload",
			sources: []string{"/tmp/file.txt"},
			dest:    "ssh://u@h:22/home/u",
			want:    transferUpload,
		},
		{
			name:    "mixed sources",
			sources: []string{"/tmp/a", "ssh://u@h:22/b"},
			dest:    "/tmp/out",
			errSub:  "mixed local/remote",
		},
		{
			name:    "empty sources",
			sources: nil,
			dest:    "/tmp",
			errSub:  "no sources",
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			got, err := transferKind(tc.sources, tc.dest)
			if tc.errSub != "" {
				if err == nil {
					t.Fatalf("expected error containing %q", tc.errSub)
				}
				if !strings.Contains(err.Error(), tc.errSub) {
					t.Fatalf("error %q does not contain %q", err.Error(), tc.errSub)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("got kind %v want %v", got, tc.want)
			}
		})
	}
}

func TestCopyMoveRemoteNil(t *testing.T) {
	t.Parallel()
	s := NewFileService(nil)
	if err := s.Copy([]string{"ssh://u@h:22/a"}, "/tmp"); err == nil {
		t.Fatal("expected error when remote manager is nil")
	} else if !strings.Contains(err.Error(), "remote not available") {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := s.Move([]string{"/tmp/a"}, "ssh://u@h:22/"); err == nil {
		t.Fatal("expected error when remote manager is nil")
	} else if !strings.Contains(err.Error(), "remote not available") {
		t.Fatalf("unexpected error: %v", err)
	}
}
