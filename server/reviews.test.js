import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAuthMiddleware } from './auth.js'

test('multi-image reviews use the original review and image schemas and survive restart', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'findmyroom-reviews-'))
  const accountsFile = join(directory, 'account.json'), reviewsFile = join(directory, 'review.json')
  await writeFile(accountsFile, '[]')
  const servers = []
  t.after(async () => {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
    await rm(directory, { recursive: true, force: true })
  })
  async function start() {
    const middleware = createAuthMiddleware({ accountsFile, reviewsFile, housesFile: join(directory, 'boarding_house.json'), rentalsFile: join(directory, 'room_post.json') })
    const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
    servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening')
    return async (path, method = 'GET', body, cookie) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) })
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }
  }
  const request = await start()
  const register = role => request('/api/auth/register', 'POST', { name: role, email: role + '@example.com', phone: '0987654321', password: 'testpass123', role, terms: true })
  const landlord = await register('landlord'), student = await register('student')
  assert.equal((await request('/api/boarding-houses/review-house', 'PUT', { name: 'Review house', address: 'Cần Thơ' }, landlord.cookie)).status, 200)
  const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII='
  const body = { houseId: 'review-house', content: 'Clean room', rating: 4, images: [image, image, image], student_code: 'spoofed' }
  assert.equal((await request('/api/house-reviews', 'POST', body)).status, 401)
  assert.equal((await request('/api/house-reviews', 'POST', body, landlord.cookie)).status, 403)
  for (const bad of [{ ...body, images: Array(11).fill(image) }, { ...body, images: ['data:image/png;base64,SGVsbG8='] }, { ...body, images: 'not-an-array' }, { ...body, rating: 6 }, { ...body, houseId: 'missing-house' }]) {
    assert.equal((await request('/api/house-reviews', 'POST', bad, student.cookie)).status, 400)
  }
  const oversized = 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), Buffer.alloc(5 * 1024 * 1024)]).toString('base64')
  assert.equal((await request('/api/house-reviews', 'POST', { ...body, images: [oversized] }, student.cookie)).status, 400)
  const saved = await request('/api/house-reviews', 'POST', body, student.cookie)
  assert.equal(saved.status, 201)
  assert.equal(saved.data.review.images.length, 3)
  const rows = JSON.parse(await readFile(reviewsFile, 'utf8'))
  assert.deepEqual(Object.keys(rows[0]).sort(), ['review_id', 'boarding_house_id', 'student_code', 'rating', 'content', 'reviewed_at'].sort())
  const photos = JSON.parse(await readFile(join(directory, 'review_image.json'), 'utf8'))
  assert.deepEqual(Object.keys(photos[0]).sort(), ['review_image_id', 'review_id', 'images_url'].sort())
  assert.equal(photos[0].review_id, rows[0].review_id)
  assert.equal(photos[0].images_url.length, 3)
  const students = JSON.parse(await readFile(join(directory, 'student_profile.json'), 'utf8'))
  assert.equal(students.find(student => student.student_code === rows[0].student_code).account_id, student.data.user.id)
  const restarted = await start()
  const visible = await restarted('/api/house-reviews?houseId=review-house')
  assert.equal(visible.data.reviews[0].author, 'student')
  assert.equal(visible.data.reviews[0].images.length, 3)
  assert.deepEqual((await restarted('/api/house-reviews?houseId=another-house')).data.reviews, [])
  assert.equal((await request('/api/house-reviews', 'POST', { ...body, images: [] }, student.cookie)).status, 201)
})
