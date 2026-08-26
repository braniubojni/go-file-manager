package aiusage

import (
	"strings"
	"testing"
)

func TestParseClaudeUsage(t *testing.T) {
	in := `You are currently using your subscription to power your Claude Code usage

Current session: 9% used · resets Aug 26 at 3:59am (Europe/Warsaw)
Current week (all models): 27% used · resets Aug 28 at 10:59am (Europe/Warsaw)

What's contributing to your limits usage?

Last 24h · 409 requests · 4 sessions
  85% of your usage came from subagent-heavy sessions
  Top subagents: Explore 17%

Last 7d · 1177 requests · 6 sessions
  96% of your usage came from subagent-heavy sessions
`
	limits, details := parseClaudeUsage(in)

	if len(limits) != 2 {
		t.Fatalf("limits len=%d %+v", len(limits), limits)
	}
	if limits[0].Percent != 9 || limits[0].ResetAt != "Aug 26 at 3:59am (Europe/Warsaw)" {
		t.Fatalf("limits[0]=%+v", limits[0])
	}
	if limits[1].Percent != 27 || limits[1].ResetAt != "Aug 28 at 10:59am (Europe/Warsaw)" {
		t.Fatalf("limits[1]=%+v", limits[1])
	}

	var haveDepth0, haveDepth1 bool
	for _, d := range details {
		if d.Label == "Last 24h" && d.Value == "409 requests · 4 sessions" && d.Depth == 0 {
			haveDepth0 = true
		}
		if d.Depth == 1 {
			haveDepth1 = true
		}
	}
	if !haveDepth0 {
		t.Fatalf("missing Last 24h header detail: %+v", details)
	}
	if !haveDepth1 {
		t.Fatalf("missing indented bullet detail: %+v", details)
	}
}

func TestParseClaudeUsageEdges(t *testing.T) {
	cases := map[string]struct {
		limits, details int
	}{
		"":                                       {0, 0},
		"garbage\nno numbers here":               {0, 0},
		"\x1b[32mCurrent week: 100% used\x1b[0m": {1, 0},
		"Current week: 100% used":                {1, 0}, // no "resets" → empty ResetAt, still one limit
	}
	for in, want := range cases {
		limits, details := parseClaudeUsage(in)
		if len(limits) != want.limits || len(details) != want.details {
			t.Errorf("parseClaudeUsage(%q) = %d limits, %d details; want %d, %d", in, len(limits), len(details), want.limits, want.details)
		}
	}

	limits, _ := parseClaudeUsage("Current week: 100% used")
	if len(limits) != 1 || limits[0].Percent != 100 || limits[0].ResetAt != "" {
		t.Fatalf("no-resets case: %+v", limits)
	}
}

func TestSumGrokTokens(t *testing.T) {
	in := strings.Join([]string{
		`{"params":{"update":{"usage":{"inputTokens":100,"outputTokens":10,"totalTokens":110}}}}`,
		`not json at all`,
		`{"params":{"update":{"usage":{"inputTokens":200,"outputTokens":20,"totalTokens":220}}}}`,
	}, "\n")

	in64, out64, total, calls := sumGrokTokens(strings.NewReader(in))
	if in64 != 300 || out64 != 30 || total != 330 || calls != 2 {
		t.Fatalf("got in=%d out=%d total=%d calls=%d", in64, out64, total, calls)
	}
}
