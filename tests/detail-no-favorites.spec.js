import { test, expect } from '@playwright/test'

for (const role of ['guest', 'student', 'landlord']) {
  test(`${role} can view and contact posts without a save or heart action`, async ({ page }) => {
    if (role !== 'guest') {
      const registered = await page.request.post('/api/auth/register', { data: {
        name: 'Detail Contact Test', email: `no-favorites-${role}-${Date.now()}@example.com`,
        phone: '0987654321', password: 'testpass123', role, terms: true,
      } })
      expect(registered.status()).toBe(201)
    }
    for (const id of ['minh-an', 'ghep-thu']) {
      await page.goto('/#/phong/' + id)
      await expect(page.locator('.detail-title h1')).toBeVisible()
      await expect(page.getByRole('button', { name: /^(Lưu tin|Bỏ lưu tin)$/ })).toHaveCount(0)
      await expect(page.locator('.detail-title button')).toHaveCount(0)
      await expect(page.locator('a.contact-phone[href^="tel:"]')).toBeVisible()
      await page.getByRole('button', { name: 'Chat Zalo', exact: true }).click()
      if (role === 'guest') await expect(page).toHaveURL(/dang-nhap/)
      else await expect(page.locator('.contact-card .notice')).toBeVisible()
    }
  })
}
