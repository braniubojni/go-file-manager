# Feature backlog

Not commitments — ideas to triage. Check here before proposing new features (see root `AGENTS.md`).

## Bugs

- [ ] Archive cancel does not work, even after cancel button is clicked, the operation is not cancelled
- [ ] I have no idea why but I have zip file that was encrypted by our app and now when I try to open it, it does not asks for password, meanwhile finder asks for password and opens the file.

## Core file-manager gaps (Double Commander parity)

- [ ] Quick view panel (F3-style preview: images, text, PDF) without opening editor
- [ ] Folder compare/sync (diff two dirs, sync one-way or two-way)
- [ ] Batch rename (pattern-based, regex, counter)
- [ ] Checksum/hash tool (MD5/SHA) to verify after copy
- [ ] Symlink/hardlink create + follow toggle

## Search

- [ ] Filter results by size/date/type
- [ ] Save search as smart folder
- [ ] Search inside archives

## Remote drives

- [x] Google Drive local shortcut — `internal/filesystem/googledrive.go` scans `~/Library/CloudStorage/GoogleDrive-*`, `/Volumes/GoogleDrive`, `~/Google Drive`, same pattern as [`internal/filesystem/icloud.go`](internal/filesystem/icloud.go); Connections menu Cloud section lists one entry per account.
  - **Google Drive in-app (no desktop app):** Drive API v3 + OAuth (Cloud project, refresh tokens, keychain) — heavy, not done. rclone: [rclone.org/drive](https://rclone.org/drive/).
- [x] MEGA in-app remote (`mega://user@domain/path`) via [`t3rm1n4l/go-mega`](https://github.com/t3rm1n4l/go-mega) — Connections menu, list/CRUD, local↔MEGA copy. Not a Finder CloudStorage folder; MEGAsync.cfg parse skipped.

## Remote/SFTP

- [ ] FTP support
- [ ] SMB Kerberos / ticket auth (NTLM only in V1)
- [ ] Copy/move between SSH and SMB in one step
- [ ] Persist remote passwords (SSH/SMB) in OS keychain
- [ ] SMB discovery / Bonjour browse for nearby shares
- [ ] Create-empty-file / archive / search on remote (SSH and SMB)
- [ ] Saved connection profiles (host/user/key) in SQLite alongside bookmarks
- [ ] SSH key auth UI (not just password) — pick key file, agent forwarding
- [ ] Remote tab reconnect on drop, connection status indicator per pane
- [ ] Parallel transfer progress + pause/resume/cancel for large SFTP copies
- [ ] Progress bar also for archive operations
- [ ] Handle go to file/folder in case of remote
- [ ] Handle search in remote connections as well
- [ ] Handle file/folder creation
- [ ] Implement OpenSSH Post-Quantum Cryptography in order to avoid this warnings

```bash
** WARNING: connection is not using a post-quantum key exchange algorithm.
** This session may be vulnerable to "store now, decrypt later" attacks.
** The server may need to be upgraded. See https://openssh.com/pq.html
```

## UI/UX polish

## Editor/terminal

## Other

- [ ] Smart tool that will analyze the files and folders and will highlight the files that are similar to each other(by content or by name, by metadata and etc.). It should be able to work with the files in the all remote connections as well. Let's also have OCR I want functionality that will going to find duplicates and if user need it it will show in dialog percentage of two photos together and user will be able to select all or select one by one, then remove it. Tool should work everywhere. sftp, google drive, icloude, SMB, Mega
- [ ] Trash/recycle bin integration (soft delete, restore) instead of permanent delete
- [ ] Disk usage treemap view (like WinDirStat) per folder
- [ ] Plugin/extension points — low priority, only if long-term extensibility actually needed
- [ ] New settings to show only in the tray or both tray and system menu
