import { test, expect } from '@playwright/test'

async function signIn(page, email, password = 'demopass123') {
  await page.goto('/#/dang-nhap')
  await page.getByLabel('Email *', { exact: true }).fill(email)
  await page.getByLabel('Mật khẩu *', { exact: true }).fill(password)
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}

test('wrong password and unknown email do not authenticate', async ({ page }) => {
  for (const [email, password] of [['sinhvien@example.com', 'wrongpass123'], ['missing@example.com', 'demopass123']]) {
    await signIn(page, email, password)
    await expect(page.getByRole('alert')).toHaveText('Email hoặc mật khẩu không đúng.')
    await expect(page).toHaveURL(/dang-nhap/)
    await expect(page.locator('header').getByRole('button', { name: /^Tài khoản / })).toHaveCount(0)
  }
})

test('registration rejects an existing email and preserves the form', async ({ page }) => {
  await page.goto('/#/dang-ky')
  await page.getByLabel('Họ và tên *', { exact: true }).fill('Tài khoản bị trùng')
  await page.getByLabel('Email *', { exact: true }).fill(' SINHVIEN@EXAMPLE.COM ')
  await page.getByLabel('Số điện thoại *', { exact: true }).fill('0912345678')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.getByLabel('Xác nhận mật khẩu *', { exact: true }).fill('demopass123')
  await page.getByRole('checkbox').check()
  await page.locator('form').getByRole('button', { name: 'Đăng ký', exact: true }).click()
  await expect(page.getByText('Email này đã được đăng ký.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Họ và tên *', { exact: true })).toHaveValue('Tài khoản bị trùng')
  await expect(page).toHaveURL(/dang-ky/)
})

test('switching accounts separates profiles and saved rooms', async ({ page }) => {
  await signIn(page, 'sinhvien@example.com')
  await expect(page.getByRole('heading', { name: 'Thông tin cá nhân', exact: true })).toBeVisible()
  await page.goto('/#/tim-tro')
  await page.locator('.room-card').first().getByRole('button', { name: 'Lưu tin', exact: true }).click()
  await page.locator('header').getByRole('button', { name: /^Tài khoản / }).click()
  await page.getByRole('navigation', { name: 'Tài khoản', exact: true }).getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page.locator('header').getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible()
  await signIn(page, 'chutro@example.com')
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Nguyễn Minh An')
  await page.goto('/#/quan-ly/da-luu')
  await expect(page.locator('.room-card')).toHaveCount(0)
  await signIn(page, 'sinhvien@example.com')
  await expect(page.getByRole('heading', { name: 'Thông tin cá nhân', exact: true })).toBeVisible()
  await page.goto('/#/quan-ly/da-luu')
  await expect(page.locator('.room-card')).toHaveCount(1)
})

test('account files and hashes cannot be read by the browser', async ({ request }) => {
  for (const path of ['/data/users.json', '/data/users.json?raw', '/server/auth.js']) {
    const response = await request.get(path)
    expect(response.status()).toBe(403)
    expect(await response.text()).not.toContain('passwordHash')
  }
  const response = await request.post('/api/auth/login', { data: { email: 'sinhvien@example.com', password: 'demopass123' } })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  expect(data.user).not.toHaveProperty('passwordHash')
  expect(data.user).not.toHaveProperty('password')
})
