import { test, expect } from '@playwright/test'

for (const width of [1366, 390]) {
  test(`roommate editing uses a modal and persists all tabs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    const response = await page.request.post('/api/auth/register', { data: {
      name: 'Roommate Editor Test', email: `roommate-editor-${width}-${Date.now()}@example.com`,
      phone: '0987654321', password: 'testpass123', role: 'student', terms: true,
    } })
    expect(response.status()).toBe(201)
    await page.goto('/#/dang-bai/roommate')
    await expect(page.getByLabel('Tiêu đề bài đăng *', { exact: true })).toBeVisible()
    await page.evaluate(width => {
      const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
      const data = JSON.parse(localStorage.getItem(key))
      data.posts = [{ ...data.posts[0], id: `roommate-edit-test-${width}-${Date.now()}`, ownerId: JSON.parse(localStorage.getItem('findmyroom:user')).id,
        kind: 'roommate', title: 'Bài ghép trọ ban đầu', status: 'Còn phòng', houseId: '',
        price: 1800000, perPerson: 900000, people: 1, area: 25, gender: 'Tất cả',
        school: 'Đại học Cần Thơ', moveIn: '2027-12-10', habits: 'Giữ vệ sinh chung',
      }]
      localStorage.setItem(key, JSON.stringify(data))
    }, width)
    await page.reload()
    await page.goto('/#/quan-ly/bai-dang')
    const edit = page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true })
    await edit.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page).toHaveURL(/quan-ly\/bai-dang$/)
    await expect(dialog.getByText('Chỉnh sửa bài ghép trọ', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Dự kiến giá/người (đ) *', { exact: true })).toHaveValue('900000')
    await expect(dialog.getByLabel('Ngày có thể chuyển vào *', { exact: true })).toHaveValue('2027-12-10')
    await expect(dialog.getByRole('button', { name: 'Chọn nhà trọ *', exact: true })).toHaveCount(0)
    await expect(dialog.getByRole('button', { name: 'Nhà trọ', exact: true })).toBeHidden()
    await expect(dialog.getByLabel('Địa chỉ *', { exact: true })).toBeHidden()
    await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Chưa lưu')
    await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
    await expect(page.locator('.manage-post h3')).toHaveText('Bài ghép trọ ban đầu')
    await edit.click()
    await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('')
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    await expect(dialog.getByLabel('Tiêu đề bài đăng *', { exact: true })).toBeFocused()
    await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Bài ghép trọ đã sửa')
    await dialog.getByLabel('Tiền trọ (đ) *', { exact: true }).fill('2400000')
    await dialog.getByLabel('Dự kiến giá/người (đ) *', { exact: true }).fill('1200000')
    await dialog.getByLabel('Ngày có thể chuyển vào *', { exact: true }).fill('2027-12-22')
    await dialog.getByLabel('Thói quen sống / lưu ý khác', { exact: true }).fill('Tôn trọng giờ nghỉ')
    for (const [label, value] of [['Trạng thái', 'Ẩn'], ['Đối tượng (nam/nữ) *', 'Nữ']]) {
      await dialog.getByRole('button', { name: label, exact: true }).click()
      await dialog.getByRole('listbox', { name: label, exact: true }).getByRole('option', { name: value, exact: true }).click()
    }
    await dialog.getByRole('button', { name: 'Địa chỉ', exact: true }).click()
    await expect(dialog.locator('#rental-edit-title')).toHaveText('Địa chỉ')
    await expect(dialog.getByRole('button', { name: 'Nhà trọ', exact: true })).toBeVisible()
    await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('')
    await dialog.getByRole('button', { name: 'Thông tin chung', exact: true }).click()
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    await expect(dialog.locator('#rental-edit-title')).toHaveText('Địa chỉ')
    await expect(dialog.getByLabel('Địa chỉ *', { exact: true })).toBeFocused()
    await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('456 đường 3/2, Ninh Kiều, Cần Thơ')
    await dialog.getByRole('button', { name: 'Hình ảnh', exact: true }).click()
    const count = await dialog.locator('.editor-photos figure').count()
    await dialog.getByLabel('Thêm ảnh bài đăng', { exact: true }).setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64') })
    await expect(dialog.locator('.editor-photos figure')).toHaveCount(count + 1)
    await dialog.getByRole('button', { name: 'Đặt làm ảnh bìa', exact: true }).last().click()
    await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
    await dialog.getByLabel('Camera 24/7', { exact: true }).check()
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath('roommate-modal.png'), fullPage: true })
    await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.manage-post .badge')).toHaveText('Ẩn')
    await expect(page.locator('.manage-post img')).toHaveAttribute('src', /^data:image\/png/)
    await edit.click()
    await expect(dialog.getByLabel('Tiêu đề bài đăng *', { exact: true })).toHaveValue('Bài ghép trọ đã sửa')
    await expect(dialog.getByLabel('Dự kiến giá/người (đ) *', { exact: true })).toHaveValue('1200000')
    await expect(dialog.getByLabel('Ngày có thể chuyển vào *', { exact: true })).toHaveValue('2027-12-22')
    await expect(dialog.getByLabel('Thói quen sống / lưu ý khác', { exact: true })).toHaveValue('Tôn trọng giờ nghỉ')
    await expect(dialog.getByRole('button', { name: 'Đối tượng (nam/nữ) *', exact: true })).toHaveText('Nữ')
    await dialog.getByRole('button', { name: 'Địa chỉ', exact: true }).click()
    await expect(dialog.getByLabel('Địa chỉ *', { exact: true })).toHaveValue('456 đường 3/2, Ninh Kiều, Cần Thơ')
    await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
    await expect(dialog.getByLabel('Camera 24/7', { exact: true })).toBeChecked()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(edit).toBeFocused()
  })
}

test('rental editing moves house and address selection into Địa chỉ tab', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 })
  const response = await page.request.post('/api/auth/register', { data: {
    name: 'Rental Address Tab Test', email: `rental-address-tab-${Date.now()}@example.com`,
    phone: '0987654321', password: 'testpass123', role: 'landlord', terms: true,
  } })
  expect(response.status()).toBe(201)
  const houseRes = await page.request.put(`/api/boarding-houses/rental-addr-house-${Date.now()}`, { data: {
    name: 'Nhà trọ Địa Chỉ Mới', address: '99 Trần Hưng Đạo, Ninh Kiều, Cần Thơ', street: '99 Trần Hưng Đạo', ward: 'Ninh Kiều', city: 'Cần Thơ',
    rooms: 3, desc: 'Nhà trọ kiểm thử tab địa chỉ.', images: ['/illustrations/room-1.svg'],
  } })
  expect(houseRes.ok()).toBeTruthy()
  const { house } = await houseRes.json()
  await page.goto('/#/quan-ly/bai-dang')
  await expect(page.getByRole('heading', { name: 'Bài đăng cho thuê', exact: true })).toBeVisible()
  await page.evaluate(houseId => {
    const key = Object.keys(localStorage).find(k => k.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    const ownerId = JSON.parse(localStorage.getItem('findmyroom:user')).id
    data.posts = [{ ...data.posts[0], id: `rental-addr-post-${Date.now()}`, ownerId, kind: 'rental', houseId: '', house: '', address: '', count: 2 }]
    localStorage.setItem(key, JSON.stringify(data))
  }, house.id)
  await page.reload()
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: 'Chọn nhà trọ *', exact: true })).toBeHidden()
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog.locator('#rental-edit-title')).toHaveText('Địa chỉ')
  await expect(dialog.getByRole('button', { name: 'Chọn nhà trọ *', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Chọn nhà trọ *', exact: true }).click()
  await dialog.getByRole('listbox', { name: 'Chọn nhà trọ *', exact: true }).getByRole('option', { name: 'Nhà trọ Địa Chỉ Mới', exact: true }).click()
  await expect(dialog.getByLabel('Địa chỉ', { exact: true })).toHaveValue('99 Trần Hưng Đạo, Ninh Kiều, Cần Thơ')
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})
