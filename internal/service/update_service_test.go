package service

import (
	"strings"
	"testing"
)

func TestNormalizeAndCompare(t *testing.T) {
	if normalizeVersion("1.2.3") != "v1.2.3" {
		t.Fatal(normalizeVersion("1.2.3"))
	}
	if stripV("v1.2.3") != "1.2.3" {
		t.Fatal(stripV("v1.2.3"))
	}
}

func TestPickAssetDarwinArm64(t *testing.T) {
	assets := []ghAsset{
		{Name: "go-file-manager_0.1.0_windows_amd64.zip", BrowserDownloadURL: "http://w", Size: 1},
		{Name: "go-file-manager_0.1.0_darwin_arm64.dmg", BrowserDownloadURL: "http://mac", Size: 99},
		{Name: "go-file-manager_0.1.0_linux_amd64.AppImage", BrowserDownloadURL: "http://l", Size: 2},
		{Name: "SHA256SUMS", BrowserDownloadURL: "http://s", Size: 3},
	}
	name, url, size := pickAsset(assets, "darwin", "arm64")
	if name != "go-file-manager_0.1.0_darwin_arm64.dmg" || url != "http://mac" || size != 99 {
		t.Fatalf("got %s %s %d", name, url, size)
	}
}

func TestPickAssetWindows(t *testing.T) {
	assets := []ghAsset{
		{Name: "app-macos.zip", BrowserDownloadURL: "http://m", Size: 1},
		{Name: "app-windows-amd64.exe", BrowserDownloadURL: "http://w", Size: 50},
	}
	name, url, _ := pickAsset(assets, "windows", "amd64")
	if name != "app-windows-amd64.exe" || url != "http://w" {
		t.Fatalf("got %s %s", name, url)
	}
}

func TestPickAssetNone(t *testing.T) {
	assets := []ghAsset{
		{Name: "source.tar.gz", BrowserDownloadURL: "http://s", Size: 1},
	}
	name, url, _ := pickAsset(assets, "darwin", "arm64")
	if name != "" || url != "" {
		t.Fatalf("expected empty, got %s %s", name, url)
	}
}

func TestTruncateNotes(t *testing.T) {
	if truncateNotes("hi") != "hi" {
		t.Fatal()
	}
	s := strings.Repeat("a", maxNotes+5)
	out := truncateNotes(s)
	if !strings.HasSuffix(out, "…") {
		t.Fatalf("expected ellipsis suffix, got len %d", len([]rune(out)))
	}
	if len([]rune(out)) != maxNotes+1 {
		t.Fatalf("want %d runes, got %d", maxNotes+1, len([]rune(out)))
	}
}
