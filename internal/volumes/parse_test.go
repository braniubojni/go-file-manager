package volumes

import "testing"

func TestParseMountOutput(t *testing.T) {
	in := `/dev/disk3s1s1 on / (apfs, sealed, local, read-only, journaled)
//user@host/Share on /Volumes/Share (smbfs, nodev, nosuid, mounted by erik)
/dev/disk4s2 on /Volumes/My Disk (hfs, local, nodev, nosuid, read-only)
`
	got := parseMountOutput(in)
	if got["/Volumes/Share"].FS != "smbfs" {
		t.Fatalf("share fs = %+v", got["/Volumes/Share"])
	}
	if got["/Volumes/My Disk"].Device != "/dev/disk4s2" {
		t.Fatalf("spaced volume: %+v", got["/Volumes/My Disk"])
	}
	if !isNetworkFS(got["/Volumes/Share"].FS) {
		t.Fatal("expected network fs")
	}
}

func TestParseHdiutilInfo(t *testing.T) {
	plist := `
<key>image-path</key>
<string>/Users/me/foo.dmg</string>
<key>dev-entry</key>
<string>/dev/disk4</string>
<key>mount-point</key>
<string>/Volumes/Foo</string>
<key>image-path</key>
<string>/Users/me/bar.dmg</string>
<key>mount-point</key>
<string>/Volumes/Bar</string>
`
	got := parseHdiutilInfo(plist)
	if got["/Volumes/Foo"] != "/Users/me/foo.dmg" {
		t.Fatalf("foo: %q", got["/Volumes/Foo"])
	}
	if got["/Volumes/Bar"] != "/Users/me/bar.dmg" {
		t.Fatalf("bar: %q", got["/Volumes/Bar"])
	}
}

func TestFirstMountPoint(t *testing.T) {
	plist := `<key>dev-entry</key><string>/dev/disk4</string>
<key>mount-point</key>
<string>/Volumes/Stuff</string>`
	if got := firstMountPoint(plist); got != "/Volumes/Stuff" {
		t.Fatalf("got %q", got)
	}
	if got := firstMountPoint("nope"); got != "" {
		t.Fatalf("empty want, got %q", got)
	}
}
