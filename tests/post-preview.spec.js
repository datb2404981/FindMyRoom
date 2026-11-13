import { test, expect } from '@playwright/test'

async function register(page, role) {
  const response = await page.request.post('/api/auth/register', {
    data: {
      name: role === 'landlord' ? 'Chủ trọ Kiểm Thử' : 'Sinh viên Kiểm Thử',
      email: `preview-${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
      phone: '0987654321',
      password: 'testpass123',
      role,
      terms: true,
    },
  })
  expect(response.status()).toBe(201)
}

test('landlord rental post uses 4 steps and step-4 Xem trước button opens preview modal', async ({ page }) => {
  await register(page, 'landlord')
  const created = await page.request.put(`/api/boarding-houses/preview-house-${Date.now()}`, {
    data: {
      name: 'Nhà trọ Bình An',
      address: '88 đường 3/2, Ninh Kiều, Cần Thơ',
      street: '88 đường 3/2',
      ward: 'Ninh Kiều',
      city: 'Cần Thơ',
      rooms: 5,
      desc: 'Nhà trọ sạch sẽ gần đại học.',
      images: ['/illustrations/room-1.svg'],
    },
  })
  expect(created.ok()).toBeTruthy()
  const { house } = await created.json()

  await page.goto('/#/dang-bai/rental')
  await expect(page.locator('.stepper li')).toHaveCount(4)
  await expect(page.locator('.stepper')).not.toContainText('Xem trước')

  await page.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Phòng mới có gác gần ĐH Cần Thơ')
  await page.getByLabel('Chọn nhà trọ *', { exact: true }).selectOption(house.id)
  for (const input of await page.locator('input[role="spinbutton"], input[type="number"]:not(.money-stepper)').all()) await input.fill('1500')
  await page.getByLabel('Giờ giấc', { exact: true }).fill('22:30')
  await page.getByLabel('Số lượng phòng *', { exact: true }).fill('2')
  await page.getByLabel('Diện tích (m²) *', { exact: true }).fill('24')
  await page.getByLabel('Số người tối đa *', { exact: true }).fill('2')
  await page.getByLabel('Mô tả chi tiết', { exact: true }).fill('Phòng rộng rãi, giờ giấc tự do.')
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=',
    'base64',
  )
  await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles(
    [1, 2, 3, 4].map((i) => ({ name: `room${i}.png`, mimeType: 'image/png', buffer: png })),
  )
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  await page.getByLabel('Wifi tốc độ cao', { exact: true }).check()
  const previewBtn = page.getByRole('button', { name: 'Xem trước', exact: true })
  await expect(previewBtn).toBeVisible()
  await previewBtn.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Xem trước bài đăng', exact: true })).toBeVisible()
  await expect(dialog).toContainText('Phòng mới có gác gần ĐH Cần Thơ')
  await expect(dialog).toContainText('Nhà trọ Bình An')
  await expect(dialog).toContainText('Wifi tốc độ cao')

  // Thumbnail switching works inside preview modal
  await dialog.getByRole('button', { name: 'Xem ảnh 2', exact: true }).click()
  await expect(dialog).toContainText('2 / 4 ảnh')

  // Editing returns cleanly to step 4
  await dialog.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await expect(dialog).toHaveCount(0)

  // Re-open preview and publish from modal
  await previewBtn.click()
  await expect(dialog).toBeVisible()
  const saved = page.waitForResponse(response => response.url().includes('/api/rentals/') && response.request().method() === 'PUT')
  await dialog.getByRole('button', { name: 'Đăng bài', exact: true }).click()
  expect((await (await saved).json()).post.curfew).toBe('22:30')
  await expect(page.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()
})

test('preview modal fits mobile viewport without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await register(page, 'landlord')
  const created = await page.request.put(`/api/boarding-houses/mobile-house-${Date.now()}`, {
    data: {
      name: 'Nhà trọ Mobile Test',
      address: '12 đường 30/4, Ninh Kiều, Cần Thơ',
      street: '12 đường 30/4',
      ward: 'Ninh Kiều',
      city: 'Cần Thơ',
      rooms: 3,
      images: ['/illustrations/room-1.svg'],
    },
  })
  const { house } = await created.json()

  await page.goto('/#/dang-bai/rental')
  await page.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Phòng mobile responsive')
  await page.getByLabel('Chọn nhà trọ *', { exact: true }).selectOption(house.id)
  for (const input of await page.getByRole('spinbutton').all()) await input.fill('1000000')
  await page.getByLabel('Diện tích (m²) *', { exact: true }).fill('20')
  await page.getByLabel('Số người tối đa *', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=',
    'base64',
  )
  await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles(
    [1, 2, 3, 4].map((i) => ({ name: `room${i}.png`, mimeType: 'image/png', buffer: png })),
  )
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
})

test('student roommate post keeps 4 steps and opens upgraded preview modal', async ({ page }) => {
  await register(page, 'student')
  await page.goto('/#/dang-bai/roommate')
  await expect(page.locator('.stepper li')).toHaveCount(4)

  await page.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Tìm bạn nữ ở ghép gần ĐHCT')
  await page.getByLabel('Ngày có thể chuyển vào *', { exact: true }).fill('2027-12-10')
  for (const input of await page.getByRole('spinbutton').all()) await input.fill('900000')
  await page.getByLabel('Số người cần tìm *', { exact: true }).fill('1')
  await page.getByLabel('Diện tích (m²) *', { exact: true }).fill('22')
  await page.getByLabel('Mô tả chi tiết', { exact: true }).fill('Phòng sạch sẽ, yên tĩnh học tập.')
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  await page.getByRole('button', { name: 'Phường / Xã', exact: true }).click()
  await page.getByRole('listbox', { name: 'Phường / Xã', exact: true }).getByRole('option', { name: 'Phường Ninh Kiều', exact: true }).click()
  await page.getByLabel('Tên đường / số nhà *').fill('45 đường 3/2')
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=',
    'base64',
  )
  await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles(
    [1, 2, 3, 4].map((i) => ({ name: `room${i}.png`, mimeType: 'image/png', buffer: png })),
  )
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()

  await page.getByLabel('Camera 24/7', { exact: true }).check()
  await page.getByRole('button', { name: 'Xem trước', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Xem trước bài ghép trọ', exact: true })).toBeVisible()
  await expect(dialog).toContainText('Tìm bạn nữ ở ghép gần ĐHCT')
  await expect(dialog).toContainText('Camera 24/7')
  await dialog.getByRole('button', { name: 'Đăng bài', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()
})

