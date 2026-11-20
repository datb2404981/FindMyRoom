import { test, expect } from '@playwright/test'

async function openSearch(page) {
  const base = { image: '/illustrations/room-1.svg', images: ['/illustrations/room-1.svg'],
    address: 'Ninh Kiều, Cần Thơ', district: 'Ninh Kiều', status: 'Còn phòng', area: 20,
    people: 2, amenities: ['Wifi tốc độ cao'], schoolIds: ['ctu'] }
  const houses = Array.from({ length: 7 }, (_, i) => ({ ...base, id: 'scroll-house-' + i,
    name: 'Cuộn ngang nhà trọ ' + i, status: 'Đang hoạt động' }))
  for (const [endpoint, key, items] of [
    ['boarding-houses', 'houses', houses],
    ['rentals', 'posts', Array.from({ length: 12 }, (_, i) => ({ ...base, id: 'scroll-rental-' + i,
      kind: 'rental', title: 'Cuộn ngang phòng thuê ' + i, houseId: houses[i % 7].id, price: 1000000 + i * 100000 }))],
    ['roommates', 'posts', Array.from({ length: 7 }, (_, i) => ({ ...base, id: 'scroll-roommate-' + i,
      kind: 'roommate', title: 'Cuộn ngang ghép trọ ' + i, price: 1000000 + i * 50000 }))],
  ]) await page.route('**/api/' + endpoint, route => route.fulfill({ json: { [key]: items } }))
  await page.goto('/#/')
}

async function search(page, keyword = 'Cuộn ngang') {
  await page.getByRole('textbox', { name: 'Từ khóa tìm kiếm', exact: true }).fill(keyword)
  await page.locator('.hero-search-filters').getByRole('button', { name: 'Tìm kiếm', exact: true }).click()
}

test('search allows empty keyword without validation error and preserves results', async ({ page }) => {
  await openSearch(page)
  const input = page.getByRole('textbox', { name: 'Từ khóa tìm kiếm', exact: true })
  for (const blank of ['', '   ']) {
    await search(page, blank)
    await expect(page.getByRole('alert')).toHaveCount(0)
    expect(page.url()).toContain('search=1')
  }
  await input.press('Enter')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await search(page)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.group-rentals .room-card')).toHaveCount(12)
})

test('each result group has four desktop cards in view and scrolls freely without pagination', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openSearch(page)
  await search(page)
  await expect(page.locator('.home-listing-group')).toHaveCount(3)
  await expect(page.locator('.group-rentals .room-card')).toHaveCount(12)
  await expect(page.locator('.group-roommates .room-card')).toHaveCount(7)
  await expect(page.locator('.group-houses .room-card')).toHaveCount(7)
  await expect(page.getByRole('navigation', { name: 'Phân trang kết quả' })).toHaveCount(0)
  for (const group of ['rentals', 'roommates', 'houses']) {
    const track = page.locator('.group-' + group + ' .home-listing-grid')
    const dimensions = await track.evaluate(el => {
      const cards = [...el.children].map(card => card.getBoundingClientRect())
      return { right: el.getBoundingClientRect().right, first: cards[0].y, fourth: cards[3].y,
        fourthRight: cards[3].right, fifthLeft: cards[4].left }
    })
    expect(dimensions.first).toBe(dimensions.fourth)
    expect(dimensions.fourthRight).toBeLessThanOrEqual(dimensions.right + 1)
    expect(dimensions.fifthLeft).toBeGreaterThanOrEqual(dimensions.right)
    await expect(track).toHaveCSS('scroll-snap-type', 'none')
  }
  const track = page.locator('.group-rentals .home-listing-grid')
  await track.scrollIntoViewIfNeeded()
  const box = await track.boundingBox()
  const beforeUrl = page.url()
  await page.mouse.move(box.x + 230, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 80, box.y + 100, { steps: 12 })
  await page.mouse.up()
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(100)
  expect(page.url()).toBe(beforeUrl)
  const mouseOffset = await track.evaluate(el => el.scrollLeft)
  await track.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(mouseOffset)
  await page.getByRole('button', { name: 'Giá giảm dần', exact: true }).first().click()
  const prices = await track.locator('.price').allTextContents()
  expect(prices[0]).toContain('2.100.000')
  await expect(track.locator('.room-card')).toHaveCount(12)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  await track.locator('a').first().click()
  await expect(page).toHaveURL(/phong\/scroll-rental-/)
})

test('keyword searches apply price filters across all three result rows', async ({ page }) => {
  await openSearch(page)
  await page.locator('.hero-search-filters').getByRole('button', { name: 'Tất cả khoảng giá', exact: true }).click()
  const priceFilter = page.getByRole('dialog', { name: 'Khoảng giá', exact: true })
  await priceFilter.getByRole('radio', { name: '1 – 1,5 triệu', exact: true }).check()
  await priceFilter.getByRole('button', { name: 'Xong', exact: true }).click()
  await search(page, ' ')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await search(page)
  await expect(page.locator('.group-rentals .room-card')).toHaveCount(5)
  await expect(page.locator('.group-roommates .room-card')).toHaveCount(7)
  await expect(page.locator('.group-houses .room-card')).toHaveCount(5)
  await page.reload()
  await expect(page.locator('.group-rentals .room-card')).toHaveCount(5)
  await expect(page.getByRole('navigation', { name: 'Phân trang kết quả' })).toHaveCount(0)
})

test('price sorting is independent for each group and there is no result reset button', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await openSearch(page)
  await search(page)
  const ids = ['rentals', 'roommates', 'houses']
  const titles = id => page.locator('.group-' + id + ' .room-card h3')
  const descending = id => page.locator('.group-' + id).getByRole('button', { name: 'Giá giảm dần', exact: true })
  for (const [index, id] of ids.entries()) await expect(titles(id)).toHaveCount(index === 0 ? 12 : 7)
  await expect(page.locator('.home-listings-actions, .clear-filters-button')).toHaveCount(0)
  const current = Object.fromEntries(await Promise.all(ids.map(async id => [id, await titles(id).allTextContents()])))
  for (const id of ids) {
    await descending(id).scrollIntoViewIfNeeded()
    const scrollY = await page.evaluate(() => window.scrollY)
    await descending(id).click()
    await expect(descending(id)).toHaveAttribute('aria-pressed', 'true')
    await expect(titles(id)).not.toHaveText(current[id])
    for (const other of ids.filter(other => other !== id)) await expect(titles(other)).toHaveText(current[other])
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollY)
    current[id] = await titles(id).allTextContents()
    await expect(page.locator('.home-listing-group')).toHaveCount(3)
  }
  await page.reload()
  for (const id of ids) {
    await expect(descending(id)).toHaveAttribute('aria-pressed', 'true')
    await expect(titles(id)).toHaveText(current[id])
  }
  await page.locator('.group-rentals').getByRole('button', { name: 'Giá tăng dần', exact: true }).click()
  await expect(page.locator('.group-rentals .price').first()).toContainText('1.000.000')
  for (const id of ['roommates', 'houses']) {
    await expect(descending(id)).toHaveAttribute('aria-pressed', 'true')
    await expect(titles(id)).toHaveText(current[id])
  }
  await page.locator('.group-rentals').getByRole('button', { name: 'Giá tăng dần', exact: true }).click()
  await expect(page.locator('.group-rentals [aria-pressed="true"]')).toHaveCount(0)
  for (const id of ['roommates', 'houses']) await expect(titles(id)).toHaveText(current[id])
  expect(new URLSearchParams(page.url().split('?')[1]).get('q')).toBe('Cuộn ngang')
})

test('no matches and malformed searches keep their existing feedback', async ({ page }) => {
  await openSearch(page)
  await search(page, 'NoListingMatchesThisKeyword')
  await expect(page.getByRole('heading', { name: 'Không tìm thấy kết quả phù hợp!', exact: true })).toBeVisible()
  const url = page.url()
  await page.getByRole('button', { name: 'Nhập lại tìm kiếm', exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Từ khóa tìm kiếm', exact: true })).toBeFocused()
  expect(page.url()).toBe(url)
  await expect(page.getByRole('textbox', { name: 'Từ khóa tìm kiếm', exact: true })).toHaveValue('NoListingMatchesThisKeyword')
  await search(page, '!!!')
  await expect(page.getByRole('alert')).toContainText('Dữ liệu không hợp lệ!')
  await expect(page.locator('.search-listings .room-card')).toHaveCount(0)
})

test.describe('mobile result rows', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  test('native horizontal swipes reveal more cards without expanding the page width', async ({ page }) => {
    await openSearch(page)
    await search(page)
    const track = page.locator('.group-rentals .home-listing-grid')
    await expect(track.locator('.room-card')).toHaveCount(12)
    await expect(page.getByRole('button', { name: 'Xem thêm phòng trọ' })).toHaveCount(0)
    await track.scrollIntoViewIfNeeded()
    const box = await track.boundingBox()
    const client = await page.context().newCDPSession(page)
    const y = box.y + Math.min(100, box.height / 2)
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width - 35, y }] })
    for (let i = 1; i <= 8; i++) await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove', touchPoints: [{ x: box.x + box.width - 35 - i * 25, y }],
    })
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(50)
    await expect(page).toHaveURL(/search=1/)
    for (const width of [375, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), String(width)).toBeTruthy()
    }
  })
})
