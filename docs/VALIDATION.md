# Validation — 0.2.0

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
