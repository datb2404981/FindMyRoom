import { test, expect } from '@playwright/test'

async function startMatch(page) {
  await page.goto('/#/ghep-tro')
  await page.getByRole('button', { name: 'Bắt đầu ghép trọ', exact: true }).click()
  await expect(page.locator('.person-card')).toBeVisible()
}

test('back button and right-swipe restore the previous swiped-past profile in a single action', async ({ page }) => {
  await startMatch(page)
  await expect(page.locator('.person-card')).toContainText('Lam Thư')

  const backBtn = page.locator('.match-action.back')
  const passBtn = page.locator('.match-action.pass')
  await expect(backBtn).toBeDisabled()

  // Click pass then click back once
  await passBtn.click()
  await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')
  await expect(backBtn).toBeEnabled()

  await backBtn.click()
  await expect(page.locator('.person-card')).toContainText('Lam Thư')
  await expect(backBtn).toBeDisabled()

  // Swipe left then swipe right once
  const card = page.locator('.person-card')
  const box = await card.boundingBox()
  const cy = box.y + box.height / 2
  const cx = box.x + box.width / 2

  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx - 80, cy, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')

  const box2 = await page.locator('.person-card').boundingBox()
  const cx2 = box2.x + box2.width / 2
  const cy2 = box2.y + box2.height / 2
  await page.mouse.move(cx2, cy2)
  await page.mouse.down()
  await page.mouse.move(cx2 + 80, cy2, { steps: 6 })
  await page.mouse.up()
  await expect(page.locator('.person-card')).toContainText('Lam Thư')
})

test('back button restores a matching passed profile in one click even after filter changes', async ({ page }) => {
  await startMatch(page)
  const backBtn = page.locator('.match-action.back')
  const passBtn = page.locator('.match-action.pass')

  // Filter to Nam, pass Hoàng Hiếu, then clear filter so Lam Thư becomes current
  const filters = page.getByRole('complementary', { name: 'Bộ lọc ghép trọ', exact: true })
  await filters.getByRole('button', { name: 'Bạn muốn ở cùng', exact: true }).click()
  await page.getByRole('listbox', { name: 'Bạn muốn ở cùng', exact: true }).getByRole('option', { name: 'Bạn nam', exact: true }).click()
  await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')

  await passBtn.click()
  await expect(page.locator('.person-card')).toContainText('Minh Khoa')

  await filters.getByRole('button', { name: 'Bạn muốn ở cùng', exact: true }).click()
  await page.getByRole('listbox', { name: 'Bạn muốn ở cùng', exact: true }).getByRole('option', { name: 'Không giới hạn', exact: true }).click()
  await expect(page.locator('.person-card')).toContainText('Lam Thư')

  // Single back click must immediately restore Hoàng Hiếu on screen
  await backBtn.click()
  await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')
  await expect(backBtn).toBeDisabled()
})

test('returning from detail page keeps started state and restores previous profile in one click', async ({ page }) => {
  await startMatch(page)
  await page.locator('.match-action.pass').click()
  await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')

  await page.locator('.match-action.detail').click()
  await expect(page).toHaveURL(/\/phong\/ghep-hieu/)

  // Browser back returns directly to the active Tinder stage (not welcome page)
  await page.goBack()
  await expect(page).toHaveURL(/\/ghep-tro\?start=1/)
  await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')

  // Single click on Tinder back button restores Lam Thư immediately
  await page.locator('.match-action.back').click()
  await expect(page.locator('.person-card')).toContainText('Lam Thư')
})

test('right-swipe does not overflow horizontally or shift navbar on desktop or mobile', async ({ page }) => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp)
    await startMatch(page)
    await page.waitForTimeout(450)
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))

    await page.evaluate(() => {
      window.__headerMutations = 0
      window.__maxScrollWidth = document.documentElement.scrollWidth
      const header = document.querySelector('.site-header')
      if (header) {
        new MutationObserver(() => { window.__headerMutations++ }).observe(header, { childList: true, subtree: true, attributes: true })
      }
      window.__sampleWidth = () => {
        window.__maxScrollWidth = Math.max(window.__maxScrollWidth, document.documentElement.scrollWidth)
      }
    })

    // Swipe left
    const b1 = await page.locator('.person-card').boundingBox()
    await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2)
    await page.mouse.down()
    await page.mouse.move(b1.x + b1.width / 2 - 70, b1.y + b1.height / 2, { steps: 6 })
    await page.mouse.up()
    await expect(page.locator('.person-card')).toContainText('Hoàng Hiếu')

    // Swipe right and sample scrollWidth during the swipe-out animation
    const b2 = await page.locator('.person-card').boundingBox()
    await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2)
    await page.mouse.down()
    await page.mouse.move(b2.x + b2.width / 2 + 70, b2.y + b2.height / 2, { steps: 6 })
    await page.mouse.up()
    await page.waitForTimeout(70)
    await page.evaluate(() => window.__sampleWidth())
    await expect(page.locator('.person-card')).toContainText('Lam Thư')

    const metrics = await page.evaluate(() => ({
      maxScrollWidth: window.__maxScrollWidth,
      innerWidth: window.innerWidth,
      headerMutations: window.__headerMutations,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    }))
    expect(metrics.maxScrollWidth).toBeLessThanOrEqual(metrics.innerWidth)
    expect(metrics.headerMutations).toBe(0)
    expect(metrics.scrollX).toBe(0)
    expect(metrics.scrollY).toBe(0)
  }
})

