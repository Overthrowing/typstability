> [!NOTE]  
> Yes this is like 100% vibe coded. No guarantees are made that this will actually long term preserve your data, as I don't fully trust the code to be properly using IndexDB and I haven't audited it at all. Everything else in this repo, other than this note, is 100% vibe coded.

# Typstability

A minimal, local-first PDF editor with Typst text boxes. Open a PDF, add images, draw, insert blank pages, and export a new PDF without uploading the document.

## Editing

- Choose the **Text** tool, then drag on a page to create a text box. The bundled Typst WebAssembly compiler keeps a long-lived incremental compilation session, so the preview updates as you type.
- Drag the editor sidebar’s left edge to make more room for source. Its width is remembered for text boxes and Shared styles. Double-click the divider to reset, or focus it and use the arrow keys. On narrow screens the editor docks below the page. Resizing the sidebar fits the pages to the available width, up to your preferred zoom. Manual zoom overrides the fit until the next workspace resize.
- The source editor includes bracket pairing, completions, search/replace, folding, and **Format** (`Shift+Alt+F`) powered by Typstyle. Formatting runs locally and can be undone.
- **Editor theme** defaults to GitHub Light/Dark following the site appearance. Choose a fixed GitHub theme, Catppuccin Latte/Frappé/Macchiato/Mocha, or Monokai Light/Dark independently of the site. The preference is saved in this browser and shared by text boxes and Shared styles. GitHub and Monokai Dark use [uiw themes](https://github.com/uiwjs/react-codemirror); Catppuccin uses its [official CodeMirror port](https://github.com/catppuccin/codemirror). Monokai Light is a local light adaptation of the classic dark palette.
- Use **Shared styles** (`{ }`) to define document-wide Typst functions, variables, and styles shared by every text box.
- Choose **Select** to resize a text box or drag it onto another page. Typst reflows incrementally while a box is resized instead of stretching the old preview.
- Choose **Draw** to draw with a configurable color and radius. Choose **Erase** to remove any pen stroke that touches its configurable eraser radius.
- Inserted blank pages participate in editing and export exactly like pages opened from a PDF.
- The left rail renders miniature PDF pages and can be collapsed with the panel button above the thumbnails.

## Projects and backups

- **Projects** returns to your library. Choose **Start from a PDF**, **Start a blank document**, or **Import a saved project**. The project menu (•••) has rename, copy, and delete actions.
- Click the project name in the editor to rename it. **Insert** adds an image or a blank page to the current document; it does not create another project.
- Edits autosave to IndexedDB. The toolbar shows **Saving…**, **Saved**, or **Save failed**. Switching projects waits for pending saves, and each opened project starts with its own fresh undo history.
- **Export → Editable project** downloads a `.typstability` file containing the original PDF, inserted images, pages, pen strokes, Typst source, and prelude. **Import a saved project** opens that file as a new project without replacing existing projects.
- **Export → PDF document** creates the finished PDF. Use **Export → Editable project** when you want to keep editing later or transfer work to another browser.
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
