# EPUB Reader

An offline Windows desktop reader for DRM-free, reflowable EPUB books.

## Run

Use Node.js 22.12 or newer and npm.

```powershell
cd E:\epub_reader
npm ci
npm run build
npm start
```

For development, use `npm run dev`. The app does not need Node.js installed once packaged.

Your existing system Node 20 was left unchanged. If needed, run individual tools temporarily with:
`npm exec --yes --package=node@22 -- node tests/desktop.cjs`.

## Included in 0.1.0

- Import multiple books through a native file picker; duplicate files are detected by SHA-256.
- Library search and sorting by most recent reading.
- Chapter navigation, previous/next buttons, and left/right arrow keys.
- Light, sepia, and dark reading themes; adjustable text size.
- Automatic reading-position restoration and bookmarks.
- Full-text search within a book (first 100 matches).
- Original files are preserved; removing a book removes only the app-managed copy.
- Offline operation, disabled book scripts, blocked remote requests, restricted desktop bridge.

Book title and author are refreshed on first opening. Covers currently use generated typography rather than embedded book artwork. Settings persist locally.

## Data and privacy

Books and versioned library metadata are in Electron's per-user application-data folder (normally `%APPDATA%\epub-reader`). Books are copied there during import. No accounts, analytics, cloud services, or network-loaded fonts are used. Back up that complete folder while the app is closed to preserve books, positions, and bookmarks.

Imports are limited to 100 MB compressed / 300 MB expanded. DRM-encrypted EPUBs, PDFs, audio/video, and complex fixed-layout books are not supported in this version.

## Checks

```powershell
npm test
npm run build
npm run test:desktop
npm audit --audit-level=moderate
npm run dist
```

Desktop tests use a generated book containing two chapters and an inert malicious script, and store data in a temporary directory. They never modify your reading library. Screenshots are generated in `test-results`, which is excluded from Git.

Windows CI runs on pushes and pull requests. The lockfile pins the dependency graph. Overrides update the EPUB XML parser and packaging glob matcher; desktop tests verify the resulting integration.

## Installation

`npm run dist` produces a Windows x64 NSIS installer under `release`. Local development builds are unsigned and may show a Windows publisher warning. Signing and Microsoft Store submission have not been performed.

## Version control

Repository: https://github.com/AtharvGoel/epub_reader

Milestones are committed and pushed separately. Personal books, app data, dependencies, build outputs, and credentials are excluded. Use feature branches and pull requests for subsequent changes; keep `main` buildable.

## Next milestones

Drag-and-drop import, embedded cover artwork, spacing and font-family controls, continuous scrolling, accessibility review with a screen reader, and a larger EPUB compatibility corpus. Before public release: app icon, dependency license notices, product license decision, signed/MSIX packaging, upgrade/uninstall testing, privacy/support pages, and Store certification.

Source is private-use / all rights reserved pending the owner's license decision. A free Store price does not require making the source public.

