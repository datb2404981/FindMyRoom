import { test, expect } from '@playwright/test'

for (const kind of ['rental', 'roommate']) {
  test(`images can be dropped onto the file input with limits enforced: ${kind}`, async ({ page }) => {
    await page.goto('/#/dang-nhap?redirect=' + encodeURIComponent('/dang-bai/' + kind))
    await page.getByLabel('Email *', { exact: true }).fill(kind === 'rental' ? 'chutro@example.com' : 'sinhvien@example.com')
    await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
    await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await page.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Kiểm tra kéo thả ảnh')
    if (kind === 'rental') await page.getByLabel('Chọn nhà trọ *', { exact: true }).selectOption('minh-an')
    else await page.getByLabel('Ngày có thể chuyển vào *', { exact: true }).fill('2027-12-10')
    for (const input of await page.getByRole('spinbutton').all()) await input.fill('100')
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    await page.getByLabel('Phường / Xã *').selectOption('Xuân Khánh')
    await page.getByLabel('Tên đường / số nhà *').fill('123 đường 3/2')
    await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
    const files = await page.evaluateHandle(() => {
      const transfer = new DataTransfer()
      const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII='), c => c.charCodeAt(0))
      for (let i = 0; i < 3; i++) transfer.items.add(new File([bytes], `room${i}.png`, { type: 'image/png' }))
      return transfer
    })
    const input = page.getByLabel('Tải hình ảnh chỗ ở')
    await input.dispatchEvent('dragover', { dataTransfer: files })
    await expect(page.locator('.upload-zone')).toHaveClass(/dragging/)
    await input.dispatchEvent('drop', { dataTransfer: files })
    await expect(page.locator('.upload-grid img')).toHaveCount(3)
    await expect(page.locator('.upload-zone')).not.toHaveClass(/dragging/)
    const invalid = await page.evaluateHandle(() => {
      const transfer = new DataTransfer()
      transfer.items.add(new File(['text'], 'note.txt', { type: 'text/plain' }))
      transfer.items.add(new File([new Uint8Array(11 * 1024 * 1024)], 'large.png', { type: 'image/png' }))
      return transfer
    })
    await input.dispatchEvent('drop', { dataTransfer: invalid })
    await expect(page.locator('.upload-grid img')).toHaveCount(3)
    await expect(page.getByRole('alert')).toContainText('10 MB')
    for (let i = 0; i < 3; i++) await input.dispatchEvent('drop', { dataTransfer: files })
    await expect(page.locator('.upload-grid img')).toHaveCount(10)
    await expect(page.getByRole('alert')).toContainText('tối đa 10 ảnh')
    await page.getByRole('button', { name: 'Xóa ảnh 10', exact: true }).click()
    await input.setInputFiles({ name: 'picked.png', mimeType: 'image/png', buffer: Buffer.from('image') })
    await expect(page.locator('.upload-grid img')).toHaveCount(10)
  })
}
