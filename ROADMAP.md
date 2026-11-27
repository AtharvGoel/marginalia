# Marginalia roadmap

This is the reviewable list of future scope. It lives with the source code and will be updated as work is completed or priorities change.

Status: **Done**, **In progress**, **Planned**, or **Explore**. The order below is a proposed sequence, not a delivery-date commitment.

## Current release — 0.4.1 import compatibility

- **Done:** Accept otherwise valid EPUB metadata containing Unicode replacement characters, while retaining structural and safety validation.

## Passage tools — 0.4

- **Done:** Selection menu with four highlight colours and passage notes.
- **Done:** Notes list, passage navigation, editing, recolouring, and independent removal.
- **Done:** Explicit Search on Web action in the default browser.
- **Done:** Local annotation storage, schema-upgrade backup, restart and reflow checks.
- **Planned:** In-app dictionary for selected words and terms.

## Branding — 0.3.1 Marginalia

- **Done:** Owner-selected name, supplied emblem and stylized wordmark.
- **Done:** Windows icon and consistent installer, shortcut, window and uninstall labels.
- **Done:** Stable application identity and original library location through the rename.

## Reading comfort — 0.3

- **Done:** Compact chapter sidebar, collapsible/resizable with keyboard support.
- **Done:** Current-chapter highlighting and keeping the active entry visible.
- **Done:** Font choices, line spacing, margins, maximum reading width, fullscreen, and pages/continuous scrolling.
- **Done:** Saved comfort settings, pre-upgrade SQLite snapshots, and rollback checks.
- **Done:** Passage-preserving reflow and cross-chapter scrolling checks.

## Previous foundation — 0.2

- **Done:** Separate library, navigation, settings, and reading-engine modules.
- **Done:** SQLite for library metadata, saved positions, bookmarks, and reading preferences.
- **Done:** Automatic migration from 0.1, with backups and rollback tests.
- **Done:** Broader reading checks and isolated install/version-upgrade/uninstall validation.
- **Done:** Standard Windows uninstaller; books and reading data preserved by default.
- **Done:** Version control with milestone pushes and a feature branch.

## Next usability milestones

### Name and identity — Done (0.3.1, user selected)

The owner selected **Marginalia** and supplied the emblem and stylized name. These appear in the interface and Windows packaging. The original data directory and installer ID remain stable to preserve the existing library.

### Personal bookshelf — Planned (user requested)

Replace the minimalist opening library with something more idiosyncratic and personal. Treat this as a visual redesign, not just another color theme.

Ideas to review:
- A recognizable bookshelf identity, expressive book arrangements, and a warmer sense of place.
- Personal backgrounds, textures, shelf materials, decorative details, and accent colors.
- Collections, favorites, custom ordering, reading piles, and personal shelf names.
- **Done (0.2.1):** Embedded cover artwork with readable titles below it and text fallbacks for missing artwork.
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

- **Done (0.3, user requested):** Give the Chapters panel substantially more usable height. Long book titles and generous header spacing currently squeeze it into a small area (example: "On Looking: Eleven Walks with Expert Eyes" in the supplied screenshot). The compact title/header and resizable/collapsible sidebar are implemented. Checked with a long title and a 30-chapter contents list at normal and minimum window sizes.


- **Done (0.3):** Font-family choices, line spacing, margins, continuous scrolling, fullscreen, and adjustable reading width.
- Drag-and-drop import into the app.
- Larger compatibility corpus: illustrations, footnotes, nested contents, varied languages, and publisher layouts.

### Book progress and page numbers — Planned (user requested)

- Display the **percentage of the whole book remaining**, for example **35% left**, and update it as the reader moves through the book.
- Display the **current page**, preferably **Page 42 of 310**, with book-wide progress distinguished from the current chapter.
- Keep the remaining percentage tied to the saved reading position so changing fonts, margins, window size, or page/scroll mode does not falsely change how much has been read.
- Use publisher page numbers when an EPUB supplies a usable page list; otherwise clearly label app-calculated pages, which may change with the reading layout. Confirm the final page-number convention before implementation.
- Restore the indicators after reopening a book, and handle the beginning/end and progress calculation gracefully.

Acceptance: the reading view shows the percentage left and current page, updates them during navigation, and restores them with the saved passage. Layout changes preserve book progress and recalculate any layout-based page numbers consistently.

### Free ebook library browsing — Planned (user requested)

Add an in-app catalogue where users can discover books from free ebook libraries, starting with Project Gutenberg and allowing other sources to be added later.

User experience:
- Browse and search books by title, author, language, and subject where the source supports it.
- View a book's description, cover, available formats, source, and rights/licence information.
- Download an available EPUB directly into the bookshelf, with progress, cancellation, and duplicate detection.
- Keep downloaded books available for offline reading.
- Clearly distinguish the online catalogue from the user's own bookshelf and handle unavailable connections or sources gracefully.

Before implementation:
- Verify each source's official catalogue feeds/APIs, access requirements, download policies, and attribution requirements.
- Choose a supported integration instead of assuming the website can simply be embedded.
- Reuse the existing EPUB validation and managed-library import process.
- Keep external catalogue content separate from trusted app controls and restrict downloads to the selected provider's supported resources.

Acceptance: a user can search or browse Project Gutenberg within the app, inspect a book, and import an available EPUB into the bookshelf without manually saving and locating the file. Downloaded books remain readable offline. Additional providers can be added without redesigning the bookshelf.

## Advanced reading tools — Planned

### Passage selection menu — Implemented in 0.4; dictionary planned

Selecting text should show a compact menu beside the passage:

- **Done (0.4) — Highlight:** choose one of several colours; change the colour or remove the highlight later.
- **Done (0.4) — Add note:** write a note attached to the selected passage; reopen, edit, or delete it later.
- **Done (0.4) — Search on Web:** send the selected text as a search query to the device's default browser, avoiding manual copy/paste.
- **Planned — Look up:** when the selection is a single word, show its meaning in an in-app dictionary panel.

Highlights and notes:
- Anchor selections with EPUB CFIs and retain the selected text as context.
- Store highlights, colour choices, and notes locally in SQLite.
- Restore them after restarting, resizing, or changing fonts.
- Make existing annotations easy to revisit and usable with keyboard navigation.

Dictionary and browser behaviour:
- Keep dictionary definitions inside the reader. Choose a dictionary source, its licence, supported languages, and offline/download requirements before implementation.
- Prefer offline definitions where feasible; clearly indicate any lookup that requires a connection.
- Only send a selection to an external search service when the user chooses **Search the web**.
- Encode the passage safely into a search URL and open it through a restricted desktop action, rather than giving book content general browser-launch access.
- Handle punctuation, hyphenated words, and selections spanning page boundaries; show a useful message when no definition is found.

Implemented: selecting a passage offers multiple highlight colours, a note action, and web search. Remaining acceptance: selecting a single word also offers **Look up**. Highlights and notes remain attached after reflow and restart, web search opens the selected text in the default browser, and dictionary results appear without leaving the app.

### Other advanced tools — Planned

- Collections, tags, favorites, and reading status.
- Optional reading goals and statistics stored locally.
- In-app backup/export and restore with conflict handling.


## Accessibility and reliability — Planned

- Screen-reader review, complete keyboard navigation, and high-contrast review.
- Performance checks with large books and large libraries.
- Crash/recovery and interrupted-import checks.
- File associations so Windows can open EPUBs directly in the app.

## Distribution — Planned

- **Done (0.3.1):** Custom application icon and supplied Marginalia branding.
- Signed builds.
- Product-license decision and third-party notices before public distribution.
- Versioned GitHub releases with downloadable installers.
- Microsoft Store packaging, accessibility checks, privacy/support pages, certification, and submission if the owner chooses.

## Architecture decisions — Explore

- Keep Electron for now. Compare a small Tauri build only if measured installation size, memory use, or another concrete requirement justifies it.
- Keep the rendering adapter replaceable; assess another EPUB engine if compatibility tests reveal limitations.

## Explicitly outside current scope

DRM removal, accounts, subscriptions, cloud sync, PDF reading, and audiobook support.
