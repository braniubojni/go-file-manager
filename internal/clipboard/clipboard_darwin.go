//go:build darwin

package clipboard

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"strconv"
	"strings"
)

func pasteboardTypes() string {
	out, err := exec.Command("osascript", "-l", "JavaScript", "-e", `ObjC.import('AppKit');
function run() {
  var pb = $.NSPasteboard.generalPasteboard;
  var types = pb.types;
  if (!types) return '';
  var out = [];
  for (var i = 0; i < types.count; i++) out.push(ObjC.unwrap(types.objectAtIndex(i)));
  return out.join(',');
}`).CombinedOutput()
	s := strings.TrimSpace(string(out))
	log.Printf("clipboard types err=%v types=%q", err, s)
	return s
}

func Files() []string {
	pasteboardTypes()
	out, err := exec.Command("osascript", "-l", "JavaScript", "-e", `ObjC.import('AppKit');
function run() {
  var pb = $.NSPasteboard.generalPasteboard;
  var out = [];
  var names = pb.propertyListForType('NSFilenamesPboardType');
  if (names) {
    for (var i = 0; i < names.count; i++) out.push(ObjC.unwrap(names.objectAtIndex(i)));
  }
  if (out.length) return out.join('\n');
  var items = pb.pasteboardItems;
  if (!items) return '';
  for (var i = 0; i < items.count; i++) {
    var item = items.objectAtIndex(i);
    var s = item.stringForType('public.file-url') || item.stringForType('public.url');
    if (!s) continue;
    var url = $.NSURL.URLWithString(s);
    if (url && url.path) out.push(ObjC.unwrap(url.path));
  }
  return out.join('\n');
}`).CombinedOutput()
	log.Printf("clipboard files err=%v out=%q", err, strings.TrimSpace(string(out)))
	if err != nil {
		return nil
	}
	s := strings.TrimSpace(string(out))
	if s == "" {
		return nil
	}
	var paths []string
	for _, p := range strings.Split(s, "\n") {
		p = strings.TrimSpace(p)
		if p != "" && !strings.HasPrefix(p, "execution error") {
			paths = append(paths, p)
		}
	}
	return paths
}

func PNG() []byte {
	tmp, err := os.CreateTemp("", "gfm-clip-*")
	if err != nil {
		log.Printf("clipboard png temp: %v", err)
		return nil
	}
	path := tmp.Name()
	_ = tmp.Close()
	defer func() { _ = os.Remove(path) }()

	for _, uti := range []string{"public.png", "public.tiff", "public.jpeg", "public.jpeg-2000"} {
		if b := writeUTI(uti, path); len(b) > 0 {
			if uti == "public.png" || uti == "public.jpeg" || uti == "public.jpeg-2000" {
				log.Printf("clipboard image via %s bytes=%d", uti, len(b))
				return b
			}
			png := tiffToPNG(path)
			log.Printf("clipboard image via %s converted png=%d", uti, len(png))
			if len(png) > 0 {
				return png
			}
		}
	}
	if b := writeAppleScriptPNGf(path); len(b) > 0 {
		log.Printf("clipboard image via AppleScript PNGf bytes=%d", len(b))
		return b
	}
	log.Printf("clipboard image: none of png/tiff/jpeg/PNGf present")
	return nil
}

func writeUTI(uti, dest string) []byte {
	js := fmt.Sprintf(`ObjC.import('AppKit');
function run() {
  var dest = %s;
  var pb = $.NSPasteboard.generalPasteboard;
  var data = pb.dataForType(%s);
  if (!data) return 'empty';
  if (data.writeToFileAtomically(dest, true)) return 'ok';
  return 'write-failed';
}`, strconv.Quote(dest), strconv.Quote(uti))
	out, err := exec.Command("osascript", "-l", "JavaScript", "-e", js).CombinedOutput()
	msg := strings.TrimSpace(string(out))
	log.Printf("clipboard write %s err=%v out=%q", uti, err, msg)
	if err != nil || msg != "ok" {
		return nil
	}
	b, err := os.ReadFile(dest)
	if err != nil || len(b) == 0 {
		return nil
	}
	return b
}

func writeAppleScriptPNGf(dest string) []byte {
	script := fmt.Sprintf(`try
  set pngData to (the clipboard as «class PNGf»)
on error
  return "empty"
end try
set f to open for access POSIX file %s with write permission
set eof f to 0
write pngData to f
close access f
return "ok"`, strconv.Quote(dest))
	out, err := exec.Command("osascript", "-e", script).CombinedOutput()
	msg := strings.TrimSpace(string(out))
	log.Printf("clipboard PNGf err=%v out=%q", err, msg)
	if err != nil || msg != "ok" {
		return nil
	}
	b, err := os.ReadFile(dest)
	if err != nil || len(b) == 0 {
		return nil
	}
	return b
}

func tiffToPNG(src string) []byte {
	dst := src + ".png"
	out, err := exec.Command("sips", "-s", "format", "png", src, "--out", dst).CombinedOutput()
	log.Printf("clipboard sips tiff→png err=%v out=%q", err, strings.TrimSpace(string(out)))
	if err != nil {
		return nil
	}
	b, err := os.ReadFile(dst)
	_ = os.Remove(dst)
	if err != nil {
		return nil
	}
	return b
}
