# Architecture and release plan

## Decisions

Electron provides a consistent Chromium EPUB layout engine and Windows integration. React and TypeScript implement the interface; epub.js handles EPUB package parsing, chapter layout, navigation, CFI locations, and text search. Vite builds local assets. electron-builder generates a Windows x64 NSIS installer.

The tradeoff is a larger download and memory footprint than a native Windows reader. Windows 11 on Intel is the first target. Store release is a future MSIX packaging milestone, not part of the initial installer.

## Boundaries

- Main process: native file picker, size/ZIP checks, managed file copies, library metadata, serialized disk writes.
- Preload: an explicit list/import/read/update/remove bridge. Main-process handlers reject calls from subframes.
- App renderer: trusted interface with no Node access.
- Book iframe: epub.js sandbox, scripting disabled, content hooks strip active elements, event attributes and external links. Network requests are blocked in production.
- Storage: schema version 1 JSON and SHA-256-named EPUB copies outside the repository. Atomic metadata replacement and queued writes; shutdown waits for queued writes.

No extracted archive paths are written to disk. Book identifiers are validated before constructing paths. A malformed saved library causes an error and exit rather than silently overwriting existing data.

## Stages

1. Foundation: repository, dependencies, restricted desktop shell.
2. Personal reader: library, EPUB rendering, chapter navigation, saved CFI, themes, bookmarks and text search.
3. Validation and distribution: storage tests, desktop integration tests, Windows CI, x64 installer.
4. Usability polish: real covers, drag/drop, typography/spacing, reading-progress display, broader compatibility and accessibility review.
5. Public distribution: icon, license choice and notices, MSIX identity, certification, privacy/support pages and release automation.

## GitHub workflow

Push a commit at each completed logical stage. Use feature branches and pull requests for future iterations. Do not commit books or personal reading state. Pull requests must pass storage tests, type checking, production build, desktop integration checks, and dependency audit. Tag release candidates only after installer validation.

## Verification limits

The included synthetic EPUB exercises standard reflowable content, navigation, search, disabled scripts and persistence. It does not establish compatibility with all publisher EPUBs, fixed-layout books, DRM, assistive technology or all Windows configurations. Installer generation alone does not verify installation, upgrades or uninstallation.

