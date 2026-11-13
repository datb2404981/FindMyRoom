import { test, expect } from '@playwright/test'

async function student(page) {
  const response = await page.request.post('/api/auth/register', { data: {
    name: 'Roommate Status Test', email: `roommate-status-${Date.now()}@example.com`,
    phone: '0987654321', password: 'testpass123', role: 'student', terms: true,
  } })
  expect(response.status()).toBe(201)
  await page.goto('/#/dang-bai/roommate')
  await expect(page.getByLabel('Tiêu đề bài đăng *', { exact: true })).toBeVisible()
}

for (const status of ['Còn phòng', 'Hết phòng', 'Ẩn']) {
  test(`roommate post defaults to Còn phòng and editing keeps ${status}`, async ({ page }) => {
    await student(page)
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
      const data = JSON.parse(localStorage.getItem(key))
      data.drafts.roommate = { title: 'Ghép trọ giữ trạng thái', gender: 'Tất cả',
        people: 1, area: 25, price: 2000000, perPerson: 1000000, electric: 3500, water: 18000,
        moveIn: '2027-12-10', ward: 'Ninh Kiều', street: '123 đường 3/2' }
      localStorage.setItem(key, JSON.stringify(data))
    })
    await page.reload()
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64')
    await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles([1, 2, 3, 4].map(i => ({ name: `room${i}.png`, mimeType: 'image/png', buffer: png })))
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await page.getByRole('button', { name: 'Đăng bài', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()
    await page.getByRole('link', { name: 'Quản lý bài đăng', exact: true }).last().click()
    
    // Mặc định bài ghép trọ mới tạo là "Còn phòng"
    await expect(page.locator('.manage-post .badge').first()).toHaveText('Còn phòng')

    // Nếu test trạng thái "Hết phòng" hoặc "Ẩn", chỉnh sửa qua modal
    if (status !== 'Còn phòng') {
      await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const statusBtn = dialog.getByRole('button', { name: 'Trạng thái', exact: true })
      await statusBtn.click()
      const options = dialog.getByRole('listbox', { name: 'Trạng thái', exact: true })
      await options.getByRole('option', { name: status, exact: true }).click()
      await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
      await expect(dialog).toHaveCount(0)
    }

    await expect(page.locator('.manage-post .badge').first()).toHaveText(status)
    await page.reload()
    await expect(page.locator('.manage-post .badge').first()).toHaveText(status)
    await page.locator('.manage-post-detail').first().click()
    await expect(page.locator('.detail-badges .badge').first()).toHaveText(status)
    await expect(page.getByText('Chờ duyệt', { exact: true })).toHaveCount(0)
  })
}

test('legacy roommate statuses are migrated while valid choices remain unchanged', async ({ page }) => {
  await student(page)
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    const ownerId = JSON.parse(localStorage.getItem('findmyroom:user')).id
    data.posts = ['Chờ duyệt', 'Còn phòng', 'Hết phòng', 'Ẩn', 'complete', 'expired'].map((status, i) => ({
      ...data.posts[0], id: `roommate-status-${i}`, kind: 'roommate', ownerId, status,
    }))
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.reload()
  await page.goto('/#/quan-ly/bai-dang')
  await page.getByRole('button', { name: 'Xem thêm', exact: true }).click()
  await expect(page.locator('.manage-post .badge')).toHaveText(['Còn phòng', 'Còn phòng', 'Hết phòng', 'Ẩn', 'Hết phòng', 'Ẩn'])
})
