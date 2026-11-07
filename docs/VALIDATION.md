# Validation — 0.1.0

Checked locally on the user's Windows 11 x64 system on 8 November 2026.

- TypeScript checks and production build: passed.
- Storage checks: 4 passed (valid EPUB, invalid archive rejection, safe book paths, atomic metadata replacement).
- Desktop integration: passed against both the development executable and packaged Windows executable.
- Integration coverage: file-picker import, chapter text rendering, chapter navigation, in-book search, dark theme, bookmarks, saved position and bookmarks after a full app restart, duplicate import detection, and a book script that must remain disabled.
- Dependency audit: no known vulnerabilities reported after patched XML-parser and minimatch overrides.
- Screenshots: captured and inspected for the library and reading screen.
- Installer installation/upgrade/uninstall: not yet tested.
- GitHub workflows are supplied; local success does not establish that hosted GitHub runs have passed.
- Public Store release, code signing, broad publisher compatibility, and screen-reader review remain future work.

The tests generate their own sample EPUB and isolated temporary library. They do not use or alter personal books.

