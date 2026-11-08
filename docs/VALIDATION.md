# Validation — 0.3.0

Checked on Windows 11 x64.

## Passed locally

- TypeScript checks and production build.
- All 23 storage, metadata, database, and preference tests.
- Reading, bookshelf, and reading-comfort desktop suites passed against the packaged executable.
- Native fullscreen button, F11, and Escape worked with focus in app controls and in book content.
- Rapid F11 toggling uses the native window state rather than delayed interface state.
- Long-title, 30-chapter navigation check: the chapter list occupies most of the available sidebar height; active chapter is highlighted and scrolled into view.
- Pointer and keyboard sidebar resizing, collapse/restore, and saved width/collapse state.
- Original book font, Georgia, Segoe UI, and Consolas; line spacing, margins, and reading width checked against the rendered document.
- A saved paragraph remains visible after typography changes and switching page/scroll modes.
- Chapter jumps and continuous scrolling across chapter boundaries.
- Minimum-size viewport (820 × 600), fullscreen resizing, and settings after a full restart.
- Existing reading, bookmarks, search, image, footnote, cover, metadata, migration, and duplicate-import checks still pass.
- Dependency audit: no known vulnerabilities.
- Windows x64 NSIS installer built from the verified unpacked executable.

## Migration evidence

A real schema-1 SQLite fixture is upgraded to schema 2. Tests open the pre-upgrade snapshot independently and verify its original schema, theme, text size, and reading position. The upgraded database retains book dates, CFI locations, bookmarks, and appearance preferences.

A deliberately incomplete old schema triggers a rollback; new columns and the version marker are not partially committed. Invalid preference values are rejected. Updated comfort settings survive restart.

## Limits and follow-up

Tests use generated EPUBs, not a broad publisher corpus. Complex fixed-layout books, DRM, embedded-font variations, accessibility with assistive technology, and large-library performance need further review.

The standard NSIS configuration and uninstaller are unchanged from 0.2; installation/upgrade/uninstall tests below were not repeated for this release. Existing SQLite-schema migration is tested directly, separately from installer mechanics.

One regression run logged a late duplicate location update rejected during shutdown; reading-position restart assertions passed. Further shutdown stress testing remains part of the reliability roadmap.

Signing, a custom icon, naming, the personal bookshelf redesign, annotations, watched folders, and online catalogue browsing remain future scope.

## Previous release: 0.2.1

Checked on Windows 11 x64 on 8 November 2026.

- All 19 storage, database, service, author-formatting, and metadata tests passed.
- Production build and type checks passed.
- Existing reading/migration regression suite passed against the packaged 0.2.1 executable.
- Dedicated bookshelf desktop checks passed in development and against the packaged executable:
  - Embedded cover image decoded and displayed.
  - Messy filenames did not determine displayed titles when metadata was available.
  - Surname-first authors displayed and searched in given-name-first order.
  - Missing and corrupt cover images retained readable text covers.
  - Cover loading did not mark books as read or change recent-reading order.
  - Cover and author display persisted across app restart.
- Metadata tests cover EPUB 3 cover-image, EPUB 2 cover metadata, XHTML/SVG wrappers with embedded raster images, multiple creators, unsafe/external paths, caching, cleanup, and preserving saved reading state during backfill.
- Bookshelf screenshot was inspected.
- Windows x64 NSIS installer generated. The NSIS configuration is unchanged from 0.2.0; its installation/upgrade/uninstall checks below were not repeated for this patch.
- Pure-vector covers and unsupported/undecodable images use a text fallback.
- The chapter-panel height issue is recorded in the roadmap; this patch does not fix it.

## Previous release: 0.2.0

Checked on Windows 11 x64 on 8 November 2026.

## Passed locally

- TypeScript checks and Vite production build.
- 13 storage/service/database tests:
  - Valid EPUB acceptance and broken-archive rejection.
  - Malformed container/package XML, missing chapters, unsafe archive paths, and expanded-size limits.
  - Safe managed-book paths.
  - Exact legacy-data backup and successful migration.
  - Transaction rollback/retry when migration fails.
  - Rejection of malformed legacy data and future database schema versions.
  - Atomic metadata behavior, update validation, bookmark cascade removal.
  - Preferences backed up once and retained after restart.
  - Queued writes, independent managed book copies, missing-copy recovery, and preserving original source files.
- Desktop integration: opening/rendering, previous/next pages, chapter navigation, search, images, internal footnote links, text-size changes, resizing, themes, bookmarks, duplicate detection, damaged-import recovery, and library removal.
- A full restart restores both reading position and SQLite-backed appearance preferences.
- Desktop upgrade simulation imports a real saved CFI and bookmarks from 0.1 JSON, verifies the exact backup, and migrates legacy localStorage preferences.
- Embedded book scripts remain disabled.
- Dependency audit reports no known vulnerabilities.

## Installer validation

Tests use a distinct application identity, **EPUB Reader Validation**, to avoid replacing the normal reader.

- Silent installation and application launch.
- Installer version upgrade from a 0.1.0 validation build to a 0.2.0 validation build.
- Books, saved position, bookmarks, and preferences survive that upgrade.
- Standard uninstaller exists in the installation folder.
- Uninstall removes the executable and Start-menu shortcut.
- Books, SQLite data, and original source files survive uninstall.
- Test application data is removed only after successful validation, after verifying the resolved validation-only path.

The validation builds use the current implementation with different package versions. Migration from actual 0.1 JSON/localStorage is tested separately in the desktop upgrade simulation. This does not claim a full in-place installer test using the original production 0.1 installer.

The test waits for both executable and shortcut removal because the uninstaller can complete cleanup after its launcher exits.

## GitHub checks

Hosted Windows checks passed for the refactoring, SQLite, and expanded-regression milestones. Final release checks are reviewed before merge. Installer validation is included in the manually triggered/tagged packaging workflow.

## Limits

These checks use generated EPUBs rather than a large publisher corpus. They do not establish compatibility with every EPUB, fixed-layout content, DRM, assistive technology, or every Windows configuration. Visual acceptance of a personalized bookshelf is future work.

Signing, a custom icon, Store submission, independent security review, and screen-reader review remain future work. See [ROADMAP.md](../ROADMAP.md).
