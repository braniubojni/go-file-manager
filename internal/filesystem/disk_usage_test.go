package filesystem

import "testing"

func TestDiskUsageTempDir(t *testing.T) {
	dir := t.TempDir()
	u, err := DiskUsage(dir)
	if err != nil {
		t.Fatal(err)
	}
	if u.Total <= 0 {
		t.Fatalf("Total = %d, want > 0", u.Total)
	}
	if u.Free <= 0 {
		t.Fatalf("Free = %d, want > 0", u.Free)
	}
	if u.Free > u.Total {
		t.Fatalf("Free %d > Total %d", u.Free, u.Total)
	}
	if u.Used < 0 {
		t.Fatalf("Used = %d, want >= 0", u.Used)
	}
	// Reserved blocks (root-only) mean Used+Free may be less than Total.
	const block = int64(1 << 20)
	if u.Used+u.Free > u.Total+block {
		t.Fatalf("Used+Free = %d > Total+block = %d (total=%d used=%d free=%d)",
			u.Used+u.Free, u.Total+block, u.Total, u.Used, u.Free)
	}
	if u.Path == "" {
		t.Fatal("Path is empty")
	}
}
