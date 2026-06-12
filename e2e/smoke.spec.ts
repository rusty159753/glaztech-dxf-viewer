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
