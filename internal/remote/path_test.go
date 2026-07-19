package remote

import "testing"

func TestParseSpec(t *testing.T) {
	cases := []struct {
		in       string
		user     string
		host     string
		port     int
		wantErr  bool
	}{
		{"ssh username@ip", "username", "ip", 22, false},
		{"user@192.168.1.1", "user", "192.168.1.1", 22, false},
		{"deploy@prod.example.com:2222", "deploy", "prod.example.com", 2222, false},
		{"ssh://alice@box:22/", "alice", "box", 22, false},
		{"", "", "", 0, true},
		{"not-a-spec", "", "", 0, true},
	}
	for _, c := range cases {
		s, err := ParseSpec(c.in)
		if c.wantErr {
			if err == nil {
				t.Errorf("%q: expected error", c.in)
			}
			continue
		}
		if err != nil {
			t.Errorf("%q: %v", c.in, err)
			continue
		}
		if s.User != c.user || s.Host != c.host || s.Port != c.port {
			t.Errorf("%q: got %+v", c.in, s)
		}
	}
}

func TestParseLocationAndParent(t *testing.T) {
	loc, err := ParseLocation("ssh://bob@server:2222/home/bob/docs")
	if err != nil {
		t.Fatal(err)
	}
	if loc.User != "bob" || loc.Host != "server" || loc.Port != 2222 || loc.RemotePath != "/home/bob/docs" {
		t.Fatalf("got %+v", loc)
	}
	p := ParentRemote(loc)
	if p.RemotePath != "/home/bob" {
		t.Fatalf("parent: %s", p.RemotePath)
	}
	p2 := ParentRemote(ParentRemote(p))
	if p2.RemotePath != "/" {
		t.Fatalf("root parent: %s", p2.RemotePath)
	}
	if !IsRemote("ssh://a@b/") || IsRemote("/tmp") {
		t.Fatal("IsRemote")
	}
}
