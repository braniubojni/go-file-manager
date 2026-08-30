package filesystem

import (
	"os"
	"path/filepath"
	"testing"
)

func TestWorkerCount(t *testing.T) {
	t.Parallel()
	if n := WorkerCount(IOSSD, 1); n != 1 {
		t.Fatalf("single file: %d", n)
	}
	if n := WorkerCount(IOHDD, 1); n != 1 {
		t.Fatalf("single hdd: %d", n)
	}
	if n := WorkerCount(IOHDD, 20); n != hddCopyWorkers {
		t.Fatalf("hdd: %d", n)
	}
	if n := WorkerCount(IONetwork, 100); n != networkCopyWorkers {
		t.Fatalf("network: %d", n)
	}
	if n := WorkerCount(IONetwork, 8); n != 8 {
		t.Fatalf("network capped by files: %d", n)
	}
}

func TestWorkerCountSSD(t *testing.T) {
	old := numCPU
	t.Cleanup(func() { numCPU = old })

	numCPU = func() int { return 8 }
	if n := WorkerCount(IOSSD, 100); n != 16 {
		t.Fatalf("8 cpu: %d", n)
	}
	numCPU = func() int { return 1 }
	if n := WorkerCount(IOSSD, 100); n != minSSDCopyWorkers {
		t.Fatalf("1 cpu min: %d", n)
	}
	numCPU = func() int { return 64 }
	if n := WorkerCount(IOSSD, 1000); n != maxCopyWorkers {
		t.Fatalf("cap: %d", n)
	}
	numCPU = func() int { return 8 }
	if n := WorkerCount(IOSSD, 3); n != 3 {
		t.Fatalf("files cap: %d", n)
	}
}

func TestMinWorkerCount(t *testing.T) {
	t.Parallel()
	if n := minWorkerCount(100, IOSSD, IOHDD); n != hddCopyWorkers {
		t.Fatalf("ssd+hdd: %d", n)
	}
	if n := minWorkerCount(100, IONetwork, IOHDD); n != hddCopyWorkers {
		t.Fatalf("net+hdd: %d", n)
	}
	if n := CopyWorkersWith(IONetwork, nil, 100); n != networkCopyWorkers {
		t.Fatalf("network extra: %d", n)
	}
}

func TestParseDiskutilClass(t *testing.T) {
	t.Parallel()
	ssd := `<?xml version="1.0"?>
<dict>
	<key>SolidState</key>
	<true/>
	<key>BusProtocol</key>
	<string>PCI-Express</string>
</dict>`
	if c := parseDiskutilClass(ssd); c != IOSSD {
		t.Fatalf("ssd: %v", c)
	}
	hdd := `<?xml version="1.0"?>
<dict>
	<key>SolidState</key>
	<false/>
	<key>BusProtocol</key>
	<string>SATA</string>
</dict>`
	if c := parseDiskutilClass(hdd); c != IOHDD {
		t.Fatalf("hdd: %v", c)
	}
	optical := `<?xml version="1.0"?>
<dict>
	<key>OpticalDeviceType</key>
	<string>CD-ROM</string>
	<key>SolidState</key>
	<true/>
</dict>`
	if c := parseDiskutilClass(optical); c != IOHDD {
		t.Fatalf("optical: %v", c)
	}
}

func TestParseProcMounts(t *testing.T) {
	t.Parallel()
	data := `/dev/sda1 / ext4 rw 0 0
server:/export /mnt/nfs nfs4 rw 0 0
//host/share /mnt/smb cifs rw 0 0
/dev/sdb1 /mnt/data\040disk ext4 rw 0 0
`
	fs, mp, ok := parseProcMounts(data, "/mnt/nfs/home/user")
	if !ok || fs != "nfs4" || mp != "/mnt/nfs" {
		t.Fatalf("nfs: fs=%s mp=%s ok=%v", fs, mp, ok)
	}
	fs, mp, ok = parseProcMounts(data, "/mnt/smb/folder")
	if !ok || fs != "cifs" || mp != "/mnt/smb" {
		t.Fatalf("cifs: fs=%s mp=%s ok=%v", fs, mp, ok)
	}
	fs, mp, ok = parseProcMounts(data, "/mnt/data disk/file")
	if !ok || fs != "ext4" || mp != "/mnt/data disk" {
		t.Fatalf("escaped: fs=%s mp=%s ok=%v", fs, mp, ok)
	}
	if _, _, ok := parseProcMounts(data, "/not/mounted"); ok {
		t.Fatal("expected miss")
	}
}

func TestIsNetworkFS(t *testing.T) {
	t.Parallel()
	for _, fs := range []string{"smbfs", "nfs", "nfs4", "cifs", "fuse.sshfs"} {
		if !isNetworkFS(fs) {
			t.Fatalf("%s should be network", fs)
		}
	}
	if isNetworkFS("apfs") || isNetworkFS("ext4") {
		t.Fatal("local fs marked network")
	}
}

func TestRotationalAt(t *testing.T) {
	root := t.TempDir()
	hdd := filepath.Join(root, "dev", "block", "8:1", "queue")
	if err := os.MkdirAll(hdd, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(hdd, "rotational"), []byte("1\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	rot, ok := rotationalAt(root, 8, 1)
	if !ok || !rot {
		t.Fatalf("hdd: rot=%v ok=%v", rot, ok)
	}

	ssdRoot := t.TempDir()
	parent := filepath.Join(ssdRoot, "devices", "pci", "block", "nvme0n1")
	part := filepath.Join(parent, "nvme0n1p1")
	if err := os.MkdirAll(filepath.Join(parent, "queue"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(part, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(parent, "queue", "rotational"), []byte("0\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	dev := filepath.Join(ssdRoot, "dev", "block")
	if err := os.MkdirAll(dev, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(part, filepath.Join(dev, "259:1")); err != nil {
		t.Fatal(err)
	}
	rot, ok = rotationalAt(ssdRoot, 259, 1)
	if !ok || rot {
		t.Fatalf("ssd walk: rot=%v ok=%v", rot, ok)
	}
}

func TestIOClassForTempDir(t *testing.T) {
	class := IOClassFor(t.TempDir())
	if class != IOSSD && class != IOHDD && class != IONetwork {
		t.Fatalf("unexpected class %v", class)
	}
}
