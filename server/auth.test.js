import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, copyFile, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createAuthMiddleware } from './auth.js'

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'findmyroom-api-'))
  const usersFile = join(directory, 'users.json')
  await copyFile(new URL('../data/users.json', import.meta.url), usersFile)
  const servers = []
  t.after(async () => {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
    await rm(directory, { recursive: true, force: true })
  })
  function start() {
    const middleware = createAuthMiddleware({ usersFile })
    const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
    servers.push(server)
    return (async () => {
      server.listen(0, '127.0.0.1')
      await once(server, 'listening')
      return async (path, body, options = {}) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
          method: body ? 'POST' : 'GET',
          ...options,
          headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
          ...(body ? { body: JSON.stringify(body) } : {}),
        })
        return { status: response.status, cookie: response.headers.get('set-cookie'), data: await response.json() }
      }
    })()
  }
  return { usersFile, start, request: await start() }
}

const account = { name: 'Lê Thảo Nguyên', email: 'new@example.com', phone: '0912345678', role: 'student', password: 'testpass123', terms: true }

test('registration writes a password hash to JSON and works after a new server starts', async t => {
  const { request, usersFile, start } = await fixture(t)
  const result = await request('register', account)
  assert.equal(result.status, 201)
  assert.equal(result.data.user.name, account.name)
  assert.equal('passwordHash' in result.data.user, false)
  assert.match(result.cookie, /HttpOnly; SameSite=Lax/)
  const contents = await readFile(usersFile, 'utf8')
  const stored = JSON.parse(contents).users.find(user => user.email === account.email)
  assert.match(stored.passwordHash, /^scrypt:/)
  assert.equal(contents.includes(account.password), false)
  const restarted = await start()
  assert.equal((await restarted('login', { email: ' NEW@EXAMPLE.COM ', password: account.password })).status, 200)
  assert.equal((await restarted('register', account)).status, 409)
})

test('login rejects wrong credentials, uses stored roles, and logout invalidates the server session', async t => {
  const { request } = await fixture(t)
  assert.equal((await request('login', { email: 'sinhvien@example.com', password: 'incorrect123' })).status, 401)
  assert.equal((await request('login', { email: 'missing@example.com', password: 'demopass123' })).status, 401)
  const result = await request('login', { email: 'sinhvien@example.com', password: 'demopass123', role: 'landlord' })
  assert.equal(result.data.user.role, 'student')
  const headers = { Cookie: result.cookie.split(';')[0] }
  assert.equal((await request('session', undefined, { headers })).data.user.email, 'sinhvien@example.com')
  assert.equal((await request('logout', {}, { headers })).status, 200)
  assert.equal((await request('session', undefined, { headers })).data.user, null)
  assert.equal((await request('profile', account, { method: 'PATCH', headers })).status, 401)
})

test('concurrent signups cannot overwrite another registration or duplicate an email', async t => {
  const { request, usersFile } = await fixture(t)
  const results = await Promise.all([
    request('register', account),
    request('register', { ...account, email: 'NEW@EXAMPLE.COM' }),
    request('register', { ...account, email: 'another@example.com', role: 'landlord' }),
  ])
  assert.deepEqual(results.map(result => result.status).sort(), [201, 201, 409])
  const { users } = JSON.parse(await readFile(usersFile, 'utf8'))
  assert.equal(users.filter(user => user.email === account.email).length, 1)
  assert.equal(users.filter(user => user.email === 'another@example.com').length, 1)
})

test('API validates registration, blocks foreign origins, and does not overwrite malformed JSON', async t => {
  const { request, usersFile } = await fixture(t)
  for (const changes of [{ role: 'admin' }, { terms: false }, { password: 'short' }, { phone: '123' }]) {
    assert.equal((await request('register', { ...account, ...changes })).status, 400)
  }
  assert.equal((await request('register', account, { headers: { Origin: 'https://foreign.example' } })).status, 403)
  await writeFile(usersFile, '{broken')
  assert.equal((await request('register', account)).status, 503)
  assert.equal(await readFile(usersFile, 'utf8'), '{broken')
})
