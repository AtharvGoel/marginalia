# EPUB Reader roadmap

This is the reviewable list of future scope. It lives with the source code and will be updated as work is completed or priorities change.

Status: **Done**, **In progress**, **Planned**, or **Explore**. The order below is a proposed sequence, not a delivery-date commitment.

## Current release — 0.2 foundation

- **Done:** Separate library, navigation, settings, and reading-engine modules.
- **Done:** SQLite for library metadata, saved positions, bookmarks, and reading preferences.
- **Done:** Automatic migration from 0.1, with backups and rollback tests.
- **Done:** Broader reading checks and isolated install/version-upgrade/uninstall validation.
- **Done:** Standard Windows uninstaller; books and reading data preserved by default.
- **Done:** Version control with milestone pushes and a feature branch.

## Next usability milestones

### Name and identity — Planned (user requested)

Find a good app name to replace the working name "EPUB Reader." Review a shortlist for personality, memorability, pronunciation, and fit with the personal bookshelf direction. Check obvious existing-app, domain, and Store-name conflicts before choosing; availability checks are not a trademark clearance.

Acceptance: the owner selects a name, and app titles, installer labels, documentation, and eventual visual branding use it consistently. Preserve the existing application-data location or migrate it explicitly so renaming does not hide books or reading history.


### Personal bookshelf — Planned (user requested)

Replace the minimalist opening library with something more idiosyncratic and personal. Treat this as a visual redesign, not just another color theme.

Ideas to review:
- A recognizable bookshelf identity, expressive book arrangements, and a warmer sense of place.
- Personal backgrounds, textures, shelf materials, decorative details, and accent colors.
- Collections, favorites, custom ordering, reading piles, and personal shelf names.
- Real embedded covers with attractive fallbacks for books without artwork.
- Optional compact/list view and reduced visual effects for accessibility and performance.

Before implementation, review visual concepts together to choose what feels personal to the owner. No final style has been selected.

Acceptance: the shelf feels individually chosen, remains easy to browse/search, works with keyboard navigation, and does not sacrifice legibility for decoration.

### Linked device folder and automatic importing — Planned (user requested)

Let the user choose a local folder. Existing EPUBs are scanned once; new books placed there appear on the bookshelf automatically.

Design decisions:
- User explicitly chooses each watched folder and can pause or unlink it.
- Settle partially copied files before import; deduplicate by content hash.
- Show import activity, invalid files, and unavailable folders without interrupting reading.
- Reconcile changes at startup so books added while the app was closed are found.
- Offer an explicit choice about watching subfolders.
- Default proposal: retain app-managed book copies; deleting or unlinking a source folder does not silently remove library books.
- Review behavior for changed files, renamed files, removable drives, and large folders before implementation.
- Do not scan unrelated device locations.

Acceptance: dropping a completed EPUB into a linked folder imports it once; restarting catches offline additions; unlinking stops monitoring and retains existing books.

### Reading comfort — Planned

- Font-family choices, line spacing, margins, continuous scrolling, and fullscreen reading.
- Reading progress and clearer chapter/page indicators.
- Drag-and-drop import into the app.
- Larger compatibility corpus: illustrations, footnotes, nested contents, varied languages, and publisher layouts.

## Advanced reading tools — Planned

- Highlights and notes anchored with EPUB CFIs.
- Collections, tags, favorites, and reading status.
- Optional reading goals and statistics stored locally.
- In-app backup/export and restore with conflict handling.

## Accessibility and reliability — Planned

- Screen-reader review, complete keyboard navigation, and high-contrast review.
- Performance checks with large books and large libraries.
- Crash/recovery and interrupted-import checks.
- File associations so Windows can open EPUBs directly in the app.

## Distribution — Planned

- Custom application icon, branding, and signed builds.
- Product-license decision and third-party notices before public distribution.
- Versioned GitHub releases with downloadable installers.
- Microsoft Store packaging, accessibility checks, privacy/support pages, certification, and submission if the owner chooses.

## Architecture decisions — Explore

- Keep Electron for now. Compare a small Tauri build only if measured installation size, memory use, or another concrete requirement justifies it.
- Keep the rendering adapter replaceable; assess another EPUB engine if compatibility tests reveal limitations.

## Explicitly outside current scope

DRM removal, accounts, subscriptions, cloud sync, PDF reading, and audiobook support.
