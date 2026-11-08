import { test, expect } from '@playwright/test'

async function login(page) {
  await page.goto('/#/dang-nhap?redirect=/quan-ly/bai-dang')
  await page.getByLabel('Email *', { exact: true }).fill('chutro@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/quan-ly\/bai-dang/)
  await expect(page.getByRole('heading', { name: 'Bài đăng cho thuê', exact: true })).toBeVisible()
}

for (const status of ['Còn phòng', 'Hết phòng', 'Ẩn']) {
  test(`publishing keeps ${status} through management, house details and reload`, async ({ page }) => {
    await login(page)
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
      const data = JSON.parse(localStorage.getItem(key))
      data.drafts.rental = {
        title: 'Phòng kiểm tra trạng thái', houseId: 'minh-an', count: 2, people: 2,
        price: 2000000, area: 25, electric: 3500, water: 18000,
        ward: 'Ninh Kiều', street: '123 đường 3/2',
      }
      localStorage.setItem(key, JSON.stringify(data))
    })
    await page.reload()
    await page.goto('/#/dang-bai/rental')
    const control = page.getByRole('button', { name: 'Trạng thái', exact: true })
    await control.click()
    const options = page.getByRole('listbox', { name: 'Trạng thái', exact: true })
    await expect(options.getByRole('option')).toHaveText(['Còn phòng', 'Hết phòng', 'Ẩn'])
    await options.getByRole('option', { name: status, exact: true }).click()
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64')
    await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles([1, 2, 3, 4].map(i => ({ name: `photo${i}.png`, mimeType: 'image/png', buffer: png })))
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await page.getByRole('button', { name: 'Đăng bài', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Quản lý bài đăng', exact: true }).last().click()
    await expect(page.locator('.manage-post').first().locator('.badge')).toHaveText(status)
    await page.reload()
    await expect(page.locator('.manage-post').first().locator('.badge')).toHaveText(status)
    await page.goto('/#/nha-tro/minh-an')
    const card = page.locator('.room-card').filter({ hasText: 'Phòng kiểm tra trạng thái' })
    await expect(card.locator('.badge')).toHaveText(status)
    await expect(page.getByText('Chờ duyệt', { exact: true })).toHaveCount(0)
  })
}

test('legacy pending posts recover by room count without changing valid statuses', async ({ page }) => {
  await login(page)
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    const original = { ...data.posts[0], ownerId: JSON.parse(localStorage.getItem('findmyroom:user')).id }
    data.posts = ['Còn phòng', 'Hết phòng', 'Ẩn', 'Chờ duyệt', 'Chờ duyệt'].map((status, i) => ({
      ...original, id: `status-test-${i}`, status, count: i === 4 ? 0 : 2,
    }))
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.reload()
  await page.getByRole('button', { name: 'Xem thêm', exact: true }).click()
  await expect(page.locator('.manage-post .badge')).toHaveText(['Còn phòng', 'Hết phòng', 'Ẩn', 'Còn phòng', 'Hết phòng'])
  await page.locator('.manage-post').nth(3).getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Trạng thái', exact: true })).toHaveText('Còn phòng')
})
