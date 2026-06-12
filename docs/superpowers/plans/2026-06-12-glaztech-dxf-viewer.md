# Glaz-Tech DXF Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Glaz-Tech-branded, browser-only DWG/DXF viewer deployed to GitHub Pages, built on the published `@mlightcad/cad-viewer` npm packages.

**Architecture:** Thin Vite + Vue 3 single-page app. The entire viewer UI (toolbars, layer panel, command line, annotation/dimension/measure/PDF tools) comes from the `MlCadViewer` component in `@mlightcad/cad-viewer@1.5.5`. We supply only: a branded upload screen, theme overrides, self-hosted fonts/workers, and a Pages deploy workflow.

**Tech Stack:** Vue 3, Vite 5, TypeScript, Element Plus (UI lib the viewer uses), `@mlightcad/*` packages pinned at 1.5.5, Playwright for smoke tests, GitHub Actions + GitHub Pages.

**Working directory:** `C:\Users\christopher\Documents\GTI DXF Viewer` (git repo already initialized, spec + this plan committed).

---

## Background you need (read before Task 1)

Facts discovered from upstream source (`mlightcad/cad-viewer`) that this plan depends on:

1. **Workers must be copied to `assets/`.** `AcApDocManager` registers DXF/DWG parser workers with default URLs `./assets/dxf-parser-worker.js` and `./assets/libredwg-parser-worker.js`, resolved relative to the page. The upstream example app uses `vite-plugin-static-copy` to copy them from `node_modules`. We do the same. DWG parsing (libredwg WebAssembly) is inside those worker bundles — no external CDN involved.
2. **Fonts load from `baseUrl + 'fonts/'`.** Default `baseUrl` is the jsdelivr CDN copy of the `mlightcad/cad-data` repo. Corporate firewalls may block CDNs, so we self-host: a script clones `cad-data` (fonts = 48.5 MB, 97 files, plus templates) into `public/cad-data/` at build time (gitignored — never committed). The app passes `base-url` pointing at our own site. **The trailing slash on the base URL is required** (upstream concatenates `baseUrl + 'fonts/'`).
3. **PDF / HTML-export / SVG plugins self-register.** `@mlightcad/cad-viewer`'s `initializeCadViewer()` calls `registerLazyPlugins()` internally. We only need the plugin packages installed as dependencies; no registration code in our app.
4. **HTML export needs `viewer-runtime.iife.js`** copied from `@mlightcad/cad-html-plugin/dist/` to `assets/` (same static-copy mechanism).
5. **`MlCadViewer` props we use:** `locale="en"`, `theme` (`'dark' | 'light'`, default `'dark'`), `local-file` (a `File` object), `mode` (`AcEdOpenMode.Write` — required so annotation/dimension commands work), `base-url`.
6. **Brand identity (extracted from glaztech.com):** primary blue `#3182bf`; supporting steel blues `#6A8399`, `#6D8DA0`; site uses white text on dark nav. Logo files:
   - `https://www.glaztech.com/global-imgs/gti-logo-white.png` (275×49, for dark backgrounds)
   - `https://www.glaztech.com/global-imgs/gti-logo-transparent.png` (250×41)
   - `https://www.glaztech.com/favicon.ico` (16×16)
7. **License:** upstream is MIT. We keep its copyright notice in our LICENSE.

All shell commands below are **Git Bash** syntax (the Bash tool on this machine). The project path contains spaces — always quote it.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/env.d.ts`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "glaztech-dxf-viewer",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "fetch-data": "node scripts/fetch-cad-data.mjs",
    "predev": "node scripts/fetch-cad-data.mjs",
    "dev": "vite",
    "prebuild": "node scripts/fetch-cad-data.mjs",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@element-plus/icons-vue": "^2.3.1",
    "@mlightcad/cad-html-plugin": "1.5.5",
    "@mlightcad/cad-pdf-plugin": "1.5.5",
    "@mlightcad/cad-simple-viewer": "1.5.5",
    "@mlightcad/cad-viewer": "1.5.5",
    "@mlightcad/data-model": "^1.8.4",
    "element-plus": "^2.12.0",
    "three": "^0.172.0",
    "vue": "^3.4.21",
    "vue-i18n": "^11.4.4"
  },
  "devDependencies": {
    "@playwright/test": "^1.55.0",
    "@vitejs/plugin-vue": "^5.1.3",
    "typescript": "^5.5.0",
    "vite": "^5.4.19",
    "vite-plugin-static-copy": "^3.1.1",
    "vue-tsc": "^2.1.6"
  }
}
```

Note: `@mlightcad/*` viewer packages are pinned exactly to `1.5.5` (no caret) so upstream releases can't silently change the app. Upgrading is a deliberate version bump later.

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.vue"]
}
```

- [ ] **Step 3: Write `src/env.d.ts`**

```ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/<repo>/
  base: './',
  plugins: [
    vue(),
    // The viewer resolves its parser workers at ./assets/<name>-worker.js
    // relative to the page, so they must be copied out of node_modules.
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
          dest: 'assets'
        },
        {
          src: './node_modules/@mlightcad/cad-html-plugin/dist/viewer-runtime.iife.js',
          dest: 'assets'
        }
      ]
    })
  ],
  build: {
    outDir: 'dist',
    modulePreload: false
  }
})
```

- [ ] **Step 5: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="./favicon.ico" />
    <title>Glaz-Tech DXF Viewer</title>
    <style>
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #2c4257;
        border-top-color: #3182bf; /* Glaz-Tech primary blue */
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  </head>
  <body>
    <!-- Loading overlay shown until the Vue app mounts -->
    <div id="loader" style="
      position: fixed;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #16222e;
      z-index: 9999;
    ">
      <div class="spinner"></div>
    </div>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `.gitignore`**

```gitignore
node_modules/
dist/
.cache/
public/cad-data/
test-results/
playwright-report/
*.local
```

- [ ] **Step 7: Install dependencies**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && npm install
```
Expected: completes without errors; `package-lock.json` created. (~200+ packages; three.js and element-plus are large.)

- [ ] **Step 8: Commit**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && git add -A && git commit -m "feat: scaffold Vite + Vue project for Glaz-Tech DXF Viewer"
```

---

### Task 2: Brand assets

**Files:**
- Create: `public/gti-logo-white.png` (downloaded)
- Create: `public/favicon.ico` (downloaded)

- [ ] **Step 1: Download Glaz-Tech logo and favicon**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && mkdir -p public \
  && curl -sL -A "Mozilla/5.0" -o public/gti-logo-white.png https://www.glaztech.com/global-imgs/gti-logo-white.png \
  && curl -sL -A "Mozilla/5.0" -o public/favicon.ico https://www.glaztech.com/favicon.ico \
  && file public/gti-logo-white.png public/favicon.ico
```
Expected output includes:
```
public/gti-logo-white.png: PNG image data, 275 x 49, 8-bit/color RGBA, interlaced
public/favicon.ico:        MS Windows icon resource - 1 icon, 16x16
```
If either file is HTML instead of an image, the site blocked the request — stop and tell your human partner rather than committing a broken asset.

- [ ] **Step 2: Commit**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && git add -A && git commit -m "feat: add Glaz-Tech logo and favicon"
```

---

### Task 3: Self-hosted cad-data fetch script

**Files:**
- Create: `scripts/fetch-cad-data.mjs`

- [ ] **Step 1: Write `scripts/fetch-cad-data.mjs`**

```js
// Fetches fonts + templates from the upstream mlightcad/cad-data repo into
// public/cad-data/ so the deployed site serves them itself. Self-hosting
// matters because the viewer's default is a public CDN, which corporate
// firewalls may block — and without fonts, drawings render with missing text.
//
// public/cad-data/ is gitignored (48+ MB); this script runs automatically
// before `npm run dev` and `npm run build` and skips if data is present.
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'

const dest = path.resolve('public/cad-data')
if (existsSync(path.join(dest, 'fonts', 'fonts.json'))) {
  console.log('cad-data already present, skipping fetch')
  process.exit(0)
}

const cache = path.resolve('.cache/cad-data')
rmSync(cache, { recursive: true, force: true })
mkdirSync(path.dirname(cache), { recursive: true })
execSync(
  `git clone --depth 1 https://github.com/mlightcad/cad-data "${cache}"`,
  { stdio: 'inherit' }
)
mkdirSync(dest, { recursive: true })
for (const dir of ['fonts', 'templates']) {
  cpSync(path.join(cache, dir), path.join(dest, dir), { recursive: true })
}
rmSync(cache, { recursive: true, force: true })
console.log('cad-data copied to public/cad-data')
```

- [ ] **Step 2: Run it and verify**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && node scripts/fetch-cad-data.mjs && ls public/cad-data/fonts/fonts.json public/cad-data/templates && du -sh public/cad-data
```
Expected: `fonts.json` exists, templates listed, total ~49M.

- [ ] **Step 3: Run again to verify the skip path**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && node scripts/fetch-cad-data.mjs
```
Expected output: `cad-data already present, skipping fetch`

- [ ] **Step 4: Commit (script only — data dir is gitignored)**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && git add -A && git status --short && git commit -m "feat: add script to self-host cad-data fonts and templates"
```
Verify `git status --short` shows NO `public/cad-data` entries before the commit. If it does, fix `.gitignore` first.

---

### Task 4: Smoke tests first, then the app source

TDD order: write the Playwright smoke tests, watch them fail (no app exists), then write the app, then watch them pass.

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/smoke.spec.ts`
- Create: `samples/block-color.dxf` (copied from upstream fixtures)
- Create: `samples/minimal-line.dxf` (copied from upstream fixtures)
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `src/store.ts`
- Create: `src/App.vue`
- Create: `src/components/GtiFileUpload.vue`

- [ ] **Step 1: Copy sample DXF fixtures from upstream (MIT-licensed)**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && mkdir -p samples \
  && curl -sL -o samples/block-color.dxf https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-viewer-example/e2e/fixtures/block-color.dxf \
  && curl -sL -o samples/minimal-line.dxf https://raw.githubusercontent.com/mlightcad/cad-viewer/main/packages/cad-viewer-example/e2e/fixtures/minimal-line.dxf \
  && head -4 samples/minimal-line.dxf
```
Expected: `head` shows DXF group codes (`0`, `SECTION`, …), not HTML.

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:4173'
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})
```

Note: `preview` serves the **built** `dist/` folder — tests exercise what actually ships. Run `npm run build` before `npm run test:e2e`.

- [ ] **Step 3: Write `e2e/smoke.spec.ts`**

```ts
import { expect, test } from '@playwright/test'
import path from 'node:path'

test('upload screen shows Glaz-Tech branding and no upstream promo', async ({
  page
}) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Glaz-Tech DXF Viewer')
  await expect(page.getByAltText('Glaz-Tech Industries')).toBeVisible()

  const body = (await page.locator('body').innerText()).toLowerCase()
  expect(body).not.toContain('mlightcad')
  expect(body).not.toContain('thingraph')
})

test('opens a DXF file and shows the viewer canvas', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]')
  await input.setInputFiles(path.resolve('samples/block-color.dxf'))
  await expect(page.locator('canvas').first()).toBeVisible({
    timeout: 30_000
  })
})
```

- [ ] **Step 4: Install Playwright browser, then run tests to verify they FAIL**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && npx playwright install chromium && npm run build
```
Expected: **build FAILS** — `src/main.ts` doesn't exist yet. That is the failing state for this scaffold-level TDD loop (the test suite can't even get a build to serve). Proceed to write the app.

- [ ] **Step 5: Write `src/main.ts`**

```ts
import 'element-plus/dist/index.css'
import './style.css'

import { i18n } from '@mlightcad/cad-viewer'
import { createApp } from 'vue'

import App from './App.vue'

const app = createApp(App)
app.use(i18n)
app.mount('#app')

// Hide the index.html loading spinner once Vue has mounted
const loader = document.getElementById('loader')
if (loader) {
  loader.style.display = 'none'
}
```

- [ ] **Step 6: Write `src/style.css`** (Glaz-Tech theme for Element Plus)

```css
/* Glaz-Tech brand theme.
   Primary blue #3182bf from glaztech.com; the light-N/dark-2 shades are the
   standard Element Plus tint/shade steps computed from that primary. */
:root {
  --el-color-primary: #3182bf;
  --el-color-primary-light-3: #6fa7d2;
  --el-color-primary-light-5: #98c1df;
  --el-color-primary-light-7: #c1daec;
  --el-color-primary-light-8: #d6e6f2;
  --el-color-primary-light-9: #eaf3f9;
  --el-color-primary-dark-2: #276899;
}

html,
body {
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 7: Write `src/store.ts`**

```ts
import { reactive } from 'vue'

export const store = reactive<{
  selectedFile: File | null
}>({
  selectedFile: null
})
```

- [ ] **Step 8: Write `src/App.vue`**

```vue
<template>
  <div id="app-root">
    <!-- Branded upload screen until a file is chosen -->
    <div v-if="!store.selectedFile" class="upload-screen">
      <GtiFileUpload @file-select="handleFileSelect" />
    </div>

    <!-- Full CAD viewer once a file is selected -->
    <div v-else>
      <MlCadViewer
        locale="en"
        theme="dark"
        :local-file="store.selectedFile"
        :mode="openMode"
        :base-url="cadDataBaseUrl"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { AcEdOpenMode } from '@mlightcad/cad-simple-viewer'
import { MlCadViewer } from '@mlightcad/cad-viewer'

import GtiFileUpload from './components/GtiFileUpload.vue'
import { store } from './store'

// Write mode so office staff can add text notes and dimensions
const openMode = AcEdOpenMode.Write

// Fonts/templates are self-hosted under the site root (see
// scripts/fetch-cad-data.mjs) so the viewer works on networks that block
// public CDNs. Trailing slash required: upstream appends 'fonts/'.
const cadDataBaseUrl = new URL('cad-data/', document.baseURI).href

const handleFileSelect = (file: File) => {
  store.selectedFile = file
}
</script>

<style scoped>
#app-root {
  height: 100vh;
  position: fixed;
}

.upload-screen {
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: safe center;
  overflow-y: auto;
  /* Dark slate gradient echoing glaztech.com's dark navigation */
  background: linear-gradient(135deg, #16222e 0%, #2c4257 100%);
  margin: 0;
  padding: 24px;
  box-sizing: border-box;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1000;
}
</style>
```

- [ ] **Step 9: Write `src/components/GtiFileUpload.vue`**

```vue
<template>
  <div class="gti-upload-panel">
    <img
      class="gti-logo"
      src="/gti-logo-white.png"
      alt="Glaz-Tech Industries"
    />
    <h1 class="gti-title">DXF Viewer</h1>
    <p class="gti-subtitle">
      View, measure, and annotate DWG/DXF drawings — no CAD license required.
    </p>

    <el-upload
      class="gti-dropzone"
      drag
      :auto-upload="false"
      :show-file-list="false"
      accept=".dwg,.dxf"
      :on-change="handleFileChange"
    >
      <div class="gti-dropzone-content">
        <el-icon :size="36" class="gti-upload-icon">
          <UploadFilled />
        </el-icon>
        <p class="gti-drop-title">Drop your drawing here</p>
        <p class="gti-drop-hint">
          or <span class="gti-link">browse files</span>
        </p>
        <div class="gti-format-tags">
          <span class="gti-format-tag">DWG</span>
          <span class="gti-format-tag">DXF</span>
        </div>
      </div>
    </el-upload>
  </div>
</template>

<script setup lang="ts">
import { UploadFilled } from '@element-plus/icons-vue'
import { ElIcon, ElMessage, ElUpload, type UploadFile } from 'element-plus'

const emit = defineEmits<{
  (e: 'file-select', file: File): void
}>()

const handleFileChange = (uploadFile: UploadFile) => {
  const raw = uploadFile.raw
  if (!raw) {
    return
  }
  const name = raw.name.toLowerCase()
  if (!name.endsWith('.dwg') && !name.endsWith('.dxf')) {
    ElMessage.error('Please select a DWG or DXF file')
    return
  }
  emit('file-select', raw)
}
</script>

<style scoped>
.gti-upload-panel {
  width: min(520px, 92vw);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 40px 36px;
  text-align: center;
  backdrop-filter: blur(6px);
}

.gti-logo {
  width: 275px;
  max-width: 80%;
  height: auto;
  margin-bottom: 8px;
}

.gti-title {
  color: #fff;
  font-size: 26px;
  font-weight: 600;
  margin: 4px 0 8px;
  letter-spacing: 0.04em;
}

.gti-subtitle {
  color: rgba(255, 255, 255, 0.75);
  font-size: 14px;
  margin: 0 0 28px;
}

.gti-dropzone :deep(.el-upload-dragger) {
  background: rgba(255, 255, 255, 0.04);
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 12px;
  padding: 36px 16px;
  transition: border-color 0.2s ease;
}

.gti-dropzone :deep(.el-upload-dragger:hover) {
  border-color: #3182bf;
}

.gti-upload-icon {
  color: #3182bf;
  margin-bottom: 8px;
}

.gti-drop-title {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 4px;
}

.gti-drop-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  margin: 0 0 16px;
}

.gti-link {
  color: #6fa7d2;
  text-decoration: underline;
}

.gti-format-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.gti-format-tag {
  background: rgba(49, 130, 191, 0.25);
  color: #c1daec;
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}
</style>
```

- [ ] **Step 10: Build**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && npm run build
```
Expected: `vue-tsc` passes, Vite build succeeds, and `dist/assets/` contains `dxf-parser-worker.js`, `libredwg-parser-worker.js` (plus any other `*-worker.js`), and `viewer-runtime.iife.js`. Verify:
```bash
ls "/c/Users/christopher/Documents/GTI DXF Viewer/dist/assets/" | grep -E "worker|viewer-runtime"
```

If `vue-tsc` reports type errors from inside `node_modules/@mlightcad/*`, that's upstream noise — `skipLibCheck` is already on; only fix errors in our `src/`.

- [ ] **Step 11: Run smoke tests to verify they PASS**

Run:
```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && npm run test:e2e
```
Expected: `2 passed`. If the canvas test times out, run headed (`npx playwright test --headed`) and look at what the viewer shows — a console error about a missing worker file means the static-copy targets in `vite.config.ts` didn't match.

- [ ] **Step 12: Commit**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && git add -A && git commit -m "feat: branded viewer app with passing smoke tests"
```

---

### Task 5: LICENSE and README

**Files:**
- Create: `LICENSE`
- Create: `README.md`

- [ ] **Step 1: Write `LICENSE`**

```text
MIT License

Copyright (c) 2026 Glaz-Tech Industries (application shell and branding)
Copyright (c) mlightcad (cad-viewer libraries, https://github.com/mlightcad/cad-viewer)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Write `README.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && git add -A && git commit -m "docs: add LICENSE with upstream attribution and Glaz-Tech README"
```

---

### Task 6: GitHub repo + Pages deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      # prebuild hook fetches fonts/templates (~49 MB) from mlightcad/cad-data
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit the workflow**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && git add -A && git commit -m "ci: add GitHub Pages deploy workflow"
```

- [ ] **Step 3: Create the GitHub repo and push**

```bash
cd "/c/Users/christopher/Documents/GTI DXF Viewer" && gh repo create rusty159753/glaztech-dxf-viewer --public --description "Glaz-Tech Industries browser-based DWG/DXF viewer - view, measure, and annotate CAD drawings with no install" --source . --push
```
Expected: repo created, `main` pushed.

- [ ] **Step 4: Configure Pages to deploy from Actions**

```bash
gh api -X POST repos/rusty159753/glaztech-dxf-viewer/pages -f build_type=workflow
```
Expected: HTTP 201 with a JSON body. If it returns 409 (already exists), set it instead:
```bash
gh api -X PUT repos/rusty159753/glaztech-dxf-viewer/pages -f build_type=workflow
```

- [ ] **Step 5: Trigger and watch the first deploy**

The push in Step 3 already triggered the workflow. Watch it:
```bash
gh run watch --repo rusty159753/glaztech-dxf-viewer --exit-status
```
Expected: build + deploy jobs succeed. If the run started before Pages was enabled (Step 4) and the deploy job failed, re-run:
```bash
gh run rerun --repo rusty159753/glaztech-dxf-viewer --failed
```

---

### Task 7: Live verification (definition of done)

No files. This is the spec's verification checklist, executed against
`https://rusty159753.github.io/glaztech-dxf-viewer/` in a real browser
(use the Claude-in-Chrome MCP tools, or walk through it with your human
partner watching).

- [ ] **Step 1: Branding checks**

Load the live URL. Confirm: tab title "Glaz-Tech DXF Viewer", Glaz-Tech favicon, white Glaz-Tech logo on the dark upload screen, no "mlightcad" or "Thingraph" text anywhere in the UI.

- [ ] **Step 2: Open a DXF**

Drop `samples/block-color.dxf` (from the repo) onto the drop zone. Drawing renders on canvas; layer panel lists layers.

- [ ] **Step 3: Open a DWG**

Download a sample DWG first:
```bash
curl -sL -o /tmp/sample.dwg https://raw.githubusercontent.com/mlightcad/cad-data/main/data/sample.dwg
```
(If that exact filename 404s, list the dir: `gh api repos/mlightcad/cad-data/contents/data --jq ".[].name"` and pick any `.dwg`.) Open it in the live app. Drawing renders — this proves the libredwg worker is served from our site.

- [ ] **Step 4: Self-hosted fonts check**

In browser DevTools → Network, filter "fonts". Font requests must go to `rusty159753.github.io/glaztech-dxf-viewer/cad-data/fonts/...`, NOT `cdn.jsdelivr.net`.

- [ ] **Step 5: Annotation tools**

In the open drawing: run `MTEXT`, place a text note. Run `DIMLINEAR`, place a linear dimension. Both appear on the canvas.

- [ ] **Step 6: Export PDF**

Run `CPDF`. A vector PDF downloads and opens showing the drawing plus the note and dimension.

- [ ] **Step 7: Save back to DXF**

Main menu (☰) → Save/Export as DXF. The file downloads. Re-open the downloaded DXF in the viewer — the note and dimension are still there (round-trip proof for the GTI cutting programs).

- [ ] **Step 8: Report results**

Show your human partner the live URL and the checklist results, including anything that didn't behave as expected.

---

## Self-review notes

- **Spec coverage:** repo/architecture → Tasks 1, 4, 6; branding → Tasks 2, 4 (index.html title/favicon, upload screen, theme CSS); promo stripping → our app simply contains no upstream promo, enforced by the smoke test in Task 4; attribution → Task 5; deployment + self-hosted assets → Tasks 3, 6, verified in Task 7; docs + sample DXF → Tasks 4, 5; verification checklist → Task 7. Old repo untouched: no task touches `GTI-DXF-Viewer`. ✓
- **Known risk:** exact Element Plus/`vue-tsc` version interactions can surface type errors at build time. The fix boundary is stated in Task 4 Step 10 (only fix our `src/`, never patch node_modules).
- **Known risk:** `mode` prop name/enum (`AcEdOpenMode.Write`) and `theme` prop verified against upstream 1.5.5 source on 2026-06-12.
```
