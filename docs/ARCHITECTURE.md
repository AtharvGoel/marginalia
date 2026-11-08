# Architecture — 0.3

See [the roadmap](../ROADMAP.md) for feature scope and [validation](VALIDATION.md) for evidence and limits.

## Desktop and interface

Electron remains the desktop shell. React/TypeScript renders local assets built by Vite. The Windows x64 installer uses NSIS. No server or account is needed.

- `src/App.tsx`: application composition and error display.
- `src/features/library/`: library UI, importing, selection, and removal.
- `src/features/reader/`: reading view and session lifecycle hook.
- `src/features/settings/`: preference loading/saving and reader toolbar.
- `src/components/Sidebar.tsx`: chapter, bookmark, and search navigation.
- `src/services/epub.ts`: replaceable epub.js adapter for opening, navigation, layout, search, and cleanup.
- `src/services/desktop.ts`: typed desktop bridge.

The rendering adapter exposes application concepts rather than leaking epub.js into UI components.

## Desktop boundaries

- `electron/main.cjs`: application lifecycle, single-instance lock, trusted-frame checks, IPC registration, and window/network restrictions.
- `electron/library-service.cjs`: managed EPUB copies, deduplicated importing, and serialized writes.
- `electron/database.cjs`: SQLite schema migrations and data access.
- `electron/metadata.cjs`: embedded title, creator, and cover discovery; local resource resolution.
- `electron/storage.cjs`: archive/package validation and safe managed paths.
- `electron/preload.cjs`: a small explicit library and preferences API.

Book scripts are disabled. The book iframe is sandboxed; content hooks remove active elements and event attributes. Production remote requests and permission prompts are denied. These controls need ongoing security review as supported EPUB features expand.

## SQLite and migration

SQLite comes from Electron's bundled Node runtime (`node:sqlite`); no separately rebuilt native SQLite dependency is needed. Development and tests require Node 22.12 or newer.

Database schema version 2 uses books, bookmarks, preferences, and migration-history tables. The reading preferences include font, line height, margins, reading width, layout, sidebar width, and collapse state. Shared defaults are bundled for both processes. Foreign keys cascade bookmarks when a book is removed. Writes use prepared statements, validation, transactions where multiple statements are needed, WAL, and full synchronization. Shutdown drains the write queue and checkpoints the database.

On the first 0.2 launch:
1. Validate the old version-1 `library.json`.
2. Copy its exact bytes to a uniquely named file under `backups/`.
3. Create the schema and import books, positions, dates, and bookmarks in one transaction.
4. Commit the schema version only after the import succeeds.

The original JSON is retained. A failed migration rolls back and is retryable; an existing valid database does not reimport stale legacy JSON. Databases from future schema versions are refused without downgrade.

Legacy appearance settings are read from localStorage, backed up as normalized preference JSON, and imported once. SQLite then becomes authoritative; localStorage is retained for recovery.

## Reading reflow and window controls

The chapter sidebar has a compact fixed header and a flexible scrollable navigation area. Its width and collapse state are saved; the resize divider supports pointer capture and keyboard adjustments.

The reader owns a bounded-width page container with adjustable margins. A ResizeObserver handles changes caused by sidebar width, fullscreen, and window resizing. The EPUB adapter serializes layout/navigation operations. Typography and flow changes recreate the rendition while retaining the book and a stable CFI anchor. Explicit navigation and user scrolling update that anchor.

Continuous mode uses the continuous view manager. Chapter targets are resolved to CFIs; post-layout alignment uses the actual content-frame position to account for neighbouring views inserted by the engine. This logic stays inside the EPUB adapter.

The trusted desktop bridge exposes fullscreen get/set and change events. Native and renderer shortcuts support F11/Escape, including focus inside a book. Book content still has scripts disabled and no direct desktop bridge access.

## Schema 2 upgrade

Existing schema-1 SQLite libraries receive a consistent pre-upgrade snapshot under backups/ using VACUUM INTO. New preference columns and the migration marker are changed transactionally. Books, bookmarks, dates, and CFI locations are retained. Failed upgrades roll back the schema; older app versions refuse schema 2 rather than modifying it.

New libraries and 0.1 JSON imports are initialized through the same migration chain. Reading comfort defaults apply without discarding the saved theme or text size.

## Bookshelf presentation

Imports reuse the validated EPUB archive to read package metadata immediately. Original author strings are stored unchanged; the interface formats explicit surname-first entries for display. Multiple creators are retained separately in a semicolon-delimited string; ordinary names are not reversed.

A book presentation IPC call refreshes old metadata without touching last-opened dates, reading positions, or bookmarks. Artwork is discovered via EPUB 3 cover-image, EPUB 2 cover metadata, or local raster references in XHTML/SVG cover wrappers. No external cover resources are fetched. Unsupported/vector-only or damaged artwork falls back to text.

The main process decodes artwork with Electron nativeImage and creates a bounded thumbnail. The per-book cache in covers/ is disposable. No database schema change is needed. The renderer receives a data URL rather than arbitrary filesystem access. Cache failures do not prevent importing or opening a book.

## Files and uninstall

EPUB copies stay in the app-data `books/` directory under their SHA-256 identifiers. Archive contents are never extracted into arbitrary device paths. Import checks include size, expanded size, entry count, unsafe paths, container/package XML, and referenced reading chapters.

The standard NSIS uninstaller appears in Windows Installed apps and the installation folder. Uninstall removes the app and shortcuts while keeping reading data by default. Original source EPUBs are never removed.

## GitHub and release process

Use a feature branch for each milestone, push logical stages, and merge after tests. Windows checks cover logic, migration, production build, desktop behavior, and dependency audit. Packaging can be triggered manually or by a version tag. Installer verification uses a distinct validation identity to avoid replacing the owner's installed app.

The broader compatibility corpus, assistive-technology review, naming, personal bookshelf, watched folders, signing, and Store work remain in the roadmap.
