package filesystem

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestIsExecutable(t *testing.T) {
	t.Parallel()
	cases := []struct {
		name string
		head []byte
		want bool
	}{
		{"elf", []byte{0x7f, 'E', 'L', 'F', 2, 1, 1}, true},
		{"mach-o 64", []byte{0xcf, 0xfa, 0xed, 0xfe, 0x0c}, true},
		{"mach-o universal", []byte{0xca, 0xfe, 0xba, 0xbe, 0, 0}, true},
		{"wasm", []byte{0x00, 'a', 's', 'm', 1}, true},
		{"pe with nul", append([]byte("MZ\x90"), 0x00, 0x03), true},
		{"prose starting MZ", []byte("MZ is a person, not a binary"), false},
		{"shell script", []byte("#!/bin/sh\necho hi\n"), false},
		{"utf8 text", []byte("package main\n"), false},
		{"empty", nil, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := IsExecutable(tc.head); got != tc.want {
				t.Fatalf("IsExecutable = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestReadTextFileRejectsExecutableBeforeSize(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	// Bigger than the editor cap: the old order reported "too large", which told
	// the user nothing about why the file cannot be edited.
	big := filepath.Join(dir, "big.bin")
	payload := append([]byte{0x7f, 'E', 'L', 'F'}, make([]byte, MaxTextFileBytes+1)...)
	if err := os.WriteFile(big, payload, 0o755); err != nil {
		t.Fatal(err)
	}
	_, err := ReadTextFile(big)
	if err == nil || !strings.Contains(err.Error(), "executable file") {
		t.Fatalf("want executable error, got %v", err)
	}
}

func TestReadTextFileAllowsExecutableScript(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	script := filepath.Join(dir, "run.sh")
	if err := os.WriteFile(script, []byte("#!/bin/sh\necho hi\n"), 0o755); err != nil {
		t.Fatal(err)
	}
	got, err := ReadTextFile(script)
	if err != nil {
		t.Fatalf("0755 script must stay editable: %v", err)
	}
	if !strings.Contains(got, "echo hi") {
		t.Fatalf("unexpected content %q", got)
	}
}

func TestReadTextFileTooLarge(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	big := filepath.Join(dir, "big.txt")
	if err := os.WriteFile(big, make([]byte, MaxTextFileBytes+1), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := ReadTextFile(big)
	if err == nil || !strings.Contains(err.Error(), "too large") {
		t.Fatalf("want too-large error, got %v", err)
	}
}

func TestReadTextFileShortFile(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	p := filepath.Join(dir, "tiny.txt")
	if err := os.WriteFile(p, []byte("hi"), 0o644); err != nil {
		t.Fatal(err)
	}
	// Shorter than HeadBytes: the head read must not be mistaken for an error.
	got, err := ReadTextFile(p)
	if err != nil || got != "hi" {
		t.Fatalf("got %q, %v", got, err)
	}
}

func TestReadTextFileRoundTripsAcrossHeadBoundary(t *testing.T) {
	t.Parallel()
	dir := t.TempDir()
	p := filepath.Join(dir, "long.txt")
	content := strings.Repeat("abcdefgh", HeadBytes) // well past HeadBytes
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
	got, err := ReadTextFile(p)
	if err != nil {
		t.Fatal(err)
	}
	if got != content {
		t.Fatalf("content mangled at the head/rest seam: len %d want %d", len(got), len(content))
	}
}
