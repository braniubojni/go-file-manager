package filesystem

import "testing"

func TestParseGlobList(t *testing.T) {
	got := ParseGlobList(" build, *mock*, *.test.ts ,  ")
	if len(got) != 3 || got[0] != "build" || got[1] != "*mock*" || got[2] != "*.test.ts" {
		t.Fatalf("got %#v", got)
	}
	if ParseGlobList("") != nil && len(ParseGlobList("  ")) != 0 {
		t.Fatal("empty should be empty")
	}
}

func TestPathFilterExcludeSegment(t *testing.T) {
	f := NewPathFilter("", "build, *mock*, *.svg, *lock.json, eslint*, *.md, .agents, knip.json, *.yaml")
	cases := []struct {
		rel  string
		want bool
	}{
		{"src/main.go", true},
		{"build/out.js", false},
		{"pkg/build/x", false}, // segment match
		{"foo_mock_bar.go", false},
		{"icon.svg", false},
		{"package-lock.json", false},
		{"eslint.config.js", false},
		{"README.md", false},
		{".agents/rules", false},
		{"knip.json", false},
		{"ci.yaml", false},
	}
	for _, c := range cases {
		if got := f.Match(c.rel); got != c.want {
			t.Errorf("Match(%q)=%v want %v", c.rel, got, c.want)
		}
	}
}

func TestPathFilterInclude(t *testing.T) {
	f := NewPathFilter("*.ts, *.tsx", "node_modules")
	if !f.Match("src/app.ts") {
		t.Fatal("expected ts include")
	}
	if f.Match("src/app.go") {
		t.Fatal("go should not match include")
	}
	if f.Match("node_modules/pkg/index.ts") {
		t.Fatal("exclude should win")
	}
}

func TestPathFilterMatchDir(t *testing.T) {
	f := NewPathFilter("*.go", "build, .git")
	if !f.MatchDir("src") {
		t.Fatal("should walk src")
	}
	if f.MatchDir("build") {
		t.Fatal("should not walk build")
	}
	if f.MatchDir(".git") {
		t.Fatal("should not walk .git")
	}
}

func TestPathFilterPathPattern(t *testing.T) {
	f := NewPathFilter("src/*.go", "")
	if !f.Match("src/main.go") {
		t.Fatal("expected path pattern match")
	}
	if f.Match("pkg/main.go") {
		t.Fatal("should not match other dir")
	}
}
