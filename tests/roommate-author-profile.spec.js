import { test, expect } from '@playwright/test'

test('editing student gender updates Hồ sơ người đăng on roommate detail without changing preferred gender', async ({ page }) => {
  const email = `roommate-gender-${Date.now()}@example.com`
  const registerRes = await page.request.post('/api/auth/register', {
    data: {
      name: 'Nguyễn Minh Thư',
      email,
      phone: '0987654321',
      password: 'testpass123',
      role: 'student',
      terms: true,
    },
  })
  expect(registerRes.status()).toBe(201)

  const postId = `roommate-gender-test-${Date.now()}`
  const createRes = await page.request.put(`/api/roommates/${postId}`, {
    data: {
      title: 'Tìm bạn ở ghép gần ĐH Cần Thơ',
      status: 'Còn phòng',
      address: '123 Đường 3/2, Ninh Kiều, Cần Thơ',
      price: 2000000,
      area: 24,
      people: 1,
      gender: 'Tất cả',
      moveIn: '2027-12-01',
      school: 'Đại học Cần Thơ',
      images: ['/illustrations/room-1.svg'],
    },
  })
  expect(createRes.status()).toBe(200)

  try {
    await page.goto('/#/ho-so')
    await expect(page.getByRole('heading', { name: 'Thông tin cá nhân', exact: true })).toBeVisible()

    async function setGender(value) {
      await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click()
      await page.getByRole('button', { name: 'Giới tính', exact: true }).click()
      await page.getByRole('listbox', { name: 'Giới tính', exact: true }).getByRole('option', { name: value, exact: true }).click()
      await page.locator('form').getByRole('button', { name: 'Lưu thay đổi', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: 'Xác nhận lưu', exact: true }).click()
      await expect(page.getByRole('status')).toContainText('Đã lưu thông tin cá nhân')
    }

    await setGender('Nữ')
    await page.goto(`/#/phong/${postId}`)
    const authorCard = page.locator('.author-profile-card')
    await expect(authorCard).toBeVisible()
    await expect(authorCard).toContainText('Nữ')
    await expect(page.locator('.spec-grid')).toContainText('1 bạn (Tất cả)')

    await page.reload()
    await expect(authorCard).toContainText('Nữ')
    await expect(page.locator('.spec-grid')).toContainText('1 bạn (Tất cả)')

    await page.goto('/#/ho-so')
    await setGender('Khác')
    await page.goto(`/#/phong/${postId}`)
    await expect(authorCard).toContainText('Khác')
    await expect(page.locator('.spec-grid')).toContainText('1 bạn (Tất cả)')

    // Log out and check as a guest viewer that the server roommate list serves the updated poster gender.
    await page.request.post('/api/auth/logout')
    await page.reload()
    await expect(authorCard).toContainText('Khác')
    await expect(page.locator('.spec-grid')).toContainText('1 bạn (Tất cả)')
  } finally {
    await page.request.post('/api/auth/login', { data: { email, password: 'testpass123' } }).catch(() => {})
    await page.request.delete(`/api/roommates/${postId}`).catch(() => {})
  }
})
