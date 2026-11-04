import { test, expect } from '@playwright/test'

async function locationStep(page, context) {
  const response = await context.request.post('/api/auth/login', { data: { email: 'sinhvien@example.com', password: 'demopass123' } })
  expect(response.ok()).toBeTruthy()
  await page.goto('/#/dang-bai/roommate')
  await page.getByLabel('Tiêu đề bài đăng *', { exact: true }).fill('Tìm bạn ở ghép gần trường')
  await page.getByLabel('Ngày có thể chuyển vào *', { exact: true }).fill(new Date(Date.now() + 86400000).toISOString().slice(0, 10))
  for (const [label, value] of [['Diện tích (m²) *', '24'], ['Tiền trọ (VND) *', '1800000'], ['Dự kiến giá/người (VND) *', '900000'], ['Tiền điện (VND/kWh) *', '3500'], ['Tiền nước (VND/m³) *', '18000']]) await page.getByLabel(label, { exact: true }).fill(value)
  await expect(page.getByLabel('Mô tả chi tiết', { exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Tiếp theo', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Vị trí & Địa lý', exact: true })).toBeVisible()
}

test('location request reports loading, denied permission, timeout and a successful retry', async ({ page, context }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
      getCurrentPosition(success, error) { window.resolveTestPosition = success; window.rejectTestPosition = error },
    } })
  })
  await locationStep(page, context)
  const locate = page.getByRole('button', { name: 'Vị trí hiện tại', exact: true })
  await locate.click()
  await expect(page.getByRole('status')).toContainText('Đang lấy tọa độ')
  await expect(page.getByRole('button', { name: 'Đang lấy vị trí…', exact: true })).toBeDisabled()
  await page.evaluate(() => window.rejectTestPosition({ code: 1 }))
  await expect(page.getByRole('alert')).toContainText('Bạn chưa cho phép truy cập vị trí')
  await expect(locate).toBeEnabled()
  await locate.click()
  await page.evaluate(() => window.rejectTestPosition({ code: 3 }))
  await expect(page.getByRole('alert')).toContainText('Lấy vị trí quá thời gian chờ')
  await locate.click()
  await page.evaluate(() => window.resolveTestPosition({ coords: { latitude: 10.03076, longitude: 105.76891 } }))
  await expect(page.getByRole('status')).toContainText('Đã lấy tọa độ thành công!')
  await expect(page.getByRole('status')).toContainText('105.76891')
  await expect(locate).toBeEnabled()
})
