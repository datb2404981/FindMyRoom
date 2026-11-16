import { test, expect } from '@playwright/test'

test('student stays logged in on Ghép trọ and newly created roommate post appears immediately on Bắt đầu ghép trọ', async ({ page }) => {
  const uniqueTitle = `Tìm bạn ghép trọ Ô Môn ${Date.now()}`
  const response = await page.request.post('/api/auth/register', {
    data: {
      name: 'Sinh Viên Ghép Trọ',
      email: `match-live-${Date.now()}@example.com`,
      phone: '0987654321',
      password: 'testpass123',
      role: 'student',
      terms: true,
    },
  })
  expect(response.status()).toBe(201)

  await page.goto('/#/dang-bai/roommate')
  await expect(page.getByLabel('Tiêu đề bài đăng *', { exact: true })).toBeVisible()
  await page.evaluate((title) => {
    const key = Object.keys(localStorage).find(k => k.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    data.drafts.roommate = {
      title,
      school: 'Trường Đại học Tây Đô',
      gender: 'Tất cả',
      people: 1,
      area: 25,
      price: 2000000,
      perPerson: 1000000,
      electric: 3500,
      water: 18000,
      moveIn: '2027-12-10',
      ward: 'Ô Môn',
      street: '456 QL91',
    }
    localStorage.setItem(key, JSON.stringify(data))
  }, uniqueTitle)

  await page.reload()
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64')
  await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles(
    [1, 2, 3, 4].map(i => ({ name: `room${i}.png`, mimeType: 'image/png', buffer: png })),
  )
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByRole('button', { name: 'Đăng bài', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()

  await page.locator('header').getByRole('link', { name: 'Ghép trọ', exact: true }).click()
  await expect(page).toHaveURL(/#\/ghep-tro/)
  await expect(page.locator('header').getByRole('button', { name: /Sinh Viên Ghép Trọ/ })).toBeVisible()

  const filters = page.getByRole('complementary', { name: 'Bộ lọc ghép trọ', exact: true })
  await filters.getByRole('button', { name: 'Theo khu vực', exact: true }).click()
  await filters.getByRole('group', { name: 'Danh sách khu vực', exact: true }).getByRole('button', { name: 'Ô Môn', exact: true }).click()
  await filters.getByRole('button', { name: 'Bắt đầu ghép trọ', exact: true }).click()

  await expect(page.locator('.person-card')).toContainText(uniqueTitle)
  await expect(page.locator('.person-card')).toContainText('Ô Môn, Cần Thơ')

  await page.getByRole('button', { name: 'Xem trang chi tiết bài đăng ghép trọ này', exact: true }).click()
  await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible()
})
