# Typstability

A minimal, local-first PDF editor with Typst text boxes. Open a PDF, add images, draw, insert blank pages, and export a new PDF without uploading the document.

## Editing

- Choose the **Typst** tool, then drag on a page to create a text box—even a very small one. The bundled Typst WebAssembly compiler keeps a long-lived incremental compilation session, so the preview updates as you type.
- Typst boxes start with a 4 pt top inset to protect tall first-line glyphs from clipping. Adjust **Top inset** in the box inspector, including setting it to 0 pt when desired; the value is preserved in editable PDF exports.
- Boxes have a white background by default. Use `#set page(fill: rgb("#f5f0e6"))` in the Prelude for a shared fill, or enter a Typst fill expression in an individual box’s **Fill (Typst)** field. Enter `none` for transparency.
- Use **Prelude** (`{ }`) to define document-wide Typst functions, variables, and styles shared by every text box.
- Choose **Select** to resize a text box or image, or drag either onto another page. Typst reflows incrementally while a box is resized instead of stretching the old preview.
- Paste images from the clipboard, drag image files onto a page to place them there, or use the image button. PNG, JPEG, WebP, and GIF are supported; WebP and GIF are converted locally to PNG for PDF export.
- Choose **Pen** to draw with a configurable color and radius. Choose **Eraser** to remove any pen stroke that touches its configurable eraser radius.
- Inserted blank pages participate in editing and export exactly like pages opened from a PDF.
- The left rail renders miniature PDF pages. Drag thumbnails to reorder pages, or collapse the rail with the panel button above them.
- Zoom from 40% to 500% using the toolbar controls.
- Exported PDFs contain visible, printable annotations for Typst boxes, images, and pen strokes, plus embedded Typstability metadata. Open an exported PDF again to continue editing the blocks and shared prelude. PDF tools that flatten or discard annotations or private metadata can remove this editability.

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

1. Push the project to a GitHub repository whose default branch is `main`.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main`, or run the “Deploy to GitHub Pages” workflow manually.

All PDF processing, incremental Typst compilation, session recovery, and export happen in the browser. The compiler, renderer, WebAssembly modules, and New Computer Modern fonts are bundled into the static build, so the deployed site has no backend and no runtime CDN dependencies.
