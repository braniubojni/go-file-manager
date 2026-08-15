# Feature backlog

Not commitments — ideas to triage. Check here before proposing new features (see root `AGENTS.md`).

## Bugs

- [x] Dialog `Connect from SSH config` picker of config gives back an error of `openssh sftp: ssh: connect to host 192.168.0.5 port 22: Operation timed out (error receiving version packet from server: server unexpectedly closed connection: unexpected EOF)` — fixed: use `ssh dest -s sftp`, honor config file via `-F`, stop double-timeout native fallback on connection errors, surface errors in dialog; if host is truly unreachable, timeout still expected
- [x] Dialog `Create folder` when I click `Enter` dialog does not close — form submit + Enter handler
- [x] Good when I click on letter scroll goes to file/folder but when I continue to press the same letter scroll and highlight does not go to the next file/folder — type-ahead cycles same letter
- [x] UI/UX issue when I am tring to drag and drop from remote server to local(cursor shows that I am not allowed to do it, meanwhile it did) — drop validity mirrors pane fallthrough

## Core file-manager gaps (Double Commander parity)

- [ ] Archive support: browse zip/tar as virtual folder, extract/compress via context menu
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

- [ ] SMB support
- [ ] Title of SSH can be changed to SSH/SFTP cuz we support both protocols at this moment not just SSH
- [ ] Saved connection profiles (host/user/key) in SQLite alongside bookmarks
- [ ] SSH key auth UI (not just password) — pick key file, agent forwarding
- [ ] Remote tab reconnect on drop, connection status indicator per pane
- [ ] Parallel transfer progress + pause/resume/cancel for large SFTP copies

## UI/UX polish

- [ ] Clickable breadcrumb path segments (not just Autocomplete bar) - `https://mui.com/material-ui/react-breadcrumbs/`
- [ ] Column customization: show/hide, reorder, per-pane sort persist - `https://mui.com/x/react-data-grid/column-visibility/`
- [ ] Status bar: selected count, total size, free disk space
- [ ] Command palette (Cmd+K) for actions/shortcuts discoverability
- [ ] Toast/undo for delete-to-trash instead of hard delete
- [ ] Progress dialog for long copy/move ops (verify async status in `internal/filesystem`), progress dialog with minimize functionality, per pane progress(dialog should show source and destination)

## Editor/terminal

- [ ] Split terminal per pane, cwd synced to active pane
- [ ] Open-with menu (external app picker per OS)

## Other

- [ ] Trash/recycle bin integration (soft delete, restore) instead of permanent delete
- [ ] Disk usage treemap view (like WinDirStat) per folder
- [ ] Plugin/extension points — low priority, only if long-term extensibility actually needed
- [ ] New settings to show only in the tray or both tray and system menu
