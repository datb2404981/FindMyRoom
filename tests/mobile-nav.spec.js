import { test, expect } from '@playwright/test'

async function registerStudent(page) {
  const response = await page.request.post('/api/auth/register', {
    data: {
      name: 'Sinh viên Mobile Nav',
      email: `mobilenav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`,
      phone: '0987654321',
      password: 'testpass123',
      role: 'student',
      terms: true,
    },
  })
  expect(response.status()).toBe(201)
  return (await response.json()).user
}

test('mobile bottom-nav shows Quản lý bài đăng when student has published posts', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const user = await registerStudent(page)

  await page.goto('/#/')
  const bottomNav = page.locator('nav.bottom-nav')
  await expect(bottomNav).toBeVisible()
  await expect(bottomNav.locator('a')).toHaveCount(4)
  await expect(bottomNav.getByRole('link', { name: 'Quản lý bài đăng' })).toHaveCount(0)

  // Publish a roommate post for this student
  const postId = `rm-nav-${Date.now()}`
  const putRes = await page.request.put(`/api/roommates/${postId}`, {
    data: {
      title: 'Tìm bạn ở ghép gần ĐH Cần Thơ',
      status: 'Còn phòng',
      address: '100 đường 3/2, Cần Thơ',
      price: 1200000,
      people: 1,
      gender: 'Tất cả',
      moveIn: '2027-12-01',
      images: ['/illustrations/room-1.svg'],
      nearby: ['Nhà thuốc'],
      school: 'Đại học Cần Thơ',
    },
  })
  expect(putRes.ok()).toBeTruthy()

  try {
    // Reload to hydrate state.posts for the student
    await page.reload()
    await expect(bottomNav.locator('a')).toHaveCount(5)
    const manageLink = bottomNav.getByRole('link', { name: 'Quản lý bài đăng' })
    await expect(manageLink).toBeVisible()

    // All 5 items should fit within 390px viewport with equal widths and no nav overflow
    const layout = await page.evaluate(() => {
      const nav = document.querySelector('nav.bottom-nav')
      const links = [...nav.querySelectorAll('a')]
      const rects = links.map(a => a.getBoundingClientRect())
      return {
        navWidth: nav.getBoundingClientRect().width,
        navScrollWidth: nav.scrollWidth,
        innerWidth: window.innerWidth,
        widths: rects.map(r => r.width),
        maxRight: Math.max(...rects.map(r => r.right)),
        minLeft: Math.min(...rects.map(r => r.left)),
      }
    })
    expect(layout.navWidth).toBeLessThanOrEqual(layout.innerWidth)
    expect(layout.navScrollWidth).toBeLessThanOrEqual(layout.innerWidth)
    expect(layout.minLeft).toBeGreaterThanOrEqual(0)
    expect(layout.maxRight).toBeLessThanOrEqual(layout.innerWidth)
    for (const w of layout.widths) {
      expect(Math.abs(w - layout.widths[0])).toBeLessThan(2)
    }

    await manageLink.click()
    await expect(page).toHaveURL(/#\/quan-ly\/bai-dang/)
    await expect(manageLink).toHaveClass(/router-link-exact-active/)
  } finally {
    await page.request.delete(`/api/roommates/${postId}`)
  }
})
