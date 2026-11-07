import { test, expect } from '@playwright/test'

test('house management expands and collapses lists longer than three houses', async ({ page }) => {
  await page.goto('/#/dang-nhap?redirect=/quan-ly/nha-tro')
  await page.getByLabel('Email *', { exact: true }).fill('chutro@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quản lý nhà trọ', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Xem thêm', exact: true })).toHaveCount(0)
  const initialCount = await page.locator('.house-row').count()
  for (let i = initialCount; i < 4; i++) {
    await page.getByRole('button', { name: 'Thêm nhà trọ', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill(`Nhà trọ kiểm tra ${i}`)
    await dialog.getByRole('button', { name: /Tiếp theo/ }).click()
    await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('123 đường 3/2, Cần Thơ')
    await dialog.getByRole('button', { name: /Tiếp theo/ }).click()
    await dialog.getByRole('button', { name: /Tạo nhà trọ|Lưu nhà trọ/ }).click()
  }
  await expect(page.locator('.house-row')).toHaveCount(3)
  await page.getByRole('button', { name: 'Xem thêm', exact: true }).click()
  await expect(page.locator('.house-row')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Thu gọn', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Thu gọn', exact: true }).click()
  await expect(page.locator('.house-row')).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Xem thêm', exact: true })).toHaveAttribute('aria-expanded', 'false')
})

test('cannot delete boarding house when it has related rental posts', async ({ page }) => {
  await page.goto('/#/dang-nhap?redirect=/quan-ly/nha-tro')
  await page.getByLabel('Email *', { exact: true }).fill('chutro@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Quản lý nhà trọ', exact: true })).toBeVisible()

  // Click delete on existing house with posts ("Nhà trọ Minh An")
  const deleteBtn = page.getByRole('button', { name: 'Xóa Nhà trọ Minh An' })
  await expect(deleteBtn).toBeVisible()
  await deleteBtn.click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Không thể xóa nhà trọ' })).toBeVisible()
  await expect(dialog).toContainText('đang có')
  await expect(dialog).toContainText('bài đăng liên quan. Bạn cần xóa các bài đăng này trước khi xóa nhà trọ.')
  await expect(dialog.getByRole('button', { name: 'Xác nhận xóa' })).toHaveCount(0)

  // Click Close button
  await dialog.getByRole('button', { name: 'Đóng' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Nhà trọ Minh An')).toBeVisible()

  // Add a new house without posts, and verify it CAN be deleted
  await page.getByRole('button', { name: 'Thêm nhà trọ', exact: true }).first().click()
  const createDialog = page.getByRole('dialog')
  await createDialog.getByLabel('Tên nhà trọ *', { exact: true }).fill('Nhà trọ không có bài đăng')
  await createDialog.getByRole('button', { name: /Tiếp theo/ }).click()
  await createDialog.getByLabel('Địa chỉ *', { exact: true }).fill('999 đường 3/2, Cần Thơ')
  await createDialog.getByRole('button', { name: /Tiếp theo/ }).click()
  await createDialog.getByRole('button', { name: /Tạo nhà trọ|Lưu nhà trọ/ }).click()

  // Find and delete the new house
  const newHouseDeleteBtn = page.getByRole('button', { name: 'Xóa Nhà trọ không có bài đăng' })
  await newHouseDeleteBtn.click()

  const confirmDialog = page.getByRole('dialog')
  await expect(confirmDialog.getByRole('heading', { name: 'Xác nhận xóa' })).toBeVisible()
  await confirmDialog.getByRole('button', { name: 'Xác nhận xóa' }).click()

  await expect(page.getByRole('status')).toContainText('Đã xóa và cập nhật danh sách.')
  await expect(page.getByText('Nhà trọ không có bài đăng')).toHaveCount(0)
})
