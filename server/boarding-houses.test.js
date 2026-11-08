import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createAuthMiddleware } from './auth.js'

test('house directory persists landlord houses and enforces ownership', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'findmyroom-houses-api-'))
  const usersFile = join(directory, 'users.json'), housesFile = join(directory, 'houses.json')
  await writeFile(usersFile, JSON.stringify({ users: [] }))
  const servers = []
  t.after(async () => {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
    await rm(directory, { recursive: true, force: true })
  })
  async function start() {
    const middleware = createAuthMiddleware({ usersFile, housesFile })
    const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
    servers.push(server); server.listen(0, '127.0.0.1'); await once(server, 'listening')
    return async (path, method = 'GET', data, cookie) => {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method, headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        ...(data ? { body: JSON.stringify(data) } : {}),
      })
      return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
    }
  }
  const request = await start()
  const users = []
  for (const [i, role] of ['landlord', 'landlord', 'student'].entries()) {
    const registered = await request('/api/auth/register', 'POST', { name: 'House Test', email: `house${i}@example.com`, phone: '0987654321', password: 'testpass123', role, terms: true })
    assert.equal(registered.status, 201); users.push(registered)
  }
  const body = { name: 'Nhà trọ chủ trọ tạo', address: '123 đường 3/2, Cần Thơ', rooms: 3, ownerId: users[1].data.user.id }
  assert.equal((await request('/api/boarding-houses/house-test', 'PUT', body)).status, 401)
  assert.equal((await request('/api/boarding-houses/house-test', 'PUT', body, users[2].cookie)).status, 403)
  const created = await request('/api/boarding-houses/house-test', 'PUT', body, users[0].cookie)
  assert.equal(created.status, 200)
  assert.equal(created.data.house.ownerId, users[0].data.user.id)
  assert.equal((await request('/api/boarding-houses/house-test', 'PUT', body, users[1].cookie)).status, 403)
  assert.equal((await request('/api/boarding-houses/house-test', 'DELETE', undefined, users[1].cookie)).status, 403)
  for (const bad of [{ ...body, rooms: -1 }, { ...body, latitude: 91 }, { ...body, images: ['javascript:alert(1)'] }]) {
    assert.equal((await request('/api/boarding-houses/bad-house', 'PUT', bad, users[0].cookie)).status, 400)
  }
  const afterRestart = await start()
  assert.equal((await afterRestart('/api/boarding-houses')).data.houses[0].name, body.name)
  assert.equal((await request('/api/boarding-houses/house-test', 'PUT', { ...body, name: 'Tên đã sửa' }, users[0].cookie)).status, 200)
  assert.equal((await request('/api/boarding-houses', 'GET', undefined, users[2].cookie)).data.houses[0].name, 'Tên đã sửa')
  assert.equal((await request('/api/boarding-houses/house-test', 'DELETE', undefined, users[0].cookie)).status, 200)
  assert.deepEqual((await request('/api/boarding-houses')).data.houses, [])
})
