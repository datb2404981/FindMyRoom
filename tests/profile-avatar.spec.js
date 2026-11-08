import { test, expect } from '@playwright/test'

async function signIn(page, role, accounts) {
  await page.goto('/#/dang-nhap?redirect=/ho-so')
  await page.getByLabel('Email *', { exact: true }).fill(accounts[role])
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page.locator('header .account-trigger')).toBeVisible()
  await page.goto('/#/ho-so')
  await expect(page.getByRole('heading', { name: 'Thông tin cá nhân', exact: true })).toBeVisible()
}
async function signOut(page) {
  await page.locator('header .account-trigger').click()
  await page.getByRole('navigation', { name: 'Tài khoản', exact: true }).getByRole('button', { name: 'Đăng xuất', exact: true }).click()
  await expect(page.locator('header .account-trigger')).toHaveCount(0)
}

for (const role of ['landlord', 'student']) {
  test(`${role} avatar persists and updates the header without leaking to another account`, async ({ page }) => {
    const accounts = {}
    for (const accountRole of ['landlord', 'student']) {
      accounts[accountRole] = `avatar-${accountRole}-${Date.now()}@example.com`
      const response = await page.request.post('/api/auth/register', { data: {
        name: 'Avatar Test', email: accounts[accountRole], phone: '0987654321', password: 'demopass123', role: accountRole, terms: true,
      } })
      expect(response.status()).toBe(201)
    }
    await page.request.post('/api/auth/logout')
    await signIn(page, role, accounts)
    const image = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 80; canvas.height = 80
      canvas.getContext('2d').fillStyle = '#e84736'
      canvas.getContext('2d').fillRect(0, 0, 80, 80)
      return canvas.toDataURL('image/png')
    })
    const photo = { name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(image.split(',')[1], 'base64') }
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
    await page.getByLabel('Đổi ảnh đại diện', { exact: true }).setInputFiles(photo)
    await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', image)
    await expect(page.locator('header .avatar img')).toHaveCount(0)
    await page.locator('form').getByRole('button', { name: 'Hủy', exact: true }).click()
    await expect(page.locator('.profile-avatar img')).toHaveCount(0)
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
    await page.getByLabel('Đổi ảnh đại diện', { exact: true }).setInputFiles({ name: 'too-large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
    await expect(page.getByRole('status')).toContainText('5 MB')
    await page.getByLabel('Đổi ảnh đại diện', { exact: true }).setInputFiles(photo)
    await page.clock.install({ time: new Date('2026-11-08T00:00:00Z') })
    await page.clock.pauseAt(new Date('2026-11-08T00:00:01Z'))
    await page.locator('form').getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận lưu', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('Đã lưu thông tin cá nhân')
    await page.clock.fastForward(4999)
    await expect(page.getByRole('status')).toBeVisible()
    await page.clock.fastForward(1)
    await expect(page.getByRole('status')).toHaveCount(0)
    await expect(page.locator('header .avatar img')).toHaveAttribute('src', image)
    await page.goto(role === 'landlord' ? '/#/quan-ly/nha-tro' : '/#/ghep-tro')
    await expect(page.locator('header .avatar img')).toHaveAttribute('src', image)
    await page.goto('/#/ho-so')
    await page.reload()
    await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', image)
    await expect(page.locator('header .avatar img')).toHaveAttribute('src', image)
    await signOut(page)
    await signIn(page, role === 'landlord' ? 'student' : 'landlord', accounts)
    await expect(page.locator('header .avatar img')).toHaveCount(0)
    await expect(page.locator('.profile-avatar img')).toHaveCount(0)
    await signOut(page)
    await signIn(page, role, accounts)
    await expect(page.locator('header .avatar img')).toHaveAttribute('src', image)
    await expect(page.locator('.profile-avatar img')).toHaveAttribute('src', image)
  })
}
