import { test, expect } from '@playwright/test'

async function openManagement(page) {
  await page.goto('/#/dang-nhap?redirect=/quan-ly/bai-dang')
  await page.getByLabel('Email *', { exact: true }).fill('chutro@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).toHaveURL(/quan-ly\/bai-dang/)
  await expect(page.locator('.manage-post').first()).toBeVisible()
}

test('rental edit opens a modal and cancel discards changes without navigating', async ({ page }) => {
  await openManagement(page)
  const card = page.locator('.manage-post').nth(1)
  const originalTitle = await card.locator('h3').innerText()
  const edit = card.getByRole('button', { name: 'Chỉnh sửa', exact: true })
  await edit.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page).toHaveURL(/quan-ly\/bai-dang/)
  await expect(dialog.getByLabel('Tiêu đề bài đăng *', { exact: true })).toHaveValue(originalTitle)
  await expect(dialog.getByLabel('Chọn nhà trọ *', { exact: true })).toHaveValue('an-binh')
  await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Thay đổi chưa lưu')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(edit).toBeFocused()
  await expect(card.locator('h3')).toHaveText(originalTitle)
  await edit.click()
  await expect(dialog.getByLabel('Tiêu đề bài đăng *', { exact: true })).toHaveValue(originalTitle)
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(dialog).toHaveCount(0)
})

test('rental modal validates and persists fields, photos and amenities on desktop and mobile', async ({ page }) => {
  await openManagement(page)
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`rental-edit-${width}.png`), fullPage: true })
  }
  await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('')
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog.getByLabel('Tiêu đề bài đăng *', { exact: true })).toBeFocused()
  await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Phòng cập nhật bằng pop-up')
  await dialog.getByLabel('Giá thuê (đ/tháng) *', { exact: true }).fill('2100000')
  await dialog.getByLabel('Diện tích (m²) *', { exact: true }).fill('25.5')
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog.getByText('Vui lòng nhập số nguyên.', { exact: true })).toBeVisible()
  await dialog.getByLabel('Diện tích (m²) *', { exact: true }).fill('25')
  await dialog.getByLabel('Chi phí khác', { exact: true }).fill('Giữ xe 50.000; rác 20.000')
  await dialog.getByLabel('Trạng thái', { exact: true }).selectOption('Ẩn')
  await dialog.getByRole('button', { name: 'Hình ảnh', exact: true }).click()
  const count = await dialog.locator('.editor-photos figure').count()
  expect(count).toBeGreaterThan(0)
  await dialog.getByLabel('Thêm ảnh bài đăng', { exact: true }).setInputFiles({ name: 'room.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64') })
  await expect(dialog.locator('.editor-photos figure')).toHaveCount(count + 1)
  await dialog.getByRole('button', { name: 'Đặt làm ảnh bìa', exact: true }).last().click()
  await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
  await dialog.getByLabel('Camera 24/7', { exact: true }).uncheck()
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.manage-post').first()).toContainText('Phòng cập nhật bằng pop-up')
  await page.reload()
  const card = page.locator('.manage-post').first()
  await expect(card.locator('img')).toHaveAttribute('src', /^data:image\/png/)
  await card.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await expect(dialog.getByLabel('Giá thuê (đ/tháng) *', { exact: true })).toHaveValue('2100000')
  await expect(dialog.getByLabel('Chi phí khác', { exact: true })).toHaveValue('Giữ xe 50.000; rác 20.000')
  await expect(dialog.getByLabel('Trạng thái', { exact: true })).toHaveValue('Ẩn')
  await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
  await expect(dialog.getByLabel('Camera 24/7', { exact: true })).not.toBeChecked()
  await dialog.getByRole('button', { name: 'Đóng chỉnh sửa bài đăng', exact: true }).click()
  expect(await page.locator('body').evaluate(el => el.style.overflow)).not.toBe('hidden')
})

test('failed storage leaves the modal open and the existing post unchanged', async ({ page }) => {
  await openManagement(page)
  const card = page.locator('.manage-post').first()
  const originalTitle = await card.locator('h3').innerText()
  await card.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Chưa thể lưu')
  await page.evaluate(() => {
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('findmyroom-demo-v1:')) throw new DOMException('Full storage', 'QuotaExceededError')
      return original.call(this, key, value)
    }
  })
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Không đủ bộ nhớ')
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(card.locator('h3')).toHaveText(originalTitle)
})

test('editing offers exactly three statuses even for a legacy pending post', async ({ page }) => {
  await openManagement(page)
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    data.posts[0].status = 'Chờ duyệt'
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.reload()
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const status = dialog.getByLabel('Trạng thái', { exact: true })
  await expect(status.locator('option')).toHaveText(['Còn phòng', 'Hết phòng', 'Ẩn'])
  await expect(status).toHaveValue('Ẩn')
  await status.selectOption('Hết phòng')
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await page.reload()
  await expect(page.locator('.manage-post').first().locator('.badge')).toHaveText('Hết phòng')
})

test('image editor switches between empty drop zone and square gallery with working drag and drop', async ({ page }) => {
  await openManagement(page)
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Hình ảnh', exact: true }).click()
  while (await dialog.locator('.photo-remove').count()) await dialog.locator('.photo-remove').first().click()
  await expect(dialog.locator('.editor-upload')).toHaveClass(/is-empty/)
  await page.screenshot({ path: test.info().outputPath('images-empty.png'), fullPage: true })
  const files = await page.evaluateHandle(() => {
    const transfer = new DataTransfer()
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII='), c => c.charCodeAt(0))
    for (let i = 0; i < 4; i++) transfer.items.add(new File([bytes], `room${i}.png`, { type: 'image/png' }))
    return transfer
  })
  const input = dialog.getByLabel('Thêm ảnh bài đăng', { exact: true })
  await input.dispatchEvent('dragenter', { dataTransfer: files })
  await input.dispatchEvent('dragover', { dataTransfer: files })
  await expect(dialog.locator('.editor-upload')).toHaveClass(/dragging/)
  await input.dispatchEvent('drop', { dataTransfer: files })
  await expect(dialog.locator('.editor-photos figure')).toHaveCount(4)
  await expect(dialog.locator('.editor-upload')).not.toHaveClass(/is-empty|dragging/)
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 900 })
    const photo = await dialog.locator('.editor-photos figure').first().boundingBox()
    expect(Math.abs(photo.width - photo.height)).toBeLessThan(2)
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`images-gallery-${width}.png`), fullPage: true })
  }
  await input.dispatchEvent('drop', { dataTransfer: files })
  await expect(dialog.locator('.editor-photos figure')).toHaveCount(8)
  await input.setInputFiles({ name: 'picked.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64') })
  await expect(dialog.locator('.editor-photos figure')).toHaveCount(9)
  await input.dispatchEvent('drop', { dataTransfer: files })
  await expect(dialog.locator('.editor-photos figure')).toHaveCount(10)
  await expect(dialog.getByRole('alert')).toContainText('tối đa 10 ảnh')
  await expect(input).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
})

test('legacy sample posts recover missing fields without overwriting saved changes or zero values', async ({ page }) => {
  await openManagement(page)
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    const post = data.posts[2]
    delete post.houseId
    delete post.count
    delete post.internet
    post.title = 'Tiêu đề đã chỉnh từ trước'
    post.price = 2450000
    post.curfew = '22:30:00'
    data.posts[0].internet = 0
    data.posts[0].count = 0
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.reload()
  await page.locator('.manage-post').nth(2).getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Chọn nhà trọ *', { exact: true })).toHaveValue('hung-phu')
  await expect(dialog.getByLabel('Số phòng còn lại *', { exact: true })).toHaveValue('1')
  await expect(dialog.getByLabel('Tiền internet (đ/tháng)', { exact: true })).toHaveValue('100000')
  await expect(dialog.getByLabel('Tiêu đề bài đăng *', { exact: true })).toHaveValue('Tiêu đề đã chỉnh từ trước')
  await expect(dialog.getByLabel('Giá thuê (đ/tháng) *', { exact: true })).toHaveValue('2450000')
  await expect(dialog.locator('input[type=time]')).toHaveValue('22:30:00')
  await dialog.getByRole('button', { name: 'Hủy', exact: true }).click()
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await expect(dialog.getByLabel('Tiền internet (đ/tháng)', { exact: true })).toHaveValue('0')
  await expect(dialog.getByLabel('Số phòng còn lại *', { exact: true })).toHaveValue('0')
})

test('new rental retains all entered information and uploaded photos when reopened after reload', async ({ page }) => {
  await openManagement(page)
  await page.goto('/#/dang-bai/rental')
  await page.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Phòng giữ nguyên dữ liệu')
  await page.getByLabel('Chọn nhà trọ *', { exact: true }).selectOption('minh-an')
  const values = [
    ['Số lượng phòng *', '7'], ['Tiền cọc (đ)', '600000'], ['Giá thuê (đ/tháng) *', '2850000'],
    ['Diện tích (m²) *', '32'], ['Giá điện (đ/kWh) *', '3500'], ['Giá nước (đ/m³) *', '16000'],
    ['Tiền wifi (đ/tháng)', '95000'], ['Số người tối đa *', '4'], ['Chi phí khác', 'Rác 20.000; giữ xe 50.000'],
    ['Mô tả chi tiết', 'Phòng có cửa sổ và nhà vệ sinh riêng.'],
  ]
  for (const [label, value] of values) await page.getByLabel(label, { exact: true }).fill(value)
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByLabel('Phường / Xã *').selectOption('Xuân Khánh')
  await page.getByLabel('Tên đường / số nhà *').fill('123 đường 3/2')
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64')
  await page.getByLabel('Tải hình ảnh chỗ ở').setInputFiles([1, 2, 3].map(i => ({ name: `photo${i}.png`, mimeType: 'image/png', buffer: png })))
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByLabel('Camera 24/7', { exact: true }).check()
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await page.getByRole('button', { name: 'Đăng bài', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bài đăng đã được lưu', exact: true })).toBeVisible()
  await page.goto('/#/quan-ly/bai-dang')
  await page.reload()
  await page.locator('.manage-post').first().getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Chọn nhà trọ *', { exact: true })).toHaveValue('minh-an')
  await expect(dialog.getByLabel('Số phòng còn lại *', { exact: true })).toHaveValue('7')
  await expect(dialog.getByLabel('Tiền internet (đ/tháng)', { exact: true })).toHaveValue('95000')
  for (const [label, value] of values.filter(([label]) => !['Số lượng phòng *', 'Tiền wifi (đ/tháng)', 'Mô tả chi tiết'].includes(label))) {
    await expect(dialog.getByLabel(label, { exact: true })).toHaveValue(value)
  }
  await expect(dialog.getByLabel('Mô tả chi tiết phòng', { exact: true })).toHaveValue(values.at(-1)[1])
  await dialog.getByRole('button', { name: 'Hình ảnh', exact: true }).click()
  await expect(dialog.locator('.editor-photos figure')).toHaveCount(3)
  for (const image of await dialog.locator('.editor-photos img').all()) await expect(image).toHaveAttribute('src', /^data:image\/png/)
  await dialog.getByRole('button', { name: 'Tiện ích', exact: true }).click()
  await expect(dialog.getByLabel('Camera 24/7', { exact: true })).toBeChecked()
})
