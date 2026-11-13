import { test, expect } from '@playwright/test'

async function register(page, role) {
  const response = await page.request.post('/api/auth/register', { data: {
    name: 'Money Test', email: `money-${role}-${crypto.randomUUID()}@example.com`,
    phone: '0987654321', password: 'testpass123', role, terms: true,
  } })
  expect(response.status()).toBe(201)
}

for (const [role, kind, priceLabel, moneyLabels] of [
  ['landlord', 'rental', 'Giá thuê (đ/tháng) *', ['Tiền cọc (đ)', 'Giá điện (đ/kWh) *', 'Giá nước (đ/m³) *', 'Tiền wifi (đ/tháng)']],
  ['student', 'roommate', 'Tiền trọ (đ) *', ['Dự kiến giá/người (đ) *', 'Tiền điện (đ/kWh) *', 'Tiền nước (đ/m³) *', 'Tiền internet (đ/tháng)']],
]) {
  test(`${kind} form enters money in thousands and keeps other numbers above zero`, async ({ page }) => {
    await register(page, role)
    await page.goto('/#/dang-bai/' + kind)
    const price = page.getByLabel(priceLabel, { exact: true })
    await price.pressSequentially('1')
    await expect(price).toHaveValue('1.000')
    await price.pressSequentially('0')
    await expect(price).toHaveValue('10.000')
    await price.press('ArrowUp')
    await expect(price).toHaveValue('11.000')
    await price.press('ArrowDown')
    await expect(price).toHaveValue('10.000')
    const stepper = page.getByLabel('Điều chỉnh ' + priceLabel, { exact: true })
    await price.hover()
    await expect(stepper).toHaveCSS('opacity', '1')
    await stepper.press('ArrowDown')
    await expect(price).toHaveValue('9.000')
    await stepper.press('ArrowUp')
    await expect(price).toHaveValue('10.000')
    await price.fill('')
    await expect(price).toHaveValue('')
    await price.fill('1234')
    await expect(price).toHaveValue('1.234.000')
    await price.press('Home')
    await price.press('ArrowRight')
    await price.press('Delete')
    await expect(price).toHaveValue('134.000')
    await price.press('ControlOrMeta+A')
    await price.press('Backspace')
    await expect(price).toHaveValue('')
    await price.evaluate(element => {
      const clipboardData = new DataTransfer()
      clipboardData.setData('text', '1.234.000')
      element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
    })
    await expect(price).toHaveValue('1.234.000')
    for (const label of moneyLabels) {
      const field = page.getByLabel(label, { exact: true })
      await field.fill('1')
      await expect(field).toHaveValue('1.000')
    }
    const area = page.getByLabel('Diện tích (m²) *', { exact: true })
    await expect(area).toHaveValue('1')
    await area.press('ArrowDown')
    await expect(area).toHaveValue('1')
    await area.fill('0')
    await expect(area).toHaveValue('1')
    await area.fill('-5')
    await expect(area).toHaveValue('1')
    await area.fill('')
    await area.blur()
    await expect(area).toHaveValue('1')
    const people = page.getByLabel(role === 'landlord' ? 'Số người tối đa *' : 'Số người cần tìm *', { exact: true })
    await people.fill('0')
    await expect(people).toHaveValue('1')
    if (role === 'landlord') {
      const count = page.getByLabel('Số lượng phòng *', { exact: true })
      await count.fill('0')
      await expect(count).toHaveValue('1')
    }
    await page.setViewportSize({ width: 390, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  })
}

test('old zero-valued drafts start at one and a fresh form can be closed', async ({ page }) => {
  await register(page, 'landlord')
  await page.goto('/#/dang-bai/rental')
  await expect(page.getByLabel('Diện tích (m²) *', { exact: true })).toHaveValue('1')
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(key => key.startsWith('findmyroom-demo-v1:'))
    const data = JSON.parse(localStorage.getItem(key))
    data.drafts.rental = { ...data.drafts.rental, area: 0, count: 0, people: 0 }
    localStorage.setItem(key, JSON.stringify(data))
  })
  await page.reload()
  await expect(page.getByLabel('Diện tích (m²) *', { exact: true })).toHaveValue('1')
  await expect(page.getByLabel('Số lượng phòng *', { exact: true })).toHaveValue('1')
  await expect(page.getByLabel('Số người tối đa *', { exact: true })).toHaveValue('1')
  await page.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(page).toHaveURL(/quan-ly\/bai-dang/)
  await page.goto('/#/dang-bai/rental')
  await page.getByLabel('Diện tích (m²) *', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Hủy', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('Rời khỏi các bước đăng bài?')).toBeVisible()
})

test('editing keeps an existing 3,500 đồng price and saves new amounts in đồng', async ({ page }) => {
  await register(page, 'landlord')
  const houseId = `money-house-${Date.now()}`, postId = `money-post-${Date.now()}`
  expect((await page.request.put('/api/boarding-houses/' + houseId, { data: { name: 'Nhà trọ kiểm thử', address: 'Cần Thơ' } })).ok()).toBeTruthy()
  expect((await page.request.put('/api/rentals/' + postId, { data: {
    title: 'Bài đăng kiểm thử', houseId, status: 'Còn phòng', price: 2000000, area: 25, people: 2,
    electric: 3500, water: 18000, images: ['/illustrations/room-1.svg'],
  } })).ok()).toBeTruthy()
  await page.goto('/#/quan-ly/bai-dang')
  await page.locator('.manage-post').filter({ hasText: 'Bài đăng kiểm thử' }).getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Giá điện (đ/kWh) *', { exact: true })).toHaveValue('3.500')
  const price = dialog.getByLabel('Giá thuê (đ/tháng) *', { exact: true })
  await price.fill('10')
  await expect(price).toHaveValue('10.000')
  const count = dialog.getByLabel('Số phòng còn lại *', { exact: true })
  await count.fill('0')
  await expect(count).toHaveValue('1')
  await dialog.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const saved = (await (await page.request.get('/api/rentals')).json()).posts.find(post => post.id === postId)
  expect(saved.price).toBe(10000)
  expect(saved.electric).toBe(3500)
})
