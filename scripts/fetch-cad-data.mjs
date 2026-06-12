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
