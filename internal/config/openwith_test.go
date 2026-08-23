package config

import (
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"testing"
)

const sampleDesktop = `[Desktop Entry]
Type=Application
Name=Plain Text Editor
MimeType=text/plain;application/json;text/*;
Exec=editor %f
`

func TestParseDesktopMIMEFilter(t *testing.T) {
	app, ok := parseDesktopEntry("editor.desktop", sampleDesktop)
	if !ok {
		t.Fatal("expected launchable desktop entry")
	}
	if app.Name != "Plain Text Editor" || app.ID != "editor.desktop" {
		t.Fatalf("app=%+v", app)
	}
	if !desktopMatchesMIME(app.MimeTypes, "text/plain") {
		t.Fatal("text/plain should match")
	}
	if !desktopMatchesMIME(app.MimeTypes, "text/markdown") {
		t.Fatal("text/* should match text/markdown")
	}
	if desktopMatchesMIME(app.MimeTypes, "image/png") {
		t.Fatal("image/png should not match")
	}

	hidden := sampleDesktop + "Hidden=true\n"
	if _, ok := parseDesktopEntry("h.desktop", hidden); ok {
		t.Fatal("Hidden=true should be skipped")
	}
	noDisp := "[Desktop Entry]\nType=Application\nName=X\nNoDisplay=true\nMimeType=text/plain;\n"
	if _, ok := parseDesktopEntry("n.desktop", noDisp); ok {
		t.Fatal("NoDisplay=true should be skipped")
	}
	link := "[Desktop Entry]\nType=Link\nName=Site\nMimeType=text/plain;\n"
	if _, ok := parseDesktopEntry("l.desktop", link); ok {
		t.Fatal("Type=Link should be skipped")
	}
}

func TestOpenWithCmdArgs(t *testing.T) {
	path := "/tmp/note.txt"
	tests := []struct {
		name string
		cmd  string
		args []string
		got  func() (string, []string)
	}{
		{"darwin", "open", []string{"-a", "TextEdit", "--", path}, func() (string, []string) {
			return darwinOpenWithCmd("TextEdit", path)
		}},
		{"linux picker", "mimeopen", []string{"-a", path}, func() (string, []string) {
			return linuxPickerCmd(path)
		}},
		{"linux gtk-launch", "gtk-launch", []string{"editor", path}, func() (string, []string) {
			return linuxGtkLaunchCmd("editor.desktop", path)
		}},
		{"linux gio", "gio", []string{"launch", "/usr/share/applications/editor.desktop", path}, func() (string, []string) {
			return linuxGioLaunchCmd("/usr/share/applications/editor.desktop", path)
		}},
		{"windows picker", "rundll32", []string{"shell32.dll,OpenAs_RunDLL", path}, func() (string, []string) {
			return windowsPickerCmd(path)
		}},
	}
	for _, tc := range tests {
		cmd, args := tc.got()
		if cmd != tc.cmd || !reflect.DeepEqual(args, tc.args) {
			t.Fatalf("%s: got %s %v want %s %v", tc.name, cmd, args, tc.cmd, tc.args)
		}
	}
	if got := darwinAppName("/Applications/Safari.app"); got != "Safari" {
		t.Fatalf("darwinAppName=%q", got)
	}
}

func TestListOpenWithAppsDarwin(t *testing.T) {
	if runtime.GOOS != "darwin" {
		t.Skip("live list requires darwin")
	}
	f := filepath.Join(t.TempDir(), "note.txt")
	if err := os.WriteFile(f, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	apps, err := ListOpenWithApps(f)
	if err != nil {
		t.Fatal(err)
	}
	if len(apps) == 0 {
		t.Skip("/Applications empty")
	}
	if apps[0].ID == "" || apps[0].Name == "" {
		t.Fatalf("app=%+v", apps[0])
	}
}

func TestListOpenWithAppsEmptyPath(t *testing.T) {
	if _, err := ListOpenWithApps(""); err == nil {
		t.Fatal("expected error")
	}
}
