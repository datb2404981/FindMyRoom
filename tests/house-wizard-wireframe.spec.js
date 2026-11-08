import { test, expect } from '@playwright/test'

test.describe('Boarding House Creation and Edit Multi-Step Wizard (HH-21, HH-37, HH-38, HH-39, HH-34, HH-36)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/dang-nhap?redirect=/quan-ly/nha-tro')
    await page.getByLabel('Email *', { exact: true }).fill('chutro@example.com')
    await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
    await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Quản lý nhà trọ', exact: true })).toBeVisible()
  })

  test('desktop wizard displays stepper and matches wireframes 1-4', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'Thêm nhà trọ', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // 1. Title & Stepper Header (HH-21)
    await expect(dialog.getByRole('heading', { name: 'Tạo nhà trọ', exact: true })).toBeVisible()
    const stepper = dialog.locator('.house-stepper')
    await expect(stepper).toBeVisible()
    await expect(stepper.getByText('Thông tin chung')).toBeVisible()
    await expect(stepper.getByText('Vị trí và tiện ích')).toBeVisible()
    await expect(stepper.getByText('Hình ảnh')).toBeVisible()

    // Step 1 Active
    await expect(stepper.locator('.stepper-item').first()).toHaveClass(/active/)

    // Step 1 Fields (HH-21)
    await expect(dialog.getByLabel('Tên nhà trọ *', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Mô tả *', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Nội quy chung *', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: /Tiếp theo/i })).toBeVisible()

    // Validation on Step 1: Empty name prevents proceeding
    await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill('')
    await dialog.locator('.wizard-step-pane:visible').getByRole('button', { name: /Tiếp theo/i }).click()
    await expect(dialog.getByText('Vui lòng nhập tên nhà trọ.')).toBeVisible()

    // Fill valid Step 1
    await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill('Nhà trọ Hoa Sen')
    await dialog.getByLabel('Mô tả *', { exact: true }).fill('Khu trọ an ninh, có camera, giờ giấc tự do.')
    await dialog.getByLabel('Nội quy chung *', { exact: true }).fill('Không tụ tập ồn ào sau 23h.')
    await dialog.locator('.wizard-step-pane:visible').getByRole('button', { name: /Tiếp theo/i }).click()

    // 2. Step 2: Vị trí và tiện ích (HH-37)
    await expect(stepper.locator('.stepper-item').nth(1)).toHaveClass(/active/)
    await expect(dialog.getByRole('heading', { name: 'Địa chỉ', exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Tỉnh/Thành phố *', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Phường/Xã *', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Địa chỉ *', { exact: true })).toBeVisible()
    await expect(dialog.getByLabel('Địa điểm gần đó', { exact: true })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Vị trí hiện tại' })).toBeVisible()

    // Navigation back & forth
    await dialog.locator('.wizard-step-pane:visible').getByRole('button', { name: 'Trước' }).click()
    await expect(dialog.getByLabel('Tên nhà trọ *', { exact: true })).toHaveValue('Nhà trọ Hoa Sen')
    await dialog.locator('.wizard-step-pane:visible').getByRole('button', { name: /Tiếp theo/i }).click()

    // Fill Step 2
    await dialog.getByLabel('Phường/Xã *', { exact: true }).click()
    await dialog.getByRole('listbox', { name: 'Phường/Xã *' }).getByRole('option', { name: 'Phường Ninh Kiều' }).click()
    await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('456 đường 30/4')
    await dialog.locator('.wizard-step-pane:visible').getByRole('button', { name: /Tiếp theo/i }).click()

    // 3. Step 3: Hình ảnh (HH-38)
    await expect(stepper.locator('.stepper-item').nth(2)).toHaveClass(/active/)
    const dropzone = dialog.locator('.upload-dropzone')
    await expect(dropzone).toBeVisible()
    await expect(dropzone).toContainText('Nhấp duyệt file ảnh chi tiết từ máy')
    await expect(dropzone).toContainText('Tối đa 5MB')

    // Upload an image (HH-39)
    const fileInput = dialog.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'house-photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=', 'base64'),
    })

    // Expect preview thumbnail with delete button (HH-39)
    await expect(dialog.locator('.thumbnail-card')).toHaveCount(1)
    await expect(dialog.locator('.thumb-delete-btn')).toBeVisible()

    // Submit creation
    await dialog.getByRole('button', { name: /Tạo nhà trọ/i }).click()

    // Expect modal to close and success toast
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('Tạo nhà trọ thành công.')

    // Verify new house in list
    await expect(page.getByRole('link', { name: 'Nhà trọ Hoa Sen', exact: true })).toBeVisible()
  })

  test('mobile responsive tabs and edit flow (HH-34, HH-36, HH-35)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    // Open modal
    await page.getByRole('button', { name: 'Thêm nhà trọ', exact: true }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Tabs in mobile view (HH-34)
    const tabsBar = dialog.locator('.mobile-tabs-bar')
    await expect(tabsBar).toBeVisible()
    await expect(tabsBar.getByRole('tab', { name: 'Thông tin chi tiết' })).toBeVisible()
    await expect(tabsBar.getByRole('tab', { name: 'Địa chỉ' })).toBeVisible()
    await expect(tabsBar.getByRole('tab', { name: 'Hình ảnh' })).toBeVisible()

    // Clicking tabs directly switches steps
    await tabsBar.getByRole('tab', { name: 'Địa chỉ' }).click()
    // Validation on step 1 blocks jumping forward without name
    await expect(dialog.getByText('Vui lòng nhập tên nhà trọ.')).toBeVisible()

    await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill('Trọ Sinh Viên')
    await tabsBar.getByRole('tab', { name: 'Địa chỉ' }).click()
    await expect(dialog.getByRole('heading', { name: 'Địa chỉ', exact: true })).toBeVisible()

    // Mobile Step 3 (HH-36)
    await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('789 Mậu Thân')
    await tabsBar.getByRole('tab', { name: 'Hình ảnh' }).click()
    await expect(dialog.locator('.instruction-text')).toHaveText('Tải lên ít nhất 1 ảnh')

    // Close modal via close button
    await dialog.getByRole('button', { name: 'Đóng' }).click()
    await expect(dialog).toHaveCount(0)

    // Edit flow (HH-35)
    await page.getByRole('button', { name: /Chỉnh sửa Nhà trọ Minh An/i }).click()
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAccessibleName('Chỉnh sửa nhà trọ')
    await expect(dialog.getByLabel('Tên nhà trọ *', { exact: true })).toHaveValue('Nhà trọ Minh An')

    // Click Lưu nhà trọ
    await dialog.getByRole('button', { name: 'Lưu thay đổi' }).click()
    await expect(dialog).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('Thông tin nhà trọ được chỉnh sửa thành công.')
  })
})
