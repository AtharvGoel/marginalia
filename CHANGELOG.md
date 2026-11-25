# Changelog

## 0.4.1 — EPUB import compatibility

- Accept Unicode replacement characters in otherwise valid EPUB package metadata and cover wrappers.
- Keep all other XML warnings/errors fatal, along with entity, unsafe-path, missing-chapter, and archive-size checks.
- Preserve the original book bytes and replacement characters; do not guess or rewrite damaged text.
- Report genuine XML failures without nested parser callback errors.
- Add import, cover, reading, restart, and rejection regression checks.


## 0.4.0 — Passage highlights and notes

- Add a passage-selection menu with yellow, green, blue, and pink highlights.
- Add, edit, and delete notes attached to passages, with optional colour highlights.
- Browse saved passages in Notes and jump back to their book locations.
- Open selected text as a Google search in the device’s default browser through a restricted desktop action.
- Persist annotations in SQLite schema 3, with a pre-upgrade snapshot and transactional migration.
- Restore marks after reflow and restart; clean chapter structure before generating and restoring passage anchors.
- Support keyboard selection and Alt+M access to the passage menu.
- Keep the in-app dictionary on the roadmap.


## 0.3.1 — Marginalia

- Rename the app to Marginalia and integrate the owner’s supplied emblem and stylized name.
- Add a multi-resolution Windows icon and update executable, installer, shortcuts, and uninstaller labels.
- Keep the original installer ID and explicitly preserve the existing library data location.
- Keep branding compact in the reader to preserve chapter space.
- Add naming, artwork-loading, data-directory, and rename-upgrade checks.

## 0.3.0

- Give the chapter list most of the sidebar height, with compact book details.
- Add sidebar collapse/restore, pointer and keyboard resizing, and a current-chapter marker.
- Add font choices, line spacing, margins, maximum text width, and continuous scrolling.
- Add native fullscreen controls, F11, and Escape from both app controls and book content.
- Preserve a stable passage anchor during typography changes and align continuous-mode chapter jumps.
- Save all comfort settings in SQLite schema 2; back up schema-1 databases before migration.
- Add long-title, multi-chapter scrolling, reflow, fullscreen, restart, and migration tests.

## 0.2.1 — 8 November 2026

- Display embedded cover artwork on the bookshelf, preserving a readable title below each cover.
- Read titles and authors at import instead of waiting for the book to be opened.
- Refresh existing bookshelf metadata without changing reading positions, bookmarks, or recent-reading order.
- Display comma-separated surname-first authors in given-name-first order.
- Cache local thumbnails and retain text covers for missing, corrupt, or unsupported artwork.
- Record the cramped Chapters panel for a later layout fix.

## 0.2.0 — 8 November 2026

- Separate UI features, desktop access, and EPUB rendering behind modules.
- Move library metadata, positions, bookmarks, and appearance preferences to SQLite.
- Migrate 0.1 data automatically with backups and rollback protection.
- Strengthen EPUB validation and reading/migration regression checks.
- Confirm standard Windows uninstall behavior and explicit preservation of reading data.
- Add installation/version-upgrade/uninstall verification using an isolated test app.
- Add a reviewable roadmap, including a personal bookshelf redesign, linked-folder automatic import, and app naming.

The reading features remain the same. No shelf redesign or folder monitoring is introduced in this release.

## 0.1.0

Initial offline Windows reader with library import, chapter navigation, saved positions, themes, text-size controls, bookmarks, and search.
