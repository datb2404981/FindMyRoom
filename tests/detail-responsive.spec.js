import { test, expect } from '@playwright/test'

for (const width of [320, 375, 600, 768]) {
  for (const id of ['minh-an', 'ghep-thu']) {
    test(`detail ${id} fits a ${width}px viewport`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/#/phong/' + id)
      const overflow = await page.evaluate(() => [...document.querySelectorAll('.detail-grid, .detail-grid *')]
        .filter(element => {
          const style = getComputedStyle(element), rect = element.getBoundingClientRect()
          return !element.closest('.review-images') && style.position !== 'absolute' && style.position !== 'fixed' && rect.width && (rect.left < -1 || rect.right > innerWidth + 1)
        }).map(element => `${element.tagName}.${element.className}`).slice(0, 10))
      expect(overflow).toEqual([])
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await expect(page.locator('.detail-photo')).toBeVisible()
      await expect(page.locator('.contact-card .contact-phone')).toBeVisible()
    })
  }
}

test('review form fits on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  expect((await page.request.post('/api/auth/login', { data: { email: 'sinhvien@example.com', password: 'demopass123' } })).ok()).toBeTruthy()
  await page.goto('/#/phong/minh-an')
  await expect(page.getByLabel('Viết bình luận')).toBeVisible()
  for (const selector of ['.review-form', '#review-content', '.review-actions', '.contact-card']) {
    const box = await page.locator(selector).boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(321)
  }
  await expect(page.getByLabel('4 sao', { exact: true })).toBeAttached()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320)
})

test('photo controls appear on hover and availability matches the room card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/#/phong/minh-an')
  const next = page.getByRole('button', { name: 'Ảnh tiếp theo' })
  await expect(next).toHaveCSS('opacity', '0')
  await next.hover({ force: true })
  await expect(next).toHaveCSS('opacity', '1')
  await next.click()
  await expect(page.locator('.photo-counter')).toHaveText('2 / 4')
  await expect(page.locator('.detail-badges .badge').first()).toHaveCSS('background-color', 'rgb(39, 107, 80)')
})

test('long unbroken descriptions wrap without spilling into the next column', async ({ page }) => {
  await page.goto('/#/')
  await page.evaluate(() => {
    const key = 'findmyroom-demo-v1'
    const data = JSON.parse(localStorage.getItem(key))
    data.posts.push({ ...data.posts[0], id: 'long-description', kind: 'roommate', desc: 'chuoidai'.repeat(200) + '\nDòng tiếp theo', habits: 'khongdaucach'.repeat(100) })
    localStorage.setItem(key, JSON.stringify(data))
  })
  for (const width of [375, 1280]) {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/#/phong/long-description')
    await page.reload()
    for (const selector of ['.desc-text', '.habits-box p']) {
      const fits = await page.locator(selector).evaluate(element => element.scrollWidth <= element.clientWidth)
      expect(fits).toBeTruthy()
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})
