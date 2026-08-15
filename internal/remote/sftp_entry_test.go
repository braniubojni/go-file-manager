package remote

import (
	"os"
	"testing"
	"time"
)

type fakeInfo struct {
	size int64
	mode os.FileMode
	dir  bool
}

func (f fakeInfo) Name() string       { return "x" }
func (f fakeInfo) Size() int64        { return f.size }
func (f fakeInfo) Mode() os.FileMode  { return f.mode }
func (f fakeInfo) ModTime() time.Time { return time.Time{} }
func (f fakeInfo) IsDir() bool        { return f.dir }
func (f fakeInfo) Sys() any           { return nil }

func TestSftpDirProbeCandidate(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		info fakeInfo
		want bool
	}{
		{name: "dir", info: fakeInfo{dir: true, mode: os.ModeDir}, want: false},
		{name: "regular sized", info: fakeInfo{size: 12, mode: 0}, want: false},
		{name: "symlink", info: fakeInfo{mode: os.ModeSymlink}, want: false},
		{name: "nonzero special", info: fakeInfo{size: 64, mode: os.ModeNamedPipe}, want: false},
		{name: "zero-size typeless", info: fakeInfo{size: 0, mode: 0}, want: true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := sftpDirProbeCandidate(tc.info); got != tc.want {
				t.Fatalf("got %v want %v", got, tc.want)
			}
		})
	}
}
