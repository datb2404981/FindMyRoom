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

test('switching accounts separates profiles and redirects legacy saved route', async ({ page }) => {
  await signIn(page, 'sinhvien@example.com')
  await expect(page).toHaveURL(/#\/$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Tìm phòng trọ')
  await page.locator('header').getByRole('button', { name: /^Tài khoản / }).click()
  await page.getByRole('navigation', { name: 'Tài khoản', exact: true }).getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page.locator('header').getByRole('link', { name: 'Đăng nhập', exact: true })).toBeVisible()
  await signIn(page, 'chutro@example.com')
  await expect(page).toHaveURL(/quan-ly\/nha-tro/)
  await page.goto('/#/ho-so')
  await expect(page.getByLabel('Họ và tên', { exact: true })).toHaveValue('Nguyễn Minh An')
  await page.goto('/#/quan-ly/da-luu')
  await expect(page).toHaveURL(/quan-ly\/bai-dang/)
  await signIn(page, 'sinhvien@example.com')
  await expect(page).toHaveURL(/#\/$/)
})

test('switching auth pages clears passwords and resets their visibility', async ({ page }) => {
  await page.goto('/#/dang-ky')
  const password = page.getByLabel('Mật khẩu *', { exact: true })
  const confirm = page.getByLabel('Xác nhận mật khẩu *', { exact: true })
  await password.fill('testpassword123')
  await confirm.fill('testpassword123')
  await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click()
  await page.getByRole('button', { name: 'Hiện xác nhận mật khẩu', exact: true }).click()
  await expect(password).toHaveAttribute('type', 'text')
  await page.locator('.auth-switch').getByRole('link').click()
  await expect(password).toHaveAttribute('type', 'password')
  await expect(password).toHaveValue('')
  await page.locator('.auth-switch').getByRole('link').click()
  await expect(confirm).toHaveAttribute('type', 'password')
  await expect(confirm).toHaveValue('')
})

test('remembered accounts persist emails only and can be selected or forgotten', async ({ page }) => {
  await page.goto('/#/dang-nhap')
  await signIn(page, 'sinhvien@example.com', 'wrongpass123')
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('findmyroom:remembered-emails'))).toBeNull()
  await page.getByRole('checkbox', { name: 'Ghi nhớ tôi', exact: true }).check()
  await signIn(page, 'sinhvien@example.com')
  await expect(page).toHaveURL(/#\/$/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('findmyroom:remembered-emails')))).toEqual(['sinhvien@example.com'])
  await page.goto('/#/dang-nhap')
  await page.reload()
  await expect(page.getByLabel('Tài khoản đã ghi nhớ', { exact: true })).toHaveCount(0)
  await expect(page.locator('#remembered-emails option')).toHaveAttribute('value', 'sinhvien@example.com')
  await page.getByLabel('Email *', { exact: true }).fill('sinhvien@example.com')
  await expect(page.getByLabel('Email *', { exact: true })).toHaveValue('sinhvien@example.com')
  await expect(page.getByLabel('Mật khẩu *', { exact: true })).toHaveValue('')
  await expect(page.getByRole('checkbox', { name: 'Ghi nhớ tôi', exact: true })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Ghi nhớ tôi', exact: true }).uncheck()
  await signIn(page, 'sinhvien@example.com')
  await expect(page).toHaveURL(/#\/$/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('findmyroom:remembered-emails')))).toEqual([])
})

test('landlord profile shows only landlord fields and preserves identity values', async ({ page }) => {
  await signIn(page, 'chutro@example.com')
  await expect(page).toHaveURL(/quan-ly\/nha-tro/)
  await page.goto('/#/ho-so')
  await expect(page.locator('.form-grid .field > span')).toHaveText([
    'Họ và tên', 'CCCD', 'Mã số thuế', 'Giới tính', 'Ngày sinh',
    'Số điện thoại', 'Số điện thoại Zalo', 'Email', 'Địa chỉ',
  ])
  await expect(page.getByText('Giới thiệu bản thân', { exact: true })).toHaveCount(0)
  await expect(page.locator('.profile-summary')).not.toContainText('Đại học Cần Thơ')
  for (const width of [1366, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await expect(page.locator('.profile-section')).toHaveCount(2)
    expect(await page.locator('.profile-layout').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
    await page.screenshot({ path: test.info().outputPath(`profile-${width}.png`), fullPage: true })
  }
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
  await page.getByLabel('CCCD', { exact: true }).fill('079204583621')
  await page.getByLabel('Mã số thuế', { exact: true }).fill('079203001234')
  await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận lưu', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Đã lưu thông tin cá nhân.')
  await page.reload()
  await expect(page.getByLabel('CCCD', { exact: true })).toHaveValue('079204583621')
  await expect(page.getByLabel('Mã số thuế', { exact: true })).toHaveValue('079203001234')
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

test('registration allows selecting role after signup and redirects accordingly', async ({ page }) => {
  await page.goto('/#/dang-ky')
  const email = `landlord-${Date.now()}@example.com`
  await page.getByLabel('Họ và tên *', { exact: true }).fill('Chủ Trọ Mới')
  await page.getByLabel('Email *', { exact: true }).fill(email)
  await page.getByLabel('Số điện thoại *', { exact: true }).fill('0987654321')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.getByLabel('Xác nhận mật khẩu *', { exact: true }).fill('demopass123')
  await page.getByRole('checkbox').check()
  await page.locator('form').getByRole('button', { name: 'Đăng ký', exact: true }).click()

  // Popup OTP xuất hiện sau khi đăng ký
  await expect(page.getByText('Nhập mã xác thực')).toBeVisible()
  await page.getByLabel('Số thứ 1').fill('1')
  await page.getByRole('button', { name: 'Xác nhận', exact: true }).click()

  // Màn hình chọn role xuất hiện sau khi xác nhận OTP
  await expect(page.getByText('Bạn muốn tham gia với tư cách')).toBeVisible()
  await page.getByRole('radio', { name: 'Chủ Trọ' }).click()

  // Chuyển hướng tới trang quản lý nhà trọ
  await expect(page).toHaveURL(/quan-ly\/nha-tro/)
  const role = await page.evaluate(() => localStorage.getItem('findmyroom:role'))
  expect(role).toBe('landlord')
})
