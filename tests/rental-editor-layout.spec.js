import { test, expect } from '@playwright/test'

async function landlord(page) {
  const response = await page.request.post('/api/auth/register', { data: {
    name: 'Rental Editor Test', email: `rental-editor-${Date.now()}@example.com`,
    phone: '0987654321', password: 'testpass123', role: 'landlord', terms: true,
  } })
  expect(response.status()).toBe(201)
  await page.goto('/#/quan-ly/bai-dang')
  await expect(page.getByRole('heading', { name: 'Bài đăng cho thuê', exact: true })).toBeVisible()
}

for (const width of [1366, 390]) {
  test(`rental gallery and framed amenities work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await landlord(page)
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
      const data = JSON.parse(localStorage.getItem(key))
      const ownerId = JSON.parse(localStorage.getItem('findmyroom:user')).id
      data.posts[0] = { ...data.posts[0], kind: 'rental', ownerId, houseId: 'minh-an', count: 2 }
      localStorage.setItem(key, JSON.stringify(data))
    })
    await page.reload()
    const edit = page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true })
    await edit.click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Hình ảnh', exact: true }).click()
    while (await dialog.locator('.photo-remove').count()) await dialog.locator('.photo-remove').first().click()
    await expect(dialog.locator('.editor-upload')).toHaveClass(/is-empty/)
    await page.screenshot({ path: test.info().outputPath('empty.png'), fullPage: true })
    const transfer = await page.evaluateHandle(() => {
      const data = new DataTransfer()
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII='), c => c.charCodeAt(0))
      for (let i = 0; i < 4; i++) data.items.add(new File([bytes], `room${i}.png`, { type: 'image/png' }))
      return data
    })
    const input = dialog.getByLabel('Thêm ảnh bài đăng', { exact: true })
    await input.setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
    await expect(dialog.getByRole('alert')).toContainText('5 MB')
    await expect(dialog.locator('.editor-photos figure')).toHaveCount(0)
    await input.dispatchEvent('dragenter', { dataTransfer: transfer })
    await expect(dialog.locator('.editor-photos')).toHaveClass(/dragging/)
    await input.dispatchEvent('drop', { dataTransfer: transfer })
    await expect(dialog.locator('.editor-photos figure')).toHaveCount(4)
    await expect(dialog.locator('.editor-photos')).not.toHaveClass(/dragging|is-empty/)
    await input.setInputFiles({ name: 'picked.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64') })
    await expect(dialog.locator('.editor-photos figure')).toHaveCount(5)
    const image = await dialog.locator('.editor-photos figure').first().boundingBox()
    const tile = await dialog.locator('.editor-upload').boundingBox()
    expect(Math.abs(image.width - image.height)).toBeLessThan(2)
    expect(Math.abs(image.width - tile.width)).toBeLessThan(2)
    await dialog.getByRole('button', { name: 'Đặt làm ảnh bìa', exact: true }).last().click()
    await dialog.locator('.photo-remove').last().click()
    await page.screenshot({ path: test.info().outputPath('gallery.png'), fullPage: true })
    await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
    await expect(dialog.locator('.editor-amenities fieldset')).toHaveCount(3)
    await dialog.getByLabel('Camera 24/7', { exact: true }).check()
    const frame = dialog.locator('.editor-amenities fieldset > div').first()
    expect(await frame.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('1px')
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('amenities.png'), fullPage: true })
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await page.reload()
    await edit.click()
    await dialog.getByRole('button', { name: 'Hình ảnh', exact: true }).click()
    await expect(dialog.locator('.editor-photos figure')).toHaveCount(4)
    await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
    await expect(dialog.getByLabel('Camera 24/7', { exact: true })).toBeChecked()
  })
}

for (const fullStorage of [false, true, 'unavailable']) {
test(`saving optimizes existing photos and persists when localStorage is full: ${fullStorage}`, async ({ page }) => {
  await landlord(page)
  await page.evaluate(async () => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    const canvas = document.createElement('canvas')
    canvas.width = 1800; canvas.height = 1200
    canvas.getContext('2d').fillRect(0, 0, 1800, 1200)
    const blob = await (await fetch(canvas.toDataURL('image/png'))).blob()
    // A valid PNG with extra trailing bytes models older unoptimized uploads.
    const source = await new Promise(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.readAsDataURL(new Blob([blob, new Uint8Array(180000)], { type: 'image/png' }))
    })
    data.posts = [{ ...data.posts[0], ownerId: JSON.parse(localStorage.getItem('findmyroom:user')).id,
      kind: 'rental', houseId: 'minh-an', count: 2, images: [source, source, source, source], image: source }]
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.reload()
  await expect(page.locator('.manage-post').first()).toBeVisible()
  await page.evaluate(fullStorage => {
    const original = Storage.prototype.setItem
    const originalPut = IDBObjectStore.prototype.put
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('findmyroom-demo-v1:') && (fullStorage || value.length > 500000)) throw new DOMException('Storage full', 'QuotaExceededError')
      return original.call(this, key, value)
    }
    if (fullStorage === 'unavailable') IDBObjectStore.prototype.put = () => { throw new DOMException('Database unavailable', 'QuotaExceededError') }
    window.restoreTestStorage = () => { Storage.prototype.setItem = original; IDBObjectStore.prototype.put = originalPut }
  }, fullStorage)
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  if (fullStorage === 'unavailable') {
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Không lưu được dữ liệu')
    await expect(page.locator('.manage-post img').first()).toHaveAttribute('src', /^data:image\/png/)
    await page.evaluate(() => window.restoreTestStorage())
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  }
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.manage-post img').first()).toHaveAttribute('src', /^data:image\/webp/)
  if (fullStorage === true) expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('findmyroom-demo-v1:')).length)).toBe(0)
  await page.reload()
  await expect(page.locator('.manage-post img').first()).toHaveAttribute('src', /^data:image\/webp/)
})
}
