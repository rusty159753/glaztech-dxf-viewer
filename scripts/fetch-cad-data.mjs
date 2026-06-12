// Fetches fonts + templates from the upstream mlightcad/cad-data repo into
// public/cad-data/ so the deployed site serves them itself. Self-hosting
// matters because the viewer's default is a public CDN, which corporate
// firewalls may block — and without fonts, drawings render with missing text.
//
// public/cad-data/ is gitignored (48+ MB); this script runs automatically
// before `npm run dev` and `npm run build` and skips if data is present.
import { execSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'

const dest = path.resolve('public/cad-data')

if (existsSync(path.join(dest, 'fonts', 'fonts.json'))) {
  console.log('cad-data already present, skipping fetch')
} else {
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
}

// The upstream "New Drawing" templates ship Chinese layout names (布局1/布局2);
// rename them to English so the layout tabs read Layout1/Layout2. Runs every
// time and is idempotent, so it also patches a previously fetched data dir.
patchTemplates()

function patchTemplates() {
  const replacements = [
    ['布局1', 'Layout1'], // 布局1
    ['布局2', 'Layout2'] // 布局2
  ]
  for (const name of ['acadiso.dxf', 'acad.dxf']) {
    const file = path.join(dest, 'templates', name)
    if (!existsSync(file)) continue
    const original = readFileSync(file, 'utf8')
    let patched = original
    for (const [from, to] of replacements) {
      patched = patched.split(from).join(to)
    }
    if (patched !== original) {
      writeFileSync(file, patched)
      console.log(`patched ${name}: Chinese layout names -> English`)
    }
  }
}
