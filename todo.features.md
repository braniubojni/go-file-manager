# Feature backlog

Not commitments — ideas to triage. Check here before proposing new features (see root `AGENTS.md`).

## Bugs

## Core file-manager gaps (Double Commander parity)

- [x] Archive support: browse zip/tar as virtual folder, extract/compress via context menu
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

## Remote drives

- [x] In case of apple let's add into remote connections include iCloud Drive
- [ ] Google Drive / MEGA — research only (no code yet)
  - **Google Drive (easy later, same as iCloud):** Drive for desktop is a local folder. macOS File Provider: `~/Library/CloudStorage/GoogleDrive-<account>/` (location locked by macOS). [Drive for desktop on macOS](https://support.google.com/drive/answer/12178485). Older streaming mount: `/Volumes/GoogleDrive`. Windows: drive letter (`G:`) or `%USERPROFILE%\Google Drive`. Later: scan `CloudStorage` for `GoogleDrive-` like [`internal/filesystem/icloud.go`](internal/filesystem/icloud.go).
  - **Google Drive in-app (no desktop app):** Drive API v3 + OAuth (Cloud project, refresh tokens, keychain) — heavy. rclone: [rclone.org/drive](https://rclone.org/drive/).
  - **MEGA (not a fixed folder):** Desktop syncs to user-chosen paths. [How desktop sync works](https://help.mega.io/desktop-app/desktop-syncs/how-does-syncing-work). macOS config: `~/Library/Application Support/Mega Limited/MEGAsync/`. Windows: `%LOCALAPPDATA%\Mega Limited\MEGAsync\MEGAsync.cfg` (base64 values, not a public path API). [Locate MEGAsync folder](https://stackoverflow.com/questions/29555905/how-do-i-programmatically-locate-my-megasync-folder).
  - **MEGA in-app later:** official C++ SDK [github.com/meganz/sdk](https://github.com/meganz/sdk) / [developers](https://megalink.nz/developers) (CGO). Go client [github.com/t3rm1n4l/go-mega](https://github.com/t3rm1n4l/go-mega) (real remote like SMB). rclone: [rclone.org/mega](https://rclone.org/mega/).
  - **Later pick:** Google Drive = iCloud-style local shortcut. MEGA = fragile cfg parse or full remote backend — not a Finder CloudStorage folder.

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
- [x] Same folder in other pane (toolbar + Ctrl+←/→)
- [x] Remember last window size (default wide enough for all columns)
- [x] Command palette (Cmd+K) for actions/shortcuts discoverability
- [x] Toast/undo for delete-to-trash instead of hard delete
- [x] In case of rename when dialog is opened and input is focused we need to preselect the text(not including extension) so that user was able to edit the name immidently

## Editor/terminal

- [x] Split terminal per pane, cwd synced to active pane
- [x] Open-with menu (external app picker per OS)

## Other

- [x] Port killer — toolbar popover (next to Settings): local TCP listeners, inline kill, tree view, kill all
- [x] Port killer tabs: Local Ports + Processes (lazy), kill by PID, tags for known services
- [ ] Trash/recycle bin integration (soft delete, restore) instead of permanent delete
- [ ] Disk usage treemap view (like WinDirStat) per folder
- [ ] Plugin/extension points — low priority, only if long-term extensibility actually needed
- [ ] New settings to show only in the tray or both tray and system menu
- [x] Fast copy/move: APFS clonefile / Linux FICLONE+copy_file_range / Windows CopyFile; same-host SFTP via remote `cp`
- [ ] Progress dialog for long copy/move ops (async status, minimize, per-pane source/dest)
- [x] Add into right click menu option to open terminal and open finder in the specific folder
- [x] If in clipboard we have photo/video or any binary file and user clicks on pane then ctrl/cmd+v, we need to paste that content
