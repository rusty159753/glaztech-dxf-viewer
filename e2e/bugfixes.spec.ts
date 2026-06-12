import { expect, test } from '@playwright/test'
import path from 'node:path'

const SAMPLE = path.resolve('samples/block-color.dxf')

// Opens a DXF and waits for the viewer (canvas + ribbon) to be ready.
async function openDrawing(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(SAMPLE)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.ml-ribbon-tab--file')).toBeVisible({
    timeout: 30_000
  })
}

test('bundled templates have English layout names, no Chinese', async ({
  page
}) => {
  const res = await page.request.get('/cad-data/templates/acadiso.dxf')
  expect(res.ok()).toBeTruthy()
  const dxf = await res.text()
  // U+5E03 U+5C40 == the Chinese word for "layout"
  expect(dxf).not.toContain('布局')
  expect(dxf).toContain('Layout1')
  expect(dxf).toContain('Layout2')
})

test('language switcher is hidden (English-only build)', async ({ page }) => {
  await openDrawing(page)
  await expect(page.locator('.ml-ribbon-language-switch').first()).toBeHidden()
})

test('New Drawing returns to the Glaz-Tech upload screen', async ({ page }) => {
  await openDrawing(page)
  await page.locator('.ml-ribbon-tab--file').click()
  await page.getByText('New Drawing', { exact: false }).click()
  // Back at the branded picker; never loads the blank template.
  await expect(page.getByAltText('Glaz-Tech Industries')).toBeVisible({
    timeout: 15_000
  })
})

// Helper: File -> Export -> "Export to <type>" and return the download bytes.
async function exportViaMenu(
  page: import('@playwright/test').Page,
  itemRe: RegExp
) {
  await page.locator('.ml-ribbon-tab--file').click()
  await page.getByText('Export', { exact: false }).first().hover()
  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 })
  await page.getByText(itemRe).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(c as Buffer)
  return Buffer.concat(chunks)
}

test('PDF export still works after a New Drawing cycle', async ({ page }) => {
  // Regression: New Drawing reloads to the upload screen; the next viewer must
  // re-register the lazy PDF plugin so "Export to PDF" doesn't 404 cpdf.
  await openDrawing(page)
  expect((await exportViaMenu(page, /export to pdf/i)).length).toBeGreaterThan(
    1000
  )

  await page.locator('.ml-ribbon-tab--file').click()
  await page.getByText('New Drawing', { exact: false }).click()
  await expect(page.getByAltText('Glaz-Tech Industries')).toBeVisible({
    timeout: 15_000
  })

  // Open again and export again — this is what was failing before the fix.
  await page.locator('input[type="file"]').setInputFiles(SAMPLE)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.ml-ribbon-tab--file')).toBeVisible({
    timeout: 30_000
  })
  expect((await exportViaMenu(page, /export to pdf/i)).length).toBeGreaterThan(
    1000
  )
})

test('SVG export uses a white background in dark mode', async ({ page }) => {
  await openDrawing(page)
  // File -> Export -> Export to SVG (csvg). Export submenu opens on hover.
  await page.locator('.ml-ribbon-tab--file').click()
  await page.getByText('Export', { exact: false }).first().hover()
  const downloadPromise = page.waitForEvent('download', { timeout: 90_000 })
  await page.getByText(/export to svg/i).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const c of stream) chunks.push(c as Buffer)
  const svg = Buffer.concat(chunks).toString('utf8')
  // The first <rect> is the page background; it must be white, not black.
  const firstRect = svg.match(/<rect[^>]*fill="(#[0-9a-fA-F]{6})"/)
  expect(firstRect, 'background rect not found in SVG').not.toBeNull()
  expect(firstRect![1].toLowerCase()).toBe('#ffffff')
})
