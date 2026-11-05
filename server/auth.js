import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const defaultUsersFile = fileURLToPath(new URL('../data/users.json', import.meta.url))
const cookieName = 'findmyroom_session'
const sessionDuration = 8 * 60 * 60 * 1000

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = await scrypt(password, salt, 64)
  return `scrypt:${salt}:${hash.toString('hex')}`
}

async function matchesPassword(password, stored) {
  const [algorithm, salt, hash] = String(stored).split(':')
  if (algorithm !== 'scrypt' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hash)) return false
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(hash, 'hex'))
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role }
}

function fail(status, message, field) {
  return Object.assign(new Error(message), { status, field })
}

function accountFields(body, registration = false) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  if (!name || name.length > 100) throw fail(400, 'Họ và tên cần từ 1 đến 100 ký tự.', 'name')
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) throw fail(400, 'Email chưa đúng định dạng.', 'email')
  if (!/^(03|05|07|08|09)\d{8}$/.test(phone)) throw fail(400, 'Nhập số điện thoại Việt Nam gồm 10 chữ số.', 'phone')
  if (registration) {
    if (!['student', 'landlord'].includes(body.role)) throw fail(400, 'Vai trò không hợp lệ.', 'role')
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) throw fail(400, 'Mật khẩu cần từ 8 đến 128 ký tự.', 'password')
    if (body.terms !== true) throw fail(400, 'Bạn cần đồng ý điều khoản để tiếp tục.', 'terms')
  }
  return { name, email, phone }
}

async function readBody(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Yêu cầu cần dùng dữ liệu JSON.')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > 10_240) throw fail(413, 'Dữ liệu gửi lên quá lớn.')
    chunks.push(chunk)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error()
    return parsed
  } catch { throw fail(400, 'Dữ liệu JSON không hợp lệ.') }
}

export function createAuthMiddleware({ usersFile = defaultUsersFile } = {}) {
  const sessions = new Map()
  let writes = Promise.resolve()

  async function readUsers() {
    const data = JSON.parse(await readFile(usersFile, 'utf8'))
    if (!Array.isArray(data.users)) throw new Error('Invalid users file')
    return data
  }

  function updateUsers(change) {
    const task = writes.then(async () => {
      const data = await readUsers()
      const result = await change(data.users)
      const temporaryFile = `${usersFile}.${randomUUID()}.tmp`
      await mkdir(dirname(usersFile), { recursive: true })
      await writeFile(temporaryFile, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
      await rename(temporaryFile, usersFile)
      return result
    })
    writes = task.catch(() => {})
    return task
  }

  function sessionId(req) {
    return req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1)
  }

  function setCookie(req, res, token, expired = false) {
    res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expired ? 0 : sessionDuration / 1000}${req.socket.encrypted ? '; Secure' : ''}`)
  }

  function startSession(req, res, user) {
    const now = Date.now()
    for (const [key, session] of sessions) if (session.expiresAt <= now) sessions.delete(key)
    sessions.delete(sessionId(req))
    const token = randomBytes(32).toString('hex')
    sessions.set(token, { userId: user.id, expiresAt: now + sessionDuration })
    setCookie(req, res, token)
    return { user: publicUser(user) }
  }

  async function currentUser(req) {
    const token = sessionId(req)
    const session = sessions.get(token)
    if (!session) return null
    if (session.expiresAt <= Date.now()) { sessions.delete(token); return null }
    const { users } = await readUsers()
    return users.find(user => user.id === session.userId) || null
  }

  return async (req, res, next) => {
    const path = new URL(req.url, 'http://localhost').pathname
    if (!path.startsWith('/api/auth/')) return next()
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    try {
      if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw fail(403, 'Nguồn yêu cầu không hợp lệ.')
      if (path === '/api/auth/session' && req.method === 'GET') {
        const user = await currentUser(req)
        return reply(200, { user: user ? publicUser(user) : null })
      }
      if (path === '/api/auth/logout' && req.method === 'POST') {
        sessions.delete(sessionId(req))
        setCookie(req, res, '', true)
        return reply(200, { user: null })
      }
      if (path === '/api/auth/register' && req.method === 'POST') {
        const body = await readBody(req)
        const fields = accountFields(body, true)
        const passwordHash = await hashPassword(body.password)
        const user = await updateUsers(users => {
          if (users.some(user => user.email.toLowerCase() === fields.email)) throw fail(409, 'Email này đã được đăng ký.', 'email')
          const user = { id: randomUUID(), ...fields, role: body.role, passwordHash, createdAt: new Date().toISOString() }
          users.push(user)
          return user
        })
        return reply(201, startSession(req, res, user))
      }
      if (path === '/api/auth/login' && req.method === 'POST') {
        const body = await readBody(req)
        if (typeof body.email !== 'string' || typeof body.password !== 'string' || body.password.length > 128) throw fail(400, 'Vui lòng nhập email và mật khẩu hợp lệ.')
        const { users } = await readUsers()
        const user = users.find(user => user.email.toLowerCase() === body.email.trim().toLowerCase())
        if (!user || !await matchesPassword(body.password, user.passwordHash)) throw fail(401, 'Email hoặc mật khẩu không đúng.')
        return reply(200, startSession(req, res, user))
      }
      if (path === '/api/auth/profile' && req.method === 'PATCH') {
        const user = await currentUser(req)
        if (!user) throw fail(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
        const body = await readBody(req)
        const fields = accountFields(body)
        const role = body.role && ['student', 'landlord'].includes(body.role) ? body.role : undefined
        const updated = await updateUsers(users => {
          if (users.some(other => other.id !== user.id && other.email.toLowerCase() === fields.email)) throw fail(409, 'Email này đã được đăng ký.', 'email')
          const stored = users.find(other => other.id === user.id)
          if (!stored) throw fail(401, 'Tài khoản không còn tồn tại.')
          return Object.assign(stored, fields, role ? { role } : {})
        })
        return reply(200, { user: publicUser(updated) })
      }
      reply(404, { message: 'Không tìm thấy API.' })
    } catch (error) {
      reply(error.status || 503, { message: error.status ? error.message : 'Không đọc hoặc ghi được dữ liệu tài khoản. Kiểm tra file data/users.json.', ...(error.field ? { field: error.field } : {}) })
    }
  }
}

export function jsonAuthPlugin() {
  const install = server => { server.middlewares.use(createAuthMiddleware({ usersFile: process.env.AUTH_USERS_FILE || defaultUsersFile })) }
  return { name: 'findmyroom-json-auth', configureServer: install, configurePreviewServer: install }
}
