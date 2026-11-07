import { test, expect } from '@playwright/test'

test('header post roommate button is placed in header actions next to avatar', async ({ page }) => {
  await page.goto('/#/')
  const header = page.locator('header')

  // Not in desktop-nav
  await expect(header.locator('.desktop-nav').getByRole('link', { name: 'Đăng bài ghép trọ' })).toHaveCount(0)

  // Present in header-actions as button
  const postBtn = header.locator('.header-actions .header-post-btn')
  await expect(postBtn).toBeVisible()
  await expect(postBtn).toHaveText(/Đăng bài ghép trọ/)

  // Log in as student
  await page.goto('/#/dang-nhap')
  await page.getByLabel('Email *', { exact: true }).fill('sinhvien@example.com')
  await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
  await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await page.goto('/#/')

  // In header-actions, button is visible next to the account avatar
  const accountTrigger = header.locator('.account-trigger')
  await expect(accountTrigger).toBeVisible()
  await expect(header.locator('.header-actions .header-post-btn')).toBeVisible()

  // Clicking the button navigates to roommate post form
  await header.locator('.header-actions .header-post-btn').click()
  await expect(page).toHaveURL(/dang-bai\/roommate/)
})
