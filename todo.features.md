# Feature backlog

Not commitments — ideas to triage. Check here before proposing new features (see root `AGENTS.md`).

## Bugs

- [x] Archive cancel does not work, even after cancel button is clicked, the operation is not cancelled — fixed: ctx now threaded into encrypted-zip create (was ignored entirely) and per-member copies now check ctx per-chunk instead of only between archive entries.
- [x] I have no idea why but I have zip file that was encrypted by our app and now when I try to open it, it does not asks for password, meanwhile finder asks for password and opens the file. — fixed: reader now detects ZipCrypto-encrypted zips (stdlib archive/zip, used by mholt/archives, has no notion of it) and returns ErrPasswordRequired; app prompts and caches the password per archive for the session.

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
- [x] Progress bar also for archive operations — Archive/Extract now report byte progress on the same transfer-bar channel as Copy/Move (kind: "archive"/"extract"), replacing the indeterminate pane spinner for these two ops.
- [x] Handle go to file/folder in case of remote — SSH/SMB/MEGA now supported via a capped BFS over ListDir (see internal/service/remote_walk.go); content search stays local-only (would mean downloading every file).
- [x] Handle search in remote connections as well — folder-name search works remotely (same BFS); content search is local-only, radio disabled with an explanation on a remote pane.
- [x] Handle file/folder creation — New Folder already worked remotely (frontend was blocking it for no reason); New File now uses WriteTextFile("") against all three backends.
- [ ] Implement OpenSSH Post-Quantum Cryptography in order to avoid this warnings — **won't-fix, investigated**: `golang.org/x/crypto v0.54.0`'s Go SSH client already puts `mlkem768x25519-sha256` first in its default kex list, so our own connect path is already PQ. The warning is emitted by the _system_ `ssh` binary (our OpenSSH-passthrough connect path) and means the **remote Windows server** doesn't support PQ kex — nothing to fix client-side short of suppressing the warning with `-o LogLevel=ERROR`, which would hide a legitimate security notice instead.

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
