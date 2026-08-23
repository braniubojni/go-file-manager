# Feature backlog

Not commitments — ideas to triage. Check here before proposing new features (see root `AGENTS.md`).

## Bugs

## Core file-manager gaps (Double Commander parity)

- [ ] Archive support: browse zip/tar as virtual folder, extract/compress via context menu
- [x] DMG as folder (macOS): double-click attaches via hdiutil, browse/copy like a directory, unmount from drives menu
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

- [x] SMB support — in-app `smb://` browse, Finder-style share picker (`cloudsoda/go-smb2`)
- [x] Title of SSH can be changed to SSH/SFTP cuz we support both protocols at this moment not just SSH
- [ ] FTP support
- [ ] SMB Kerberos / ticket auth (NTLM only in V1)
- [x] OS-level SMB mount — volumes menu (`/Volumes`, unmount); Finder SMB shares listed as network drives
- [ ] Copy/move between SSH and SMB in one step
- [ ] Persist remote passwords (SSH/SMB) in OS keychain
- [ ] SMB discovery / Bonjour browse for nearby shares
- [ ] Create-empty-file / archive / search on remote (SSH and SMB)
- [ ] Saved connection profiles (host/user/key) in SQLite alongside bookmarks
- [ ] SSH key auth UI (not just password) — pick key file, agent forwarding
- [ ] Remote tab reconnect on drop, connection status indicator per pane
- [ ] Parallel transfer progress + pause/resume/cancel for large SFTP copies

## UI/UX polish

- [x] Clickable breadcrumb path segments (not just Autocomplete bar) - `https://mui.com/material-ui/react-breadcrumbs/`
- [x] Column customization: show/hide, reorder, per-pane sort persist - `https://mui.com/x/react-data-grid/column-visibility/`
- [x] Status bar: selected count, total size, free disk space
- [x] Command palette (Cmd+K) for actions/shortcuts discoverability
- [x] Toast/undo for delete-to-trash instead of hard delete

## Editor/terminal

- [x] Split terminal per pane, cwd synced to active pane
- [x] Open-with menu (external app picker per OS)

## Other

- [ ] Trash/recycle bin integration (soft delete, restore) instead of permanent delete
- [ ] Disk usage treemap view (like WinDirStat) per folder
- [ ] Plugin/extension points — low priority, only if long-term extensibility actually needed
- [ ] New settings to show only in the tray or both tray and system menu
- [ ] Progress dialog for long copy/move ops (async status, minimize, per-pane source/dest)
