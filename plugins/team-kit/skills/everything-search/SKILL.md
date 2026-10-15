---
name: everything-search
description: Fast filename search on this Windows machine using the Everything index (voidtools). Use INSTEAD OF Get-ChildItem -Recurse, find, or full-disk Glob whenever locating files by name, extension, size, or date across the drive - Everything answers in milliseconds where a recursive scan takes minutes. Triggers on "find the file", "where is", "do I have", "search the disk for", "locate", or any whole-drive file hunt.
---

# Everything search

Everything (voidtools) keeps a live NTFS index of every filename on the machine.
Querying it is ~instant. A `Get-ChildItem -Path 'C:\' -Recurse` is 3-15 minutes and
often dies on permissions. **Always try this first for name/extension/size/date lookups.**

Not a content search. For "which file *contains* this text", use Grep.

## Run it

```
powershell -NoProfile -ExecutionPolicy Bypass -File "<this skill's base directory>\es-search.ps1" -Query "<query>" [-Max 100] [-SortBy size|date|name|path]
```

Outputs TSV: `SizeBytes<TAB>Modified<TAB>FullPath`, newest/largest first depending on `-SortBy`.
Exit code 3 = backend not available; the script prints the setup steps. Relay them, don't guess.

## Query syntax (Everything's own)

| Need | Query |
|---|---|
| by extension | `ext:wav;mp3;flac` |
| scoped to a folder | `path:"C:\Users\<you>\Desktop"` |
| name contains | `karnal` |
| exact phrase | `"red dragon"` |
| OR | `karnal \| omega weapon` |
| NOT | `ext:wav !path:AppData` - **must name a field**; bare `!AppData` is silently ignored |
| size | `size:>50mb` `size:1mb..10mb` |
| date modified | `dm:today` `dm:2025` `dm:2024-01..2024-06` |
| folders only | `folder:` |
| files only | `file:` |
| regex | `regex:^KARNAL - .*\.mp3$` |
| case sensitive | `case:Karnal` |

Combine with spaces (AND): `ext:als path:"C:\Users\<you>" dm:2025`

## Worked examples

```powershell
# every Ableton project on the machine, newest first
-Query 'ext:als;alp' -SortBy date

# large lossless audio outside sample libraries
-Query 'ext:wav;flac size:>20mb !path:"Factory Packs" !path:Splice !path:"Core Library"'

# a specific track under any name
-Query '"red dragon" | "rex invictus" | gladius'

# stems folders
-Query 'folder: emperor'
```

## Gotchas learned the hard way

- **Everything must be running as a client in the INTERACTIVE session.** The Everything
  *service* alone (SessionId 0) is not enough - es.exe talks to the client's IPC window and
  fails with `Error 8: Everything IPC not found`. Fix:
  `Start-Process 'C:\Program Files\Everything\Everything.exe' -ArgumentList '-startup'`
  (starts in tray, no window). Confirm with FindWindow on `EVERYTHING_TASKBAR_NOTIFICATION`.
- **Negation needs a field.** `!path:Backup` works; bare `!Backup` is silently ignored and
  returns the unfiltered set - it will look like it worked.
- **One quoted string = a literal phrase.** `"ext:als Backup"` finds nothing. Separate
  arguments are ANDed. The wrapper script handles this splitting; if calling es.exe
  directly, pass terms as separate args.
- `-get-result-count <query>` is the cheap way to size a result set before listing it.

## Setup (one-time, if the script reports backend missing)

Windows only. Install Everything from https://www.voidtools.com/ (default location
`C:\Program Files\Everything\Everything.exe`), then enable a query interface. **Either** works - HTTP needs no download.

**Option A - HTTP server (no download):**
In Everything: `Tools > Options > HTTP Server` > tick **Enable HTTP server** > port `8080` > OK.
The script then finds it automatically.

**Option B - ES command line:**
Download `ES-1.1.0.x.zip` from https://www.voidtools.com/downloads/ (section "Everything Command Line Interface"),
extract `es.exe` to `C:\Program Files\Everything\` or anywhere on PATH.

Everything must be running for either to answer. It normally starts with Windows.

## Notes

- Indexes local NTFS volumes only. Network shares and non-indexed drives need the normal tools.
- Results are filenames and metadata. Confirm contents by reading the file.
- The index is live, so a file created seconds ago is already findable.
- Prefer narrowing with `path:` and `ext:` over `-Max` - it keeps output small and relevant.
