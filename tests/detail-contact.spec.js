import { readFileSync } from 'node:fs'
import { test, expect } from '@playwright/test'

const read = name => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8'))
const accounts = read('account'), houses = read('boarding_house'), posts = read('room_post'), students = read('student_profile')
const house = houses.find(item => item.boarding_house_id === posts[0].boarding_house_id)
const landlordPhone = accounts.find(item => item.account_id === house.account_id).phone
const studentPhone = accounts.find(item => item.account_id === students[0].account_id).phone

for (const role of ['guest', 'student', 'landlord']) {
  test(`rental and roommate details show the correct phone number for ${role}`, async ({ page }) => {
    if (role !== 'guest') {
      await page.goto('/#/dang-nhap')
      await page.getByLabel('Email *', { exact: true }).fill(role === 'landlord' ? 'chutro@example.com' : 'sinhvien@example.com')
      await page.getByLabel('Mật khẩu *', { exact: true }).fill('demopass123')
      await page.locator('form').getByRole('button', { name: 'Đăng nhập', exact: true }).click()
      await expect(page).not.toHaveURL(/dang-nhap/)
    }
    for (const [id, phone] of [['minh-an', landlordPhone], ['ghep-thu', studentPhone]]) {
      await page.goto('/#/phong/' + id)
      const contact = page.locator('.contact-card .contact-phone')
      await expect(contact).toHaveText(phone)
      await expect(contact).toHaveAttribute('href', 'tel:' + phone)
      await expect(page.getByText('Xem thông tin liên hệ', { exact: true })).toHaveCount(0)
    }
  })
}
