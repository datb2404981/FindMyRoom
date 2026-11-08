import { test, expect } from '@playwright/test'

async function register(page, role) {
  const response = await page.request.post('/api/auth/register', { data: {
    name: 'Shared House Test', email: `shared-house-${role}-${Date.now()}@example.com`,
    phone: '0987654321', password: 'testpass123', role, terms: true,
  } })
  expect(response.status()).toBe(201)
}

test('student selects houses created by a landlord in a separate browser session', async ({ page, browser }) => {
  await register(page, 'landlord')
  await page.goto('/#/quan-ly/nha-tro')
  await page.getByRole('button', { name: 'Thêm nhà trọ', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  const name = `Nhà trọ dùng chung ${Date.now()}`
  await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill(name)
  await dialog.getByRole('button', { name: /Tiếp theo/ }).click()
  await dialog.getByRole('button', { name: 'Phường/Xã *', exact: true }).click()
  await dialog.getByRole('option', { name: 'Phường Ninh Kiều', exact: true }).click()
  await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('123 đường dùng chung')
  await dialog.getByRole('button', { name: /Tiếp theo/ }).click()
  await dialog.getByRole('button', { name: 'Tạo nhà trọ', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const shared = (await (await page.request.get('/api/boarding-houses')).json()).houses.find(house => house.name === name)
  expect(shared).toBeTruthy()
  const studentContext = await browser.newContext()
  try {
    const student = await studentContext.newPage()
    await register(student, 'student')
    await student.goto('/#/dang-bai/roommate')
    await student.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Ghép trọ cùng nhà trọ đã tạo')
    await student.getByLabel('Ngày có thể chuyển vào *', { exact: true }).fill('2027-12-10')
    for (const input of await student.getByRole('spinbutton').all()) await input.fill('100')
    await student.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    const input = student.locator('#post-house-input')
    await input.fill(name)
    await student.getByRole('option').filter({ hasText: name }).click()
    await expect(student.locator('.selected-house-card')).toContainText(name)
    await expect(student.getByLabel('Tên đường / số nhà *')).toHaveValue('123 đường dùng chung')
    await student.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64')
    await student.getByLabel('Tải hình ảnh chỗ ở').setInputFiles([1, 2, 3, 4].map(i => ({ name: `room${i}.png`, mimeType: 'image/png', buffer: png })))
    await student.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await student.getByRole('button', { name: 'Đăng bài', exact: true }).click()
    await expect(student.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()
    await student.getByRole('link', { name: 'Quản lý bài đăng', exact: true }).last().click()
    await student.locator('.manage-post-detail').first().click()
    await expect(student.locator('.house-detail-card')).toContainText(name)
    const savedPost = await student.evaluate(() => {
      const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
      return JSON.parse(localStorage.getItem(key)).posts.find(post => post.kind === 'roommate')
    })
    expect(savedPost.houseId).toBe(shared.id)
    // A landlord's later changes are read from the shared source, not the student's cache.
    await page.getByRole('button', { name: `Chỉnh sửa ${name}`, exact: true }).click()
    await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill(name + ' đã sửa')
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await student.goto('/#/dang-bai/roommate')
    await student.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Bài đăng khác')
    await student.getByLabel('Ngày có thể chuyển vào *', { exact: true }).fill('2027-12-10')
    for (const field of await student.getByRole('spinbutton').all()) await field.fill('100')
    await student.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await student.locator('#post-house-input').fill(name)
    await expect(student.getByRole('option').filter({ hasText: name + ' đã sửa' })).toBeVisible()
  } finally { await studentContext.close() }
})

test('previously local user-created houses are shared when their landlord returns', async ({ page }) => {
  await register(page, 'landlord')
  await page.goto('/#/quan-ly/nha-tro')
  await expect(page.getByRole('heading', { name: 'Quản lý nhà trọ', exact: true })).toBeVisible()
  const id = `house-local-${Date.now()}`
  await page.evaluate(id => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    data.houses.push({ id, name: 'Nhà trọ cũ tự tạo', address: '456 đường cũ, Cần Thơ', rooms: 2, status: 'Đang hoạt động' })
    localStorage.setItem(key, JSON.stringify(data))
  }, id)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Quản lý nhà trọ', exact: true })).toBeVisible()
  const owner = (await (await page.request.get('/api/auth/session')).json()).user
  const houses = (await (await page.request.get('/api/boarding-houses')).json()).houses
  expect(houses.find(house => house.id === id)?.ownerId).toBe(owner.id)
  expect(houses.some(house => house.name === 'Nhà trọ Bình Minh')).toBe(false)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Quản lý nhà trọ', exact: true })).toBeVisible()
  expect((await (await page.request.get('/api/boarding-houses')).json()).houses.filter(house => house.id === id)).toHaveLength(1)
})
