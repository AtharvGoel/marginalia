# Marginalia — 0.4.1

An offline Windows desktop reader for DRM-free, reflowable EPUB books.

**Review future features and priorities in [ROADMAP.md](ROADMAP.md).** This includes the personal bookshelf redesign, linked folders with automatic importing, annotations, and free ebook catalogue browsing.

## Install or uninstall

Open `release/Marginalia Setup 0.4.1.exe` to install on Windows 11 x64. Packaged apps do not need Node.js installed.

To uninstall:
- Open **Windows Settings → Apps → Installed apps → Marginalia → Uninstall**, or
- Run **Uninstall Marginalia.exe** in the installation folder.

The uninstaller removes the app and its shortcuts and keeps your imported books, bookmarks, positions, and preferences. Your original EPUB files are untouched. Signing and Microsoft Store submission have not been performed; local builds may show an unknown-publisher warning.

## Review without reinstalling

Close EPUB Reader or Marginalia if either is running, then open `release/win-unpacked/Marginalia.exe`. This build uses your existing library. Run the 0.4.1 installer when you want your installed shortcuts to launch the update.

The first 0.4 launch reuses your library and creates a SQLite backup before upgrading an older database. Use 0.4 or newer afterward; older builds cannot read the upgraded database.

## Highlights, notes, and web search

Select a passage in a book to open **Passage actions**:

- Choose yellow, green, blue, or pink to highlight it.
- Choose **Add note**, write your thought, and press **Save note**. A note can exist without a coloured highlight; those passages are underlined.
- Choose **Search on Web** to open a Google search for the selected text in your default browser. Only this explicit action sends the passage online.
- Click a saved highlight/underline or use the sidebar’s **Notes** tab to edit it. Highlights and notes can be removed independently. **Go to passage** returns to the original text.
- **Alt+M** focuses the passage actions; Escape closes them.

Annotations are saved locally and restored after restarting, resizing, changing fonts/themes, or switching between pages and continuous scrolling. Passage selections are limited to 20,000 characters, notes to 50,000, and web searches to 2,000. Native selection is within a chapter frame; cross-chapter selection is not provided. An in-app dictionary is still planned.

The first 0.4 launch takes a pre-upgrade SQLite snapshot and adds annotation storage. Keep that backup; use 0.4 or later afterward because older versions cannot read the new schema. The existing library folder stays the same.

## Name and artwork

The app is now **Marginalia**, using the owner’s supplied reading-room emblem and stylized name. The bookshelf shows the full branding; the reader uses a compact header so chapters retain their space. Windows executable, installer, shortcuts, and uninstall labels use the new name.

The internal application ID and `%APPDATA%\epub-reader` data directory stay stable. Upgrading from EPUB Reader retains books, saved positions, bookmarks, and settings. The rename does not create a separate library or change the database format.

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
cd E:\marginalia
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

## Import compatibility in 0.4.1

Books containing the Unicode replacement character (�) in otherwise valid XML metadata can be imported. The reader preserves the source bytes and existing characters; it does not reconstruct missing text. Malformed XML, entity declarations, unsafe paths, oversized archives, and missing reading chapters are still rejected.

## What's new in 0.4

- Passage selection actions for coloured highlights, attached notes, and default-browser web searches.
- Saved-passages list with navigation, editing, recolouring, and independent note/highlight removal.
- SQLite schema 3 with pre-upgrade snapshots and transactional migration.
- Stable passage anchors through content cleaning, reflow, and restart.

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

The library remains in `%APPDATA%\epub-reader`, including after the Marginalia rename:
- `books/`: app-managed EPUB copies.
- `covers/`: disposable cached thumbnails and embedded presentation metadata.
- `library.sqlite`: SQLite metadata, reading preferences, highlights, and notes.
- `backups/`: automatic legacy JSON backups and pre-upgrade SQLite snapshots.
- `library.json`: retained 0.1 source, if one existed.

Close the app before manually backing up the complete data directory. Do not delete SQLite WAL/SHM files while it is running.

The migration keeps original JSON and imported EPUB copies. If migration fails, the app stops with an error rather than replacing saved data. Avoid downgrading an upgraded library. Version 0.1 uses an old JSON snapshot; 0.2.x and 0.3.x refuse the newer schema used by 0.4. Keep migration backups for recovery.

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
