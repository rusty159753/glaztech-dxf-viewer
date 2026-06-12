# Glaz-Tech DXF Viewer — Design Spec

**Date:** 2026-06-12
**Status:** Approved by Christopher (this session)

## Problem

Glaz-Tech Industries (glaztech.com) is a glass wholesale distributor and fabricator.
The office does not have CAD licenses for every employee, but staff need to:

1. View DXF/DWG files sent by customers, without installing CAD software
   (and without admin rights on work PCs).
2. View DXF files produced by Glaz-Tech's own pattern-drawing program
   (glass patterns are recreated on a flat table, then imported into GTI
   programs that cut glass to exact drawing dimensions).
3. Add text notations and dimensions to drawings.
4. Print / share drawings (PDF).

An earlier in-house viewer exists at `rusty159753/GTI-DXF-Viewer` (GitHub
Pages). It works but is limited: DXF-only (no DWG), basic rendering, homegrown
annotation tools. It stays online untouched as a fallback.

## Decision

Build a **standalone branded app** on top of the published npm packages from
[mlightcad/cad-viewer](https://github.com/mlightcad/cad-viewer) (MIT license),
rather than forking the 11-package pnpm/Nx monorepo.

Rationale: the upstream `@mlightcad/cad-viewer` Vue 3 component already ships
every needed capability —

| Glaz-Tech need | Upstream feature |
|---|---|
| View without CAD | Browser-only DXF **and DWG** viewing, no backend |
| Text notations | MText draw command |
| Dimensions | Linear dimension command with object snap |
| Measure | Distance, angle, arc, area commands |
| Markup | Revision cloud / circle / rect, freehand sketch |
| Print/share | Vector PDF export (`cpdf`), PNG export, self-contained offline HTML export |
| Feed GTI cutting programs | Save/convert back to DXF (annotations included) |

Updating means bumping an npm version instead of merging a monorepo fork.

## Repo & architecture

- New public repo: **`rusty159753/glaztech-dxf-viewer`**.
- Local path: `C:\Users\christopher\glaztech-dxf-viewer`.
- Vite + Vue 3 single-page app, modeled on upstream's `cad-viewer-example`
  package:
  - `@mlightcad/cad-viewer` (pinned **1.5.5**) renders the full viewer UI
    (`MlCadViewer`: toolbars, layer panel, command line, dialogs).
  - PDF plugin registered lazily via `@mlightcad/cad-pdf-plugin/register`.
  - English-only locale; no Chinese locale files in the repo.
- Old repo `GTI-DXF-Viewer` is not modified, renamed, or deleted.

## Branding

- Title / browser tab: **"Glaz-Tech DXF Viewer"**; Glaz-Tech favicon.
- Glaz-Tech logo (transparent version from glaztech.com) in the app header.
- Theme colors matched to glaztech.com: dark navy navigation, clean white
  content, professional sans-serif. Default theme: **dark** (CAD-friendly,
  matches site nav); light theme remains available via the built-in toggle.
- All mlightcad / Thingraph promotion removed from UI and docs: social links,
  app marketplace plugs, demo links.
- Attribution kept (MIT requirement + courtesy): upstream copyright notice in
  `LICENSE`, "Powered by cad-viewer (MIT)" credit in README.

## Deployment

- GitHub Actions workflow: build with Vite (base path
  `/glaztech-dxf-viewer/`) and deploy to GitHub Pages on every push to `main`.
- Live URL: `https://rusty159753.github.io/glaztech-dxf-viewer/`.
- **Self-host runtime assets**: fonts and the DWG-parsing WebAssembly that
  upstream loads from a CDN by default are bundled into the Pages site (the
  component supports custom resource base URLs). This prevents the app from
  silently losing DWG support behind a corporate firewall that blocks CDNs.

## Docs

- README rewritten for Glaz-Tech: purpose, live URL, credit line, and a short
  office-staff how-to: open a customer DXF/DWG → add notes/dimensions →
  export PDF → save back to DXF for the GTI cutting programs.
- A sample DXF kept in the repo for testing.

## Verification (definition of done)

On the **deployed Pages URL** (not just local dev):

1. Open a DXF file.
2. Open a DWG file.
3. Place a text note (MText).
4. Place a linear dimension.
5. Export to PDF.
6. Save/convert back to DXF.
7. Confirm Glaz-Tech branding (title, logo, favicon, colors) and absence of
   mlightcad/Thingraph promo.

## Out of scope

- Porting the old viewer's homegrown tools (covered by upstream equivalents).
- Removing/trimming upstream viewer features.
- Custom domain (e.g., dxf.glaztech.com) — possible later via DNS.
- Changes to the old `GTI-DXF-Viewer` repo.
