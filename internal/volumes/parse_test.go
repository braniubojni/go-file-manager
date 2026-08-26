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

func TestParseHdiutilPercent(t *testing.T) {
	cases := []struct {
		line string
		want float64
		ok   bool
	}{
		{"PERCENT:12.5", 12.5, true},
		{"PERCENTAGE:-1.000000", -1, true},
		{"PERCENT 42", 42, true},
		{"mount-point: /Volumes/X", 0, false},
	}
	for _, tc := range cases {
		got, ok := parseHdiutilPercent(tc.line)
		if ok != tc.ok || (ok && got != tc.want) {
			t.Fatalf("%q: got (%v, %v) want (%v, %v)", tc.line, got, ok, tc.want, tc.ok)
		}
	}
}

func TestImageEncryptedFromOutput(t *testing.T) {
	if !imageEncryptedFromOutput("encrypted: YES\n") {
		t.Fatal("text YES")
	}
	if !imageEncryptedFromOutput("<key>encrypted</key>\n<true/>") {
		t.Fatal("plist true")
	}
	if imageEncryptedFromOutput("encrypted: NO") {
		t.Fatal("not encrypted")
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
