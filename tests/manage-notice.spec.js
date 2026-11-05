import { test, expect } from '@playwright/test'

for (const kind of ['bai-dang', 'nha-tro']) {
  test(`management notices disappear after five seconds: ${kind}`, async ({ page }) => {
    await page.goto('/#/dang-nhap?redirect=/quan-ly/' + kind)
    await page.getByLabel('Email *', { exact: true }).fill('chutro@example.com')
    await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
    await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page.locator('.manage-delete').first()).toBeVisible()
    await page.clock.install({ time: new Date('2026-11-05T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-11-05T00:00:01Z'))
    async function deleteFirst() {
      await page.locator('.manage-delete').first().click()
      await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận xóa', exact: true }).click()
      await expect(page.getByRole('status')).toHaveText('Đã xóa và cập nhật danh sách.')
    }
    await deleteFirst()
    await page.clock.fastForward(4000)
    await expect(page.getByRole('status')).toBeVisible()
    if (kind === 'bai-dang') await deleteFirst()
    await page.clock.fastForward(kind === 'bai-dang' ? 4999 : 999)
    await expect(page.getByRole('status')).toBeVisible()
    await page.clock.fastForward(1)
    await expect(page.getByRole('status')).toHaveCount(0)
  })
}
