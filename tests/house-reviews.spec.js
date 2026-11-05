import { test, expect } from '@playwright/test'

test('comments belong to the house and are visible to other visitors', async ({ page, browser }) => {
  await page.goto('/#/dang-nhap')
  await page.getByLabel('Email *', { exact: true }).fill('sinhvien@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(/dang-nhap/)
  await page.goto('/#/phong/minh-an')
  await expect(page.getByText('Phòng sạch sẽ, chủ trọ hỗ trợ nhanh và khu vực khá yên tĩnh.')).toBeVisible()
  await expect(page.getByLabel('5 trên 5 sao')).toBeVisible()
  await expect(page.locator('.house-review img').first()).toBeVisible()
  const order = await page.locator('.detail-grid').evaluate(root => {
    const heading = text => [...root.querySelectorAll('h2')].find(item => item.textContent.trim() === text)
    return {
      commentAfterDescription: !!(heading('Mô tả chi tiết').compareDocumentPosition(heading('Đánh giá nhà trọ')) & Node.DOCUMENT_POSITION_FOLLOWING),
      mapBeforeHouse: !!(heading('Vị trí chỗ ở').compareDocumentPosition(heading('Nhà trọ')) & Node.DOCUMENT_POSITION_FOLLOWING),
      houseBeforeAmenities: !!(heading('Nhà trọ').compareDocumentPosition(heading('Tiện ích')) & Node.DOCUMENT_POSITION_FOLLOWING),
      contactBelowHouse: !!(heading('Nhà trọ').compareDocumentPosition(root.querySelector('aside .contact-card')) & Node.DOCUMENT_POSITION_FOLLOWING),
    }
  })
  expect(Object.values(order).every(Boolean)).toBeTruthy()
  await expect(page.getByLabel('Viết bình luận')).toBeVisible()
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    await expect(page.locator('.review-upload')).toBeVisible()
  }
  await page.getByLabel('4 sao', { exact: true }).check()
  await page.getByLabel('Viết bình luận').fill('Nhà trọ sạch sẽ và yên tĩnh.')
  await page.locator('#review-image').setInputFiles({ name: 'phong.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/aXcAAAAASUVORK5CYII=', 'base64') })
  await expect(page.getByAltText('Ảnh đánh giá đã chọn')).toBeVisible()
  await page.getByRole('button', { name: 'Gửi bình luận' }).click()
  await expect(page.getByText('Nhà trọ sạch sẽ và yên tĩnh.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Nhà trọ sạch sẽ và yên tĩnh.', { exact: true })).toBeVisible()

  const visitor = await browser.newContext()
  const other = await visitor.newPage()
  await other.goto('/#/phong/minh-an')
  await expect(other.getByText('Nhà trọ sạch sẽ và yên tĩnh.', { exact: true })).toBeVisible()
  await expect(other.getByLabel('4 trên 5 sao')).toBeVisible()
  await expect(other.locator('.house-review').filter({ hasText: 'Nhà trọ sạch sẽ và yên tĩnh.' }).locator('img')).toHaveCount(1)
  await expect(other.getByRole('link', { name: 'Đăng nhập để bình luận' })).toBeVisible()
  await other.evaluate(() => {
    const key = 'findmyroom-demo-v1'
    const data = JSON.parse(localStorage.getItem(key))
    data.posts.push({ ...data.posts[0], id: 'same-house-test', title: 'Phòng khác cùng nhà', kind: 'rental' })
    localStorage.setItem(key, JSON.stringify(data))
  })
  await other.goto('/#/phong/same-house-test')
  await other.reload()
  await expect(other.getByText('Nhà trọ sạch sẽ và yên tĩnh.', { exact: true })).toBeVisible()
  await other.goto('/#/phong/hung-phu')
  await expect(other.getByText('Phòng thoáng, nhà vệ sinh sạch và các khoản phí rõ ràng.')).toBeVisible()
  await expect(other.getByText('Nhà trọ sạch sẽ và yên tĩnh.', { exact: true })).toHaveCount(0)
  await other.goto('/#/phong/ghep-thu')
  await expect(other.getByRole('heading', { name: 'Đánh giá nhà trọ' })).toHaveCount(0)
  await visitor.close()
})

test('comment API validates input and requires login', async ({ request }) => {
  expect((await request.post('/api/house-reviews', { data: { houseId: 'minh-an', content: 'Xin chào' } })).status()).toBe(401)
  expect((await request.get('/api/house-reviews?houseId=bad%2Fid')).status()).toBe(400)
  expect((await request.post('/api/auth/login', { data: { email: 'sinhvien@example.com', password: 'demopass123' } })).ok()).toBeTruthy()
  expect((await request.post('/api/house-reviews', { data: { houseId: 'minh-an', content: '   ' } })).status()).toBe(400)
  expect((await request.post('/api/house-reviews', { data: { houseId: 'minh-an', content: 'a'.repeat(1001) } })).status()).toBe(400)
  expect((await request.post('/api/house-reviews', { data: { houseId: 'minh-an', content: 'Tốt', rating: 6 } })).status()).toBe(400)
  expect((await request.post('/api/house-reviews', { data: { houseId: 'minh-an', content: 'Tốt', rating: 5, image: 'data:image/png;base64,SGVsbG8=' } })).status()).toBe(400)
})
