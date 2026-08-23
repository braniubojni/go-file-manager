package service

import (
	"os"
	"testing"
)

func TestPortServiceKillRefusesSelf(t *testing.T) {
	s := NewPortService()
	if err := s.Kill(os.Getpid()); err == nil {
		t.Fatal("expected refuse self")
	}
	if err := s.Kill(1); err == nil {
		t.Fatal("expected refuse pid 1")
	}
	if err := s.KillAll(nil); err != nil {
		t.Fatal(err)
	}
}

func TestPortServiceList(t *testing.T) {
	s := NewPortService()
	list, err := s.List()
	if err != nil {
		t.Fatal(err)
	}
	if list == nil {
		t.Fatal("nil list")
	}
}
