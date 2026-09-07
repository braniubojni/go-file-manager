package service

import (
	"context"
	"testing"

	"github.com/erikharutyunyan/go-file-manager/internal/domain"
)

// fakeRemoteBackend implements remoteBackend with an in-memory tree, ListDir
// only — every other method panics if called (unused by these tests).
type fakeRemoteBackend struct {
	remoteBackend
	tree map[string][]domain.FileEntry // dir path -> children
}

func (f *fakeRemoteBackend) ListDir(path string, showHidden bool) ([]domain.FileEntry, error) {
	return f.tree[path], nil
}

func newFakeTree() *fakeRemoteBackend {
	return &fakeRemoteBackend{tree: map[string][]domain.FileEntry{
		"ssh://h/root": {
			{Name: "a.txt", Path: "ssh://h/root/a.txt"},
			{Name: "sub", Path: "ssh://h/root/sub", IsDir: true},
			{Name: ".hidden", Path: "ssh://h/root/.hidden"},
		},
		"ssh://h/root/sub": {
			{Name: "b.txt", Path: "ssh://h/root/sub/b.txt"},
			{Name: "excluded", Path: "ssh://h/root/sub/excluded", IsDir: true},
		},
		"ssh://h/root/sub/excluded": {
			{Name: "c.txt", Path: "ssh://h/root/sub/excluded/c.txt"},
		},
	}}
}

func TestSearchTreeRemote(t *testing.T) {
	s := &FileService{}
	be := newFakeTree()

	hits, err := s.searchTreeRemote(be, "ssh://h/root", "txt", false, 10)
	if err != nil {
		t.Fatal(err)
	}
	names := map[string]bool{}
	for _, h := range hits {
		names[h.Name] = true
	}
	if !names["a.txt"] || !names["b.txt"] {
		t.Fatalf("expected a.txt and b.txt, got %+v", hits)
	}
	if names[".hidden"] {
		t.Fatalf("hidden entry should not appear with showHidden=false: %+v", hits)
	}
}

func TestSearchFoldersRemotePrunesExcluded(t *testing.T) {
	s := &FileService{}
	be := newFakeTree()

	var hits []domain.SearchHit
	_, err := s.searchFoldersRemote(context.Background(), be, "ssh://h/root", "", "", "excluded", false, 10,
		func(h domain.SearchHit) { hits = append(hits, h) },
		func(string, error) {},
	)
	if err != nil {
		t.Fatal(err)
	}
	for _, h := range hits {
		if h.Name == "excluded" {
			t.Fatalf("excluded dir should be pruned, got %+v", hits)
		}
	}
	found := false
	for _, h := range hits {
		if h.Name == "sub" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected sub folder hit, got %+v", hits)
	}
}
