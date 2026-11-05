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
    await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('123 đường 3/2, Cần Thơ')
    await dialog.getByRole('button', { name: 'Lưu nhà trọ', exact: true }).click()
  }
  await expect(page.locator('.house-row')).toHaveCount(3)
  await page.getByRole('button', { name: 'Xem thêm', exact: true }).click()
  await expect(page.locator('.house-row')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Thu gọn', exact: true })).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('button', { name: 'Thu gọn', exact: true }).click()
  await expect(page.locator('.house-row')).toHaveCount(3)
  await expect(page.getByRole('button', { name: 'Xem thêm', exact: true })).toHaveAttribute('aria-expanded', 'false')
})
