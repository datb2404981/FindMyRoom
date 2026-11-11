import { test, expect } from '@playwright/test'

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64')
const photo = name => ({ name: name + '.png', mimeType: 'image/png', buffer: png })
async function register(page, role) {
  const response = await page.request.post('/api/auth/register', { data: { name: 'Review ' + role,
    email: `review-${role}-${Date.now()}@example.com`, phone: '0987654321', password: 'testpass123', role, terms: true } })
  expect(response.status()).toBe(201)
}

test('students append multiple review photos, remove one, and share persisted photos with visitors', async ({ page, browser }) => {
  await register(page, 'landlord')
  const houseId = 'review-house-' + Date.now(), postId = 'post-review-' + Date.now()
  expect((await page.request.put('/api/boarding-houses/' + houseId, { data: { name: 'Review house', address: 'Can Tho' } })).ok()).toBeTruthy()
  expect((await page.request.put('/api/rentals/' + postId, { data: { title: 'Review room', houseId, status: '\u0043\u00f2n ph\u00f2ng', price: 2000000, area: 25, people: 2, images: ['/illustrations/room-1.svg'] } })).ok()).toBeTruthy()
  await register(page, 'student')
  await page.goto('/#/phong/' + postId)
  const input = page.locator('#review-image')
  await input.setInputFiles([photo('first'), photo('second')])
  await expect(page.locator('.review-image-preview')).toHaveCount(2)
  await input.setInputFiles(photo('third'))
  await expect(page.locator('.review-image-preview')).toHaveCount(3)
  await page.locator('.review-image-preview button').nth(1).click()
  await expect(page.locator('.review-image-preview')).toHaveCount(2)
  await input.setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') })
  await expect(page.locator('#review-error')).toBeVisible()
  await expect(page.locator('.review-image-preview')).toHaveCount(2)
  await page.getByLabel('4 sao', { exact: true }).check()
  await page.locator('#review-content').fill('Review with two photographs')
  for (const width of [390, 1366]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  }
  await page.locator('.review-form button[type=submit]').click()
  const review = page.locator('.house-review').filter({ hasText: 'Review with two photographs' })
  await expect(review).toBeVisible()
  await expect(review.locator('img')).toHaveCount(2)
  await expect(page.locator('.review-image-preview')).toHaveCount(0)
  await page.reload()
  await expect(review.locator('img')).toHaveCount(2)
  const context = await browser.newContext()
  try {
    const other = await context.newPage()
    await other.goto('/#/phong/' + postId)
    await expect(other.locator('.house-review').filter({ hasText: 'Review with two photographs' }).locator('img')).toHaveCount(2)
    await expect(other.locator('.review-form')).toHaveCount(0)
  } finally { await context.close() }
})
