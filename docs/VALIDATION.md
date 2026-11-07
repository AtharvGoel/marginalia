# Validation — 0.2.1

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
