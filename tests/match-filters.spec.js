import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

const panel = page => page.getByRole('complementary', { name: 'Bộ lọc ghép trọ', exact: true })
const start = page => panel(page).getByRole('button', { name: 'Bắt đầu ghép trọ', exact: true }).click()

test('matching cards show the post title and room cover and open the same post', async ({ page }) => {
  const posts = JSON.parse(readFileSync(new URL('../data/roommate_post.json', import.meta.url), 'utf8'))
  const photos = JSON.parse(readFileSync(new URL('../data/roommate_post_image.json', import.meta.url), 'utf8'))
  await page.goto('/#/ghep-tro')
  await start(page)
  for (const index of [0, 1]) {
    const post = posts[index]
    const cover = photos.find(item => item.roommate_post_id === post.roommate_post_id).images_url[0]
    await expect(page.locator('.person-card h2')).toHaveText(post.title)
    await expect(page.locator('.person-portrait img')).toHaveAttribute('src', cover)
    await expect(page.locator('.person-portrait img')).toHaveAttribute('alt', post.title)
    await expect(page.locator('.person-portrait')).not.toContainText('Hồ sơ mẫu')
    if (index === 0) await page.locator('.match-action.pass').click()
  }
  await page.locator('.match-action.detail').click()
  await expect(page).toHaveURL(/phong\/ghep-hieu/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(posts[1].title)
})

test('location tabs select actual schools or regions and reset restores candidates', async ({ page }) => {
  await page.goto('/#/ghep-tro')
  const filters = panel(page)
  await filters.getByRole('button', { name: 'Theo khu vực', exact: true }).click()
  await filters.getByRole('group', { name: 'Danh sách khu vực', exact: true }).getByRole('button', { name: 'Cái Răng', exact: true }).click()
  await filters.getByLabel('Bạn muốn ở cùng', { exact: true }).selectOption('Nam')
  await start(page)
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-khoa')
  await filters.getByRole('button', { name: 'Theo địa điểm', exact: true }).click()
  await filters.getByRole('group', { name: 'Danh sách trường học', exact: true }).getByRole('button', { name: 'Đại học Cần Thơ', exact: true }).click()
  await filters.getByLabel('Bạn muốn ở cùng', { exact: true }).selectOption('Nữ')
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-thu')
  await filters.getByRole('button', { name: /^Chọn trường học:/ }).click()
  await filters.getByRole('group', { name: 'Danh sách trường học', exact: true }).getByRole('button', { name: 'Cao đẳng Nghề Cần Thơ', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Bạn đã xem hết hồ sơ phù hợp', exact: true })).toBeVisible()
  await filters.getByRole('button', { name: 'Đặt lại bộ lọc ghép trọ', exact: true }).click()
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-thu')
  await expect(filters.getByRole('button', { name: /^Chọn trường học:/ })).toContainText('Tất cả trường học')
})

test('budget has two keyboard-operable handles that cannot cross', async ({ page }) => {
  await page.goto('/#/ghep-tro')
  const filters = panel(page)
  const minimum = filters.getByRole('slider', { name: 'Giá tối thiểu mỗi người', exact: true })
  const maximum = filters.getByRole('slider', { name: 'Giá tối đa mỗi người', exact: true })
  await maximum.focus()
  for (let index = 0; index < 10; index++) await page.keyboard.press('ArrowLeft')
  await expect(maximum).toHaveValue('1000000')
  await start(page)
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-hieu')
  await minimum.focus()
  await page.keyboard.press('End')
  await expect(minimum).toHaveValue('900000')
  await maximum.focus()
  await page.keyboard.press('Home')
  await expect(maximum).toHaveValue('1000000')
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-hieu')
})

test('whole amenity and lifestyle cards toggle and actually filter candidates', async ({ page }) => {
  await page.goto('/#/ghep-tro')
  const filters = panel(page)
  const amenity = filters.getByRole('region', { name: 'Tiện ích', exact: true }).locator('label').filter({ hasText: 'Máy lạnh' })
  const box = await amenity.boundingBox()
  await amenity.click({ position: { x: box.width - 5, y: box.height / 2 } })
  await expect(amenity.getByRole('checkbox')).toBeChecked()
  await start(page)
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-hieu')
  const habit = filters.getByRole('region', { name: 'Phong cách sống', exact: true }).getByRole('checkbox', { name: 'Người thân qua đêm', exact: true })
  await habit.check()
  await expect(page.getByRole('heading', { name: 'Bạn đã xem hết hồ sơ phù hợp', exact: true })).toBeVisible()
  await habit.uncheck()
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-hieu')
  await filters.getByRole('button', { name: 'Đặt lại bộ lọc ghép trọ', exact: true }).click()
  await expect(filters.locator('input:checked')).toHaveCount(0)
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-thu')
})

test('match filters fit desktop and mobile and start moves to the results on mobile', async ({ page }) => {
  await page.goto('/#/ghep-tro')
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const box = await panel(page).boundingBox()
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}: horizontal overflow`).toBeTruthy()
  }
  await page.setViewportSize({ width: 375, height: 900 })
  await start(page)
  await expect(page.getByRole('region', { name: 'Kết quả ghép trọ', exact: true })).toBeFocused()
  await expect(page.locator('.person-card')).toHaveAttribute('data-post-id','ghep-thu')
})

for (const width of [1366, 390]) {
  test(`start matching scrolls back to results at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 })
    await page.goto('/#/ghep-tro')
    await start(page)
    const results = page.getByRole('region', { name: 'Kết quả ghép trọ', exact: true })
    await expect(results).toBeFocused()
    await expect.poll(() => page.locator('.match-actions').evaluate(el => {
      const rect = el.getBoundingClientRect()
      const nav = document.querySelector('.bottom-nav')?.getBoundingClientRect()
      const bottom = nav?.height ? nav.top : innerHeight
      return rect.top >= 0 && rect.bottom <= bottom - 12
    })).toBe(true)
    await expect(page.locator('.match-actions button')).toHaveCount(3)
    await expect(page.locator('.person-card')).toBeVisible()
  })
}
