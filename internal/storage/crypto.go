package storage

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

const (
	keyFileName   = "app.key"
	cipherVersion = 1
)

// loadOrCreateKey returns a 32-byte AES key stored next to the DB (mode 0600).
func loadOrCreateKey(dir string) ([]byte, error) {
	path := filepath.Join(dir, keyFileName)
	data, err := os.ReadFile(path)
	if err == nil {
		if len(data) != 32 {
			return nil, fmt.Errorf("invalid key file length %d", len(data))
		}
		return data, nil
	}
	if !os.IsNotExist(err) {
		return nil, err
	}
	key := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, key); err != nil {
		return nil, err
	}
	if err := os.WriteFile(path, key, 0o600); err != nil {
		return nil, err
	}
	return key, nil
}

// seal encrypts plaintext with AES-256-GCM. Format: version(1) | nonce | ciphertext+tag.
func seal(key, plaintext []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, err
	}
	// out = version | nonce | sealed
	sealed := gcm.Seal(nil, nonce, plaintext, nil)
	out := make([]byte, 1+len(nonce)+len(sealed))
	out[0] = cipherVersion
	copy(out[1:], nonce)
	copy(out[1+len(nonce):], sealed)
	return out, nil
}

// open decrypts data produced by seal.
func open(key, blob []byte) ([]byte, error) {
	if len(blob) < 2 {
		return nil, fmt.Errorf("ciphertext too short")
	}
	if blob[0] != cipherVersion {
		return nil, fmt.Errorf("unsupported cipher version %d", blob[0])
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	ns := gcm.NonceSize()
	if len(blob) < 1+ns {
		return nil, fmt.Errorf("ciphertext too short for nonce")
	}
	nonce := blob[1 : 1+ns]
	return gcm.Open(nil, nonce, blob[1+ns:], nil)
}
