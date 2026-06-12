# Glaz-Tech DXF Viewer

Browser-based DWG/DXF viewer for [Glaz-Tech Industries](https://www.glaztech.com/).
View, measure, and annotate CAD drawings with no CAD license, no install, and
no admin rights — everything runs in the browser; files never leave your PC.

**Live app:** https://rusty159753.github.io/glaztech-dxf-viewer/

## What it's for

- Open DXF/DWG files sent by customers without AutoCAD.
- View DXF files produced by our pattern drawing program.
- Add text notes and dimensions for the shop floor.
- Export to PDF for printing, or save back to DXF for the GTI cutting programs.

## How to use it (office staff)

1. Open the live app link above in any modern browser (Edge/Chrome).
2. Drag a `.dxf` or `.dwg` file onto the drop zone (or click to browse).
3. Use the toolbar to pan/zoom, toggle layers, and measure.
4. **Add a text note:** type `MTEXT` in the command line (or use the draw
   toolbar), click to place, type the note.
5. **Add a dimension:** type `DIMLINEAR`, click the two points, then place
   the dimension line.
6. **Print / share:** type `CPDF` to export a vector PDF.
7. **Save for cutting:** use the main menu (☰) → Save to download the drawing
   as DXF, including your notes and dimensions.

## Development

```bash
npm install
npm run dev        # local dev server (auto-fetches fonts on first run)
npm run build      # production build into dist/
npm run test:e2e   # Playwright smoke tests against the built app
```

Pushing to `main` deploys to GitHub Pages automatically via
`.github/workflows/deploy.yml`.

Fonts and templates (~49 MB) are fetched into `public/cad-data/` at
build/dev time by `scripts/fetch-cad-data.mjs` and are deliberately not
committed.

## Credits

Built on [cad-viewer](https://github.com/mlightcad/cad-viewer) by mlightcad
(MIT license) — a fully browser-based DWG/DXF viewer/editor. See `LICENSE`.
