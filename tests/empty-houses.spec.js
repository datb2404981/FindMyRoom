import { test, expect } from '@playwright/test'

async function register(page) {
  const response = await page.request.post('/api/auth/register', { data: {
    name: 'Empty House Test', email: `empty-house-${crypto.randomUUID()}@example.com`,
    phone: '0987654321', password: 'testpass123', role: 'landlord', terms: true,
  } })
  expect(response.status()).toBe(201)
}

test('new landlords see the empty state and can create their first house', async ({ page, browser }) => {
  await register(page)
  await page.goto('/#/quan-ly/nha-tro')
  await expect(page.getByRole('heading', { name: 'Chưa có nhà trọ' })).toBeVisible()
  await expect(page.locator('.table-header, .house-row')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Chưa có nhà trọ' })).toBeVisible()
  await page.getByRole('button', { name: 'Tạo nhà trọ', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Tên nhà trọ *', { exact: true }).fill('Nhà trọ đầu tiên')
  await dialog.getByRole('button', { name: /Tiếp theo/ }).click()
  await dialog.getByRole('button', { name: 'Phường/Xã *', exact: true }).click()
  await dialog.getByRole('option', { name: 'Phường Ninh Kiều', exact: true }).click()
  await dialog.getByLabel('Địa chỉ *', { exact: true }).fill('123 đường 3/2')
  await dialog.getByRole('button', { name: /Tiếp theo/ }).click()
  await dialog.getByRole('button', { name: 'Tạo nhà trọ', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.house-row')).toContainText('Nhà trọ đầu tiên')
  await page.reload()
  await expect(page.locator('.house-row')).toContainText('Nhà trọ đầu tiên')

  const otherContext = await browser.newContext()
  try {
    const other = await otherContext.newPage()
    await register(other)
    await other.goto('/#/quan-ly/nha-tro')
    await expect(other.getByRole('heading', { name: 'Chưa có nhà trọ' })).toBeVisible()
    await expect(other.locator('.house-row')).toHaveCount(0)
  } finally { await otherContext.close() }
})

test('old default samples are removed while locally created houses are preserved', async ({ page }) => {
  await register(page)
  await page.goto('/#/quan-ly/nha-tro')
  await expect(page.getByRole('heading', { name: 'Chưa có nhà trọ' })).toBeVisible()
  const localId = `house-local-${Date.now()}`
  await page.evaluate(id => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    data.houses = [
      { id: 'BH00000001', name: 'Nhà trọ An Phú' },
      { id: 'minh-an', code: 'BH00000001', name: 'Nhà trọ Minh An' },
      { id, name: 'Nhà trọ đã tạo trước đây', address: '456 đường cũ, Cần Thơ', rooms: 2, status: 'Đang hoạt động' },
    ]
    localStorage.setItem(key, JSON.stringify(data))
  }, localId)
  await page.route('**/api/boarding-houses', route => route.abort())
  await page.reload()
  await expect(page.locator('.house-row')).toHaveCount(1)
  await expect(page.locator('.house-row')).toContainText('Nhà trọ đã tạo trước đây')
  await page.unroute('**/api/boarding-houses')
  await page.reload()
  await expect(page.locator('.house-row')).toHaveCount(1)
  const owner = (await (await page.request.get('/api/auth/session')).json()).user
  const houses = (await (await page.request.get('/api/boarding-houses')).json()).houses
  expect(houses.find(house => house.id === localId)?.ownerId).toBe(owner.id)
})
