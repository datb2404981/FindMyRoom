import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dataDirectory = new URL('../data/', import.meta.url)
const publicDirectory = resolve(fileURLToPath(new URL('../public/', import.meta.url)))
const primaryKeys = {
  account: 'account_id', university: 'university_id', student_profile: 'student_code',
  landlord_profile: 'account_id', amenity: 'amenity_id', boarding_house: 'boarding_house_id',
  boarding_house_image: 'house_image_id', room_post: 'room_post_id', room_post_image: 'room_post_image_id',
  roommate_post: 'roommate_post_id', roommate_post_image: 'roommate_post_image_id',
  roommate_preference: 'preference_id', review: 'review_id', review_image: 'review_image_id',
}
const tables = {}
for (const name of [...Object.keys(primaryKeys), 'room_post_amenity', 'roommate_post_amenity']) {
  const rows = JSON.parse(await readFile(new URL(`${name}.json`, dataDirectory), 'utf8'))
  assert(Array.isArray(rows), `${name}: expected an array`)
  assert(rows.every(row => row && typeof row === 'object' && !Array.isArray(row)), `${name}: invalid row`)
  const keys = primaryKeys[name] ? [primaryKeys[name]] : [name.replace('_amenity', '_id'), 'amenity_id']
  const seen = new Set()
  for (const row of rows) {
    assert(keys.every(key => typeof row[key] === 'string' && row[key].trim()), `${name}: missing key`)
    const key = JSON.stringify(keys.map(field => row[field]))
    assert(!seen.has(key), `${name}: duplicate key`)
    seen.add(key)
  }
  tables[name] = rows
}

let references = 0
for (const [name, rows] of Object.entries(tables)) {
  for (const [parent, key] of Object.entries(primaryKeys)) {
    if (!['account', 'university', 'student_profile', 'amenity', 'boarding_house', 'room_post', 'roommate_post', 'review'].includes(parent) || parent === name) continue
    const ids = new Set(tables[parent].map(row => row[key]))
    for (const row of rows) {
      if (!(key in row)) continue
      assert(ids.has(row[key]), `${name}: missing ${parent} reference`)
      references++
    }
  }
}
const emails = tables.account.map(row => row.email.trim().toLowerCase())
assert.equal(new Set(emails).size, emails.length, 'Duplicate email')
assert(tables.review.every(row => Number.isInteger(row.rating) && row.rating >= 1 && row.rating <= 5), 'Invalid rating')
assert(tables.roommate_preference.every(row => row.min_budget >= 0 && row.max_budget >= row.min_budget), 'Invalid budget')

let localImages = 0
for (const [name, rows] of Object.entries(tables)) {
  for (const row of rows) {
    const images = row.images_url ?? (row.avatar_url ? [row.avatar_url] : [])
    assert(Array.isArray(images), `${name}: invalid image list`)
    for (const image of images) {
      assert(typeof image === 'string' && image.length > 0, `${name}: invalid image`)
      if (!image.startsWith('/')) continue
      const file = resolve(publicDirectory, '.' + image)
      assert(file.startsWith(publicDirectory + sep), `${name}: image escapes public directory`)
      await access(file)
      localImages++
    }
  }
}
console.log(`Validated ${Object.keys(tables).length} tables, ${references} references and ${localImages} local image references.`)
