> [!NOTE]  
> Yes this is like 100% vibe coded. No guarantees are made that this will actually long term preserve your data, as I don't fully trust the code to be properly using IndexDB and I haven't audited it at all. Everything else in this repo, other than this note, is 100% vibe coded.

# Typstability

A minimal, local-first PDF editor with Typst text boxes. Open a PDF, add images, draw, insert blank pages, and export a new PDF without uploading the document.

## Editing

- Choose the **Typst** tool, then drag on a page to create a text box. The bundled Typst WebAssembly compiler keeps a long-lived incremental compilation session, so the preview updates as you type.
- Use **Prelude** (`{ }`) to define document-wide Typst functions, variables, and styles shared by every text box.
- Choose **Select** to resize a text box or drag it onto another page. Typst reflows incrementally while a box is resized instead of stretching the old preview.
- Choose **Pen** to draw with a configurable color and radius. Choose **Eraser** to remove any pen stroke that touches its configurable eraser radius.
- Inserted blank pages participate in editing and export exactly like pages opened from a PDF.
- The left rail renders miniature PDF pages and can be collapsed with the panel button above the thumbnails.

## Projects and backups

- **Projects** opens the library of projects saved in this browser. Create, open, rename, duplicate, or delete projects there.
- Edits autosave to IndexedDB. The toolbar shows **Saving…**, **Saved**, or **Save failed**. Switching projects waits for pending saves, and each opened project starts with its own fresh undo history.
- **Export Project** downloads a `.typstability` file containing the original PDF, inserted images, pages, pen strokes, Typst source, and prelude. **Import project** opens that file as a new project without replacing existing projects.
- **Export PDF** creates the finished PDF. Use **Export Project** when you want to keep editing later or transfer work to another browser.
- Projects are local to the browser profile and site origin. Localhost and GitHub Pages have separate storage. Clearing site data removes saved projects; keep exported backups. A save error leaves the current document open for export.
- The previous single-session autosave is migrated into the project library automatically. The old record remains as a backup during migration.

Project files use a versioned JSON format with embedded base64 assets. Imports validate the document structure and PDF page references. Typst previews are regenerated from source; undo history and temporary editor state are not included.

## Local development

```bash
npm install
npm run dev
```

## Static build

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. Assets use relative URLs, so the same build works at a GitHub Pages repository subpath.

## GitHub Pages

Live app: https://overthrowing.github.io/typstability/

The deployment workflow runs lint, tests, and a production build before publishing `dist/`.

1. Push the project to a GitHub repository whose default branch is `main`.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main`, or run the “Deploy to GitHub Pages” workflow manually.

All PDF processing, incremental Typst compilation, session recovery, and export happen in the browser. The compiler, renderer, WebAssembly modules, and New Computer Modern fonts are bundled into the static build, so the deployed site has no backend and no runtime CDN dependencies.
