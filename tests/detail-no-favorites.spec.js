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
      const phone = page.locator('span.contact-phone')
      await expect(phone).toBeVisible()
      await expect(page.locator('a.contact-phone, button.contact-phone')).toHaveCount(0)
      const url = page.url()
      await phone.click()
      await expect(page).toHaveURL(url)
      const digits = (await phone.innerText()).replace(/\D/g, '')
      await expect(page.locator('a.contact-zalo')).toHaveAttribute('href', 'https://zalo.me/' + digits)
      await expect(page.locator('a.contact-zalo')).toHaveAttribute('target', '_blank')
    }
  })
}

test('student Zalo link opens the rental landlord number, not the viewer number', async ({ page }) => {
  const register = (role, phone) => page.request.post('/api/auth/register', { data: {
    name: 'Contact owner', email: `contact-${role}-${Date.now()}@example.com`, phone, password: 'testpass123', role, terms: true,
  } })
  expect((await register('landlord', '0376624439')).status()).toBe(201)
  const houseId = 'contact-house-' + Date.now(), postId = 'contact-post-' + Date.now()
  expect((await page.request.put('/api/boarding-houses/' + houseId, { data: { name: 'Contact house', address: 'Cần Thơ' } })).ok()).toBeTruthy()
  expect((await page.request.put('/api/rentals/' + postId, { data: {
    title: 'Contact rental', houseId, price: 2000000, area: 25, people: 2, status: 'Còn phòng', images: ['/illustrations/room-1.svg'],
  } })).ok()).toBeTruthy()
  expect((await register('student', '0987654321')).status()).toBe(201)
  await page.goto('/#/phong/' + postId)
  await expect(page.locator('span.contact-phone')).toContainText('0376624439')
  await page.context().route('https://zalo.me/**', route => route.fulfill({ body: '<html>Zalo test</html>', contentType: 'text/html' }))
  const popup = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Chat Zalo', exact: true }).click()
  const zalo = await popup
  await expect(zalo).toHaveURL('https://zalo.me/0376624439')
  await zalo.close()
})
