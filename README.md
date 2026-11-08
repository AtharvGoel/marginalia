# EPUB Reader — 0.3

An offline Windows desktop reader for DRM-free, reflowable EPUB books.

**Review future features and priorities in [ROADMAP.md](ROADMAP.md).** This includes the personal bookshelf redesign, linked folders with automatic importing, and finding a good name for the app.

## Install or uninstall

Open `release/EPUB Reader Setup 0.3.0.exe` to install on Windows 11 x64. Packaged apps do not need Node.js installed.

To uninstall:
- Open **Windows Settings → Apps → Installed apps → EPUB Reader → Uninstall**, or
- Run **Uninstall EPUB Reader.exe** in the installation folder.

The uninstaller removes the app and its shortcuts and keeps your imported books, bookmarks, positions, and preferences. Your original EPUB files are untouched. Signing and Microsoft Store submission have not been performed; local builds may show an unknown-publisher warning.

## Review without reinstalling

Close any running EPUB Reader, then open `release/win-unpacked/EPUB Reader.exe`. This build uses your existing library. Run the 0.3 installer when you want your installed shortcuts to launch the update.

The first 0.3 launch upgrades saved preferences and creates a SQLite backup for existing 0.2 libraries. Use 0.3 or newer afterward; older builds cannot read the upgraded settings database.

## Reading controls

- Collapse/restore the sidebar with **☰**. Drag its right edge to resize; the focused divider also accepts arrow keys, Home, and End.
- Chapters get most of the sidebar height, and the current chapter is highlighted and kept in view.
- Open **Aa** for the original book font or Georgia, Segoe UI, and Consolas; line spacing; margins; reading width; and pages versus continuous scrolling.
- Text size and light/sepia/dark themes remain available in the toolbar.
- Use the fullscreen button or **F11**. **Escape** exits fullscreen.
- Preferences are saved automatically. Layout changes preserve the current passage.

## Run from source

Use Node.js 22.12 or newer and npm.

```powershell
cd E:\epub_reader
npm ci
npm run build
npm start
```

Use `npm run dev` for development. Your existing system Node was left unchanged; development commands can also be run using a temporary Node 22 runtime.

## Reading features

- Multiple-book import with duplicate detection.
- Library search and recent-reading order.
- Chapter navigation, previous/next buttons, and arrow keys.
- Light, sepia, and dark themes; adjustable text size.
- Saved reading positions, bookmarks, and full-text search (first 100 results).
- Offline operation with disabled book scripts and blocked remote requests.

New imports use the EPUB's embedded title and author immediately, regardless of the filename. Embedded artwork appears on the bookshelf, with the title kept below it. Surname-first author entries such as "Austen, Jane" display as "Jane Austen"; original metadata is retained. Older entries refresh as their bookshelf cards load. Missing, damaged, unsupported, or vector-only artwork uses the text-cover fallback. Complex fixed-layout books, DRM-protected EPUBs, PDFs, and audio/video are outside current support.

## What's new in 0.3

- Compact, collapsible and resizable chapter navigation with a current-chapter marker.
- Adjustable font, line spacing, margins, and maximum reading width.
- Continuous scrolling across chapters alongside page turning.
- Fullscreen controls and keyboard shortcuts.
- Persistent comfort settings with a backup-backed schema upgrade.
- Reflow and chapter jumps aligned to the saved EPUB passage.

## Bookshelf improvements in 0.2.1

- Embedded EPUB cover artwork, including EPUB 3 cover-image, EPUB 2 cover metadata, and cover-page references to raster images.
- Cached local thumbnails, with graceful fallback and no external artwork downloads.
- Immediate metadata titles at import and refreshed metadata for existing books.
- Given-name-first author display and matching author search.
- Long bookshelf titles wrap beneath covers.
- The cramped Chapters panel was subsequently addressed in 0.3.

## Foundation in 0.2

- Separate modules for library, reading, navigation, settings, and EPUB integration.
- SQLite storage for book metadata, positions, bookmarks, and preferences.
- Automatic 0.1 data migration with backups and rollback.
- Migration and reading checks covering images, footnotes, resizing, persistence, and damaged imports.
- Explicit uninstaller settings that preserve reading data.

## Data and backups

Use Electron's per-user application-data directory (normally under `%APPDATA%`) for this app:
- `books/`: app-managed EPUB copies.
- `covers/`: disposable cached thumbnails and embedded presentation metadata.
- `library.sqlite`: SQLite metadata and reading preferences.
- `backups/`: automatic legacy JSON backups and pre-upgrade SQLite snapshots.
- `library.json`: retained 0.1 source, if one existed.

Close the app before manually backing up the complete data directory. Do not delete SQLite WAL/SHM files while it is running.

The migration keeps original JSON and imported EPUB copies. If migration fails, the app stops with an error rather than replacing saved data. Avoid downgrading an upgraded library. Version 0.1 uses an old JSON snapshot; 0.2.x refuses the newer schema used by 0.3. Keep migration backups for recovery.

Imports are limited to 100 MB compressed and 300 MB expanded. No accounts, analytics, or cloud services are used.

## Verification

```powershell
npm test
npm run build
npm run test:desktop
npm audit --audit-level=moderate
npm run dist
```

Desktop tests use generated EPUB content and isolated temporary data/profile folders. Installer tests use a separate app identity. See [validation](docs/VALIDATION.md) for exact coverage and remaining limits.

Windows GitHub Actions run on pushes and pull requests. A separate packaging workflow produces an installer artifact on manual invocation or version tags. Build outputs, personal EPUBs, and reading data are excluded from Git.

See [architecture](docs/ARCHITECTURE.md) for implementation details.

Source remains private-use / all rights reserved pending the owner's license decision. A free Store price does not require public source code.
