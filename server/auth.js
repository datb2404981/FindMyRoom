import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const defaultUsersFile = fileURLToPath(new URL('../data/users.json', import.meta.url))
const defaultReviewsFile = fileURLToPath(new URL('../data/house-reviews.json', import.meta.url))
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

async function readBody(req, maxBytes = 10_240) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw fail(415, 'Yêu cầu cần dùng dữ liệu JSON.')
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw fail(413, 'Dữ liệu gửi lên quá lớn.')
    chunks.push(chunk)
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error()
    return parsed
  } catch { throw fail(400, 'Dữ liệu JSON không hợp lệ.') }
}

export function createAuthMiddleware({ usersFile = defaultUsersFile, reviewsFile = defaultReviewsFile } = {}) {
  const sessions = new Map()
  let writes = Promise.resolve()
  let reviewWrites = Promise.resolve()

  async function readReviews() {
    try {
      const reviews = JSON.parse(await readFile(reviewsFile, 'utf8'))
      if (!Array.isArray(reviews)) throw new Error('Invalid reviews file')
      return reviews
    } catch (error) {
      if (error.code === 'ENOENT') return []
      throw error
    }
  }

  function addReview(review) {
    const task = reviewWrites.then(async () => {
      const reviews = await readReviews()
      reviews.push(review)
      const temporaryFile = `${reviewsFile}.${randomUUID()}.tmp`
      await mkdir(dirname(reviewsFile), { recursive: true })
      await writeFile(temporaryFile, JSON.stringify(reviews, null, 2) + '\n', { mode: 0o600 })
      await rename(temporaryFile, reviewsFile)
    })
    reviewWrites = task.catch(() => {})
    return task
  }

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
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    if (!path.startsWith('/api/auth/') && path !== '/api/house-reviews') return next()
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    try {
      if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw fail(403, 'Nguồn yêu cầu không hợp lệ.')
      if (path === '/api/house-reviews' && req.method === 'GET') {
        const houseId = url.searchParams.get('houseId')
        if (!houseId || !/^[\w-]{1,160}$/.test(houseId)) throw fail(400, 'Mã nhà trọ không hợp lệ.')
        return reply(200, { reviews: (await readReviews()).filter(review => review.houseId === houseId).reverse() })
      }
      if (path === '/api/house-reviews' && req.method === 'POST') {
        const user = await currentUser(req)
        if (!user) throw fail(401, 'Vui lòng đăng nhập để bình luận.')
        const body = await readBody(req, 1_500_000)
        if (typeof body.houseId !== 'string' || !/^[\w-]{1,160}$/.test(body.houseId)) throw fail(400, 'Mã nhà trọ không hợp lệ.')
        const content = typeof body.content === 'string' ? body.content.trim() : ''
        if (!content || content.length > 1000) throw fail(400, 'Bình luận cần từ 1 đến 1000 ký tự.')
        if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) throw fail(400, 'Vui lòng chọn từ 1 đến 5 sao.')
        let image = ''
        if (body.image) {
          if (typeof body.image !== 'string') throw fail(400, 'Ảnh không hợp lệ.')
          const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.image)
          if (!match) throw fail(400, 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.')
          const bytes = Buffer.from(match[2], 'base64')
          const valid = match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
          if (!valid || bytes.length > 1_000_000) throw fail(400, 'Ảnh không hợp lệ hoặc lớn hơn 1 MB.')
          image = body.image
        }
        const review = { id: randomUUID(), houseId: body.houseId, author: user.name, content, rating: body.rating, ...(image ? { images: [image] } : {}), createdAt: new Date().toISOString() }
        await addReview(review)
        return reply(201, { review })
      }
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
      reply(error.status || 503, { message: error.status ? error.message : path === '/api/house-reviews' ? 'Không thể đọc hoặc lưu bình luận. Vui lòng thử lại.' : 'Không đọc hoặc ghi được dữ liệu tài khoản. Kiểm tra file data/users.json.', ...(error.field ? { field: error.field } : {}) })
    }
  }
}

export function jsonAuthPlugin() {
  const install = server => { server.middlewares.use(createAuthMiddleware({ usersFile: process.env.AUTH_USERS_FILE || defaultUsersFile, reviewsFile: process.env.HOUSE_REVIEWS_FILE || defaultReviewsFile })) }
  return { name: 'findmyroom-json-auth', configureServer: install, configurePreviewServer: install }
}
