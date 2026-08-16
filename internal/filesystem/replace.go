package filesystem

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"unicode/utf8"
)

// ReplaceOccurrence replaces exactly one occurrence of find at the given 1-based line/column.
// Column is 1-based byte index into the line (matching ContentSearchHit.Column).
func ReplaceOccurrence(path, find, replace string, line, column int, caseSensitive bool) error {
	if find == "" {
		return fmt.Errorf("empty find string")
	}
	if line < 1 || column < 1 {
		return fmt.Errorf("invalid line/column")
	}
	content, err := ReadTextFile(path)
	if err != nil {
		return err
	}
	lines := splitKeepEnds(content)
	if line > len(lines) {
		return fmt.Errorf("line %d out of range", line)
	}
	// lines[i] may include trailing \n
	raw := lines[line-1]
	body, nl := stripNL(raw)
	col := column - 1
	if col > len(body) {
		return fmt.Errorf("column %d out of range", column)
	}

	matchLen, ok := matchAt(body, col, find, caseSensitive)
	if !ok {
		return fmt.Errorf("no match at %s:%d:%d", path, line, column)
	}
	newBody := body[:col] + replace + body[col+matchLen:]
	lines[line-1] = newBody + nl
	return WriteTextFile(path, strings.Join(lines, ""))
}

// ReplaceAllInFile replaces every occurrence of find in the file. Returns count of replacements.
func ReplaceAllInFile(path, find, replace string, caseSensitive bool) (int, error) {
	if find == "" {
		return 0, fmt.Errorf("empty find string")
	}
	content, err := ReadTextFile(path)
	if err != nil {
		return 0, err
	}
	newContent, n := replaceAllString(content, find, replace, caseSensitive)
	if n == 0 {
		return 0, nil
	}
	if err := WriteTextFile(path, newContent); err != nil {
		return 0, err
	}
	return n, nil
}

// ReplaceAllInPaths replaces find in each path once (all occurrences per file).
// Missing, binary, and oversize files are skipped; other errors abort the batch.
func ReplaceAllInPaths(paths []string, find, replace string, caseSensitive bool) (filesChanged, replacements int, err error) {
	seen := make(map[string]struct{}, len(paths))
	for _, p := range paths {
		abs, rerr := Resolve(p)
		if rerr != nil {
			return filesChanged, replacements, rerr
		}
		if _, ok := seen[abs]; ok {
			continue
		}
		seen[abs] = struct{}{}
		n, rerr := ReplaceAllInFile(abs, find, replace, caseSensitive)
		if rerr != nil {
			if isSkippableReplaceError(rerr) {
				continue
			}
			return filesChanged, replacements, rerr
		}
		if n > 0 {
			filesChanged++
			replacements += n
		}
	}
	return filesChanged, replacements, nil
}

// isSkippableReplaceError reports errors that should not abort a multi-file replace.
func isSkippableReplaceError(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, ErrNotFound) || errors.Is(err, ErrBinary) || errors.Is(err, ErrTooLarge) {
		return true
	}
	return os.IsNotExist(err)
}

func matchAt(body string, col int, find string, caseSensitive bool) (int, bool) {
	if caseSensitive {
		if col+len(find) > len(body) {
			return 0, false
		}
		if body[col:col+len(find)] != find {
			return 0, false
		}
		return len(find), true
	}
	// case-insensitive: compare lowercased slices with equal rune fold
	rest := body[col:]
	if strings.HasPrefix(strings.ToLower(rest), strings.ToLower(find)) {
		// length of match in original bytes: walk runes
		fr := []rune(strings.ToLower(find))
		rr := []rune(rest)
		if len(rr) < len(fr) {
			return 0, false
		}
		matched := string(rr[:len(fr)])
		return len(matched), true
	}
	return 0, false
}

func replaceAllString(content, find, replace string, caseSensitive bool) (string, int) {
	if caseSensitive {
		n := strings.Count(content, find)
		if n == 0 {
			return content, 0
		}
		return strings.ReplaceAll(content, find, replace), n
	}
	// case-insensitive replace preserving find length via EqualFold scan
	var b strings.Builder
	b.Grow(len(content))
	lowerFind := strings.ToLower(find)
	n := 0
	i := 0
	for i < len(content) {
		// try match at i
		rest := content[i:]
		lowerRest := strings.ToLower(rest)
		if strings.HasPrefix(lowerRest, lowerFind) {
			// consume len(find) runes from rest
			fr := []rune(lowerFind)
			rr := []rune(rest)
			if len(rr) >= len(fr) {
				matched := string(rr[:len(fr)])
				b.WriteString(replace)
				i += len(matched)
				n++
				continue
			}
		}
		// advance one rune
		_, size := utf8.DecodeRuneInString(content[i:])
		if size < 1 {
			size = 1
		}
		b.WriteString(content[i : i+size])
		i += size
	}
	return b.String(), n
}

func splitKeepEnds(s string) []string {
	if s == "" {
		return []string{""}
	}
	var lines []string
	start := 0
	for i := 0; i < len(s); i++ {
		if s[i] == '\n' {
			lines = append(lines, s[start:i+1])
			start = i + 1
		}
	}
	if start < len(s) {
		lines = append(lines, s[start:])
	}
	if len(lines) == 0 {
		lines = []string{s}
	}
	return lines
}

func stripNL(s string) (body, nl string) {
	if strings.HasSuffix(s, "\r\n") {
		return s[:len(s)-2], "\r\n"
	}
	if strings.HasSuffix(s, "\n") {
		return s[:len(s)-1], "\n"
	}
	return s, ""
}
