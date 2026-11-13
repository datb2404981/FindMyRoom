import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { reviewStore, houseAliases } from './reviews.js'
import { roommateStore } from './roommates.js'
import { jsonCollection, houseFields, rentalFields } from './json-collection.js'

const scrypt = promisify(scryptCallback)
const defaultAccountsFile = fileURLToPath(new URL('../data/account.json', import.meta.url))
const defaultReviewsFile = fileURLToPath(new URL('../data/review.json', import.meta.url))
const defaultHousesFile = fileURLToPath(new URL('../data/boarding_house.json', import.meta.url))
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

const defaultRentalFile = fileURLToPath(new URL('../data/room_post.json', import.meta.url))
export function createAuthMiddleware({
  accountsFile = defaultAccountsFile, reviewsFile = defaultReviewsFile, reviewImagesFile = join(dirname(reviewsFile), 'review_image.json'), housesFile = defaultHousesFile,
  houseImagesFile = housesFile === defaultHousesFile ? fileURLToPath(new URL('../data/boarding_house_image.json', import.meta.url)) : housesFile.replace(/\.json$/, '-images.json'),
  rentalsFile = defaultRentalFile,
  rentalImagesFile = rentalsFile === defaultRentalFile ? fileURLToPath(new URL('../data/room_post_image.json', import.meta.url)) : rentalsFile.replace(/\.json$/, '-images.json'),
  rentalAmenitiesFile = rentalsFile === defaultRentalFile ? fileURLToPath(new URL('../data/room_post_amenity.json', import.meta.url)) : rentalsFile.replace(/\.json$/, '-amenities.json'),
  catalogFile = join(dirname(rentalsFile), 'amenity.json'),
  roommatesFile = join(dirname(rentalsFile), 'roommate_post.json'),
  roommateImagesFile = join(dirname(rentalsFile), 'roommate_post_image.json'),
  roommateAmenitiesFile = join(dirname(rentalsFile), 'roommate_post_amenity.json'),
  studentsFile = join(dirname(rentalsFile), 'student_profile.json'),
} = {}) {
  const sessions = new Map()
  let writes = Promise.resolve()
  const reviewsData = reviewStore({ file: reviewsFile, imagesFile: reviewImagesFile, studentsFile })
  const housesData = jsonCollection(housesFile, houseImagesFile, houseFields, 'house_image_id')
  const rentalsData = jsonCollection(rentalsFile, rentalImagesFile, rentalFields, 'room_post_image_id', { linksFile: rentalAmenitiesFile, catalogFile })
  const roommatesData = roommateStore({ file: roommatesFile, imagesFile: roommateImagesFile, linksFile: roommateAmenitiesFile, catalogFile, studentsFile, universitiesFile: fileURLToPath(new URL('../data/university.json', import.meta.url)) })
  const readHouses = async () => (await housesData.read()).map(house => {
    const parts = (house.address || '').split(',').map(part => part.trim())
    return { ...house, desc: house.rules || '', city: parts.at(-1) || '', ward: parts.length > 2 ? parts.at(-2) : '', street: parts.slice(0, -2).join(', ') || house.address, rooms: 0, status: '\u0110ang ho\u1ea1t \u0111\u1ed9ng' }
  })
  const updateHouses = housesData.update
  const rentalOwner = (post, houses) => houses.find(house => house.id === post.houseId)?.ownerId
  const readRentals = async () => {
    const houses = await readHouses()
    return (await rentalsData.read()).map(post => ({ ...post, ownerId: rentalOwner(post, houses), count: post.status === '\u0048\u1ebft ph\u00f2ng' ? 0 : 1 }))
  }
  const updateRentals = async change => {
    const houses = await readHouses()
    return rentalsData.update(posts => {
      for (const post of posts) post.ownerId = rentalOwner(post, houses)
      return change(posts)
    })
  }

  async function readAccounts() {
    const rows = JSON.parse(await readFile(accountsFile, 'utf8'))
    if (!Array.isArray(rows)) throw new Error('Invalid account file')
    return rows
  }
  const asUser = row => ({ id: row.account_id, name: row.full_name, email: row.email,
    phone: row.phone, role: row.role, passwordHash: row.password, createdAt: row.created_at, isActive: row.is_active !== false && row.is_active !== 0 })
  async function readUsers() { return { users: (await readAccounts()).map(asUser) } }

  function updateUsers(change) {
    const task = writes.then(async () => {
      const rows = await readAccounts(), users = rows.map(asUser)
      const result = await change(users)
      const accounts = users.map(user => {
        const existing = rows.find(row => row.account_id === user.id)
        return { account_id: user.id, full_name: user.name, email: user.email, password: user.passwordHash,
          phone: user.phone, avatar_url: existing?.avatar_url || null, role: user.role,
          zalo_phone: existing?.zalo_phone ?? user.phone, zalo_url: existing?.zalo_url ?? null,
          is_active: existing?.is_active ?? true, provider: existing?.provider || 'local', created_at: user.createdAt }
      })
      const temporaryFile = `${accountsFile}.${randomUUID()}.tmp`
      await mkdir(dirname(accountsFile), { recursive: true })
      await writeFile(temporaryFile, JSON.stringify(accounts, null, 2) + '\n', { mode: 0o600 })
      await rename(temporaryFile, accountsFile)
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
    return users.find(user => user.id === session.userId && user.isActive) || null
  }

  return async (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    const path = url.pathname
    if (path !== '/api/roommates' && !path.startsWith('/api/roommates/') && path !== '/api/rentals' && !path.startsWith('/api/rentals/') && !path.startsWith('/api/auth/') && path !== '/api/house-reviews' && path !== '/api/boarding-houses' && !path.startsWith('/api/boarding-houses/')) return next()
    const reply = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    try {
      if (req.method !== 'GET' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) throw fail(403, 'Nguồn yêu cầu không hợp lệ.')
      if (path === '/api/boarding-houses' && req.method === 'GET') {
        const { users } = await readUsers()
        const owners = new Set(users.filter(user => user.role === 'landlord').map(user => user.id))
        return reply(200, { houses: (await readHouses()).filter(house => owners.has(house.ownerId)) })
      }
      if (path.startsWith('/api/boarding-houses/') && ['PUT', 'DELETE'].includes(req.method)) {
        const user = await currentUser(req)
        if (!user) throw fail(401, 'Vui lòng đăng nhập.')
        if (user.role !== 'landlord') throw fail(403, 'Chỉ chủ trọ được quản lý nhà trọ.')
        const id = path.slice('/api/boarding-houses/'.length)
        if (!/^[\w-]{1,100}$/.test(id)) throw fail(400, 'Mã nhà trọ không hợp lệ.')
        if (req.method === 'DELETE') {
          if ((await readRentals()).some(post => post.houseId === id)) throw fail(409, 'Nhà trọ đang có bài đăng liên quan.')
          await updateHouses(houses => {
            const index = houses.findIndex(house => house.id === id)
            if (index < 0) throw fail(404, 'Không tìm thấy nhà trọ.')
            if (houses[index].ownerId !== user.id) throw fail(403, 'Bạn không có quyền xóa nhà trọ này.')
            houses.splice(index, 1)
          })
          return reply(200, { deleted: id })
        }
        const body = await readBody(req, 70 * 1024 * 1024)
        for (const [field, limit] of [['name', 100], ['address', 500]]) {
          if (typeof body[field] !== 'string' || !body[field].trim() || body[field].length > limit) throw fail(400, 'Tên và địa chỉ nhà trọ không hợp lệ.')
        }
        const house = { id, ownerId: user.id, name: body.name.trim(), address: body.address.trim() }
        for (const field of ['desc', 'rules', 'city', 'ward', 'street', 'nearby']) {
          if (body[field] != null && (typeof body[field] !== 'string' || body[field].length > 5000)) throw fail(400, 'Thông tin nhà trọ không hợp lệ.')
          house[field] = body[field] || ''
        }
        house.rules ||= body.desc || ''
        house.status = body.status === 'Ẩn' ? 'Ẩn' : 'Đang hoạt động'
        house.rooms = body.rooms == null ? 0 : Number(body.rooms)
        if (!Number.isInteger(house.rooms) || house.rooms < 0) throw fail(400, 'Số phòng không hợp lệ.')
        for (const [field, limit] of [['latitude', 90], ['longitude', 180]]) {
          house[field] = body[field] == null ? null : Number(body[field])
          if (house[field] != null && (!Number.isFinite(house[field]) || Math.abs(house[field]) > limit)) throw fail(400, 'Tọa độ không hợp lệ.')
        }
        const photos = body.images || (body.image ? [body.image] : [])
        if (!Array.isArray(photos) || photos.length > 10) throw fail(400, 'Chỉ được lưu tối đa 10 ảnh.')
        house.images = photos.map(photo => {
          if (typeof photo !== 'string') throw fail(400, 'Ảnh nhà trọ không hợp lệ.')
          if (/^https?:\/\/[^\s]+$/.test(photo) || /^\/(?!\/)[\w/.-]+$/.test(photo)) {
            if (photo.length > 2000) throw fail(400, 'URL ảnh quá dài.')
            return photo
          }
          const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo)
          if (!match || Buffer.byteLength(match[2], 'base64') > 5 * 1024 * 1024) throw fail(400, 'Ảnh nhà trọ phải là JPG, PNG, WEBP tối đa 5 MB.')
          return photo
        })
        house.image = house.images[0] || '/illustrations/room-1.svg'
        await updateHouses(houses => {
          const index = houses.findIndex(item => item.id === id)
          if (index >= 0 && houses[index].ownerId !== user.id) throw fail(403, 'Bạn không có quyền sửa nhà trọ này.')
          if (index >= 0) houses[index] = house
          else houses.push(house)
        })
        return reply(200, { house })
      }
      if (path === '/api/roommates' && req.method === 'GET') {
        const user = await currentUser(req), { users } = await readUsers()
        const posts = await roommatesData.read(await readHouses(), users)
        return reply(200, { posts: posts.filter(post => post.status !== '\u1ea8n' || post.ownerId === user?.id) })
      }
      if (path.startsWith('/api/roommates/') && ['PUT', 'DELETE'].includes(req.method)) {
        const user = await currentUser(req), id = path.slice('/api/roommates/'.length)
        if (!/^[\w-]{1,100}$/.test(id)) throw fail(400, 'Mã bài đăng không hợp lệ.')
        if (req.method === 'DELETE') { await roommatesData.remove(id, user); return reply(200, { deleted: id }) }
        const post = await roommatesData.save(id, await readBody(req, 70 * 1024 * 1024), user, await readHouses())
        return reply(200, { post })
      }
      if (path === '/api/rentals' && req.method === 'GET') {
        const user = await currentUser(req)
        const houses = await readHouses(), { users } = await readUsers()
        const posts = (await readRentals()).filter(post => users.some(user => user.id === post.ownerId && user.role === 'landlord' && !/^ACC\d+$/.test(user.id)) && houses.some(house => house.id === post.houseId && house.ownerId === post.ownerId))
          .filter(post => ['Còn phòng', 'Hết phòng'].includes(post.status) || post.ownerId === user?.id)
          .map(post => {
            const house = houses.find(house => house.id === post.houseId), owner = users.find(owner => owner.id === post.ownerId)
            return { ...post, kind: 'rental', house: house.name, rules: house.rules || '', address: [post.street, post.ward, post.city].filter(Boolean).join(', ') || house.address,
              district: post.ward || house.ward, owner: owner?.name || '', phone: owner?.phone || '', email: owner?.email || '' }
          })
        return reply(200, { posts })
      }
      if (path.startsWith('/api/rentals/') && ['PUT', 'DELETE'].includes(req.method)) {
        const user = await currentUser(req)
        if (!user) throw fail(401, 'Vui lòng đăng nhập.')
        if (user.role !== 'landlord') throw fail(403, 'Chỉ chủ trọ được quản lý bài đăng cho thuê.')
        const id = path.slice('/api/rentals/'.length)
        if (!/^[\w-]{1,100}$/.test(id)) throw fail(400, 'Mã bài đăng không hợp lệ.')
        if (req.method === 'DELETE') {
          await updateRentals(posts => {
            const index = posts.findIndex(post => post.id === id)
            if (index < 0) throw fail(404, 'Không tìm thấy bài đăng.')
            if (posts[index].ownerId !== user.id) throw fail(403, 'Bạn không có quyền xóa bài đăng này.')
            posts.splice(index, 1)
          })
          return reply(200, { deleted: id })
        }
        const body = await readBody(req, 70 * 1024 * 1024)
        const house = (await readHouses()).find(house => house.id === body.houseId && house.ownerId === user.id)
        if (!house) throw fail(400, 'Vui lòng chọn nhà trọ đã tạo trong tài khoản của bạn.')
        if (!['Còn phòng', 'Hết phòng', 'Ẩn'].includes(body.status)) throw fail(400, 'Trạng thái bài đăng không hợp lệ.')
        const post = { id, ownerId: user.id, houseId: house.id, status: body.status, postedAt: body.postedAt || new Date().toISOString() }
        for (const field of ['title', 'desc', 'curfew', 'other', 'city', 'ward', 'street']) {
          if (body[field] != null && (typeof body[field] !== 'string' || body[field].length > 10000)) throw fail(400, 'Thông tin bài đăng không hợp lệ.')
          post[field] = body[field] || ''
        }
        if (!post.title.trim()) throw fail(400, 'Vui lòng nhập tiêu đề bài đăng.')
        for (const field of ['price', 'area', 'people', 'count', 'electric', 'water', 'internet', 'deposit']) {
          post[field] = Number(body[field] || 0)
          if (!Number.isFinite(post[field]) || post[field] < 0 || (['price', 'area', 'people'].includes(field) && post[field] === 0) || (['people', 'count'].includes(field) && !Number.isInteger(post[field]))) throw fail(400, 'Giá, diện tích và số lượng không hợp lệ.')
        }
        for (const [field, limit] of [['latitude', 90], ['longitude', 180]]) {
          post[field] = body[field] == null ? null : Number(body[field])
          if (post[field] != null && (!Number.isFinite(post[field]) || Math.abs(post[field]) > limit)) throw fail(400, 'Tọa độ không hợp lệ.')
        }
        for (const field of ['amenities', 'nearby', 'lifestyles']) {
          post[field] = body[field] || []
          if (!Array.isArray(post[field]) || post[field].length > 50 || post[field].some(value => typeof value !== 'string' || value.length > 200)) throw fail(400, 'Tiện ích không hợp lệ.')
        }
        post.images = body.images || []
        if (!Array.isArray(post.images) || !post.images.length || post.images.length > 10) throw fail(400, 'Bài đăng cần từ 1 đến 10 ảnh.')
        for (const photo of post.images) {
          if (typeof photo !== 'string') throw fail(400, 'Ảnh không hợp lệ.')
          const data = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo)
          if (!(data && Buffer.byteLength(data[2], 'base64') <= 5 * 1024 * 1024) && !(photo.length <= 2000 && (/^https?:\/\/[^\s]+$/.test(photo) || /^\/(?!\/)[\w/.-]+$/.test(photo)))) throw fail(400, 'Ảnh phải là JPG, PNG, WEBP tối đa 5 MB.')
        }
        await updateRentals(posts => {
          const index = posts.findIndex(item => item.id === id)
          if (index >= 0 && posts[index].ownerId !== user.id) throw fail(403, 'Bạn không có quyền sửa bài đăng này.')
          if (index >= 0) { post.postedAt = posts[index].postedAt; posts[index] = post } else posts.push(post)
        })
        return reply(200, { post: { ...post, kind: 'rental', house: house.name, image: post.images[0] } })
      }
      if (path === '/api/house-reviews' && req.method === 'GET') {
        let houseId = url.searchParams.get('houseId')
        if (!houseId || !/^[\w-]{1,160}$/.test(houseId)) throw fail(400, 'Mã nhà trọ không hợp lệ.')
        const houses = await readHouses()
        if (!houses.some(house => house.id === houseId)) houseId = houseAliases[houseId] || houseId
        const { users } = await readUsers()
        return reply(200, { reviews: await reviewsData.read(houseId, users) })
      }
      if (path === '/api/house-reviews' && req.method === 'POST') {
        const user = await currentUser(req)
        if (!user) throw fail(401, 'Vui lòng đăng nhập để bình luận.')
        if (user.role !== 'student') throw fail(403, 'Chỉ sinh viên mới có thể gửi đánh giá nhà trọ.')
        const body = await readBody(req, 70 * 1024 * 1024)

        if (typeof body.houseId !== 'string' || !/^[\w-]{1,160}$/.test(body.houseId)) throw fail(400, 'Mã nhà trọ không hợp lệ.')
        const content = typeof body.content === 'string' ? body.content.trim() : ''
        if (!content || content.length > 1000) throw fail(400, 'Bình luận cần từ 1 đến 1000 ký tự.')
        if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) throw fail(400, 'Vui lòng chọn từ 1 đến 5 sao.')
        const houses = await readHouses()
        const houseId = houses.some(house => house.id === body.houseId) ? body.houseId : houseAliases[body.houseId] || body.houseId
        if (!houses.some(house => house.id === houseId)) throw fail(400, 'Nhà trọ không tồn tại.')
        const images = body.images ?? (body.image ? [body.image] : [])
        if (!Array.isArray(images) || images.length > 10) throw fail(400, 'Chỉ được đính kèm tối đa 10 ảnh.')
        for (const image of images) {
          if (typeof image !== 'string') throw fail(400, 'Ảnh không hợp lệ.')
          const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)
          if (!match) throw fail(400, 'Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP.')
          const bytes = Buffer.from(match[2], 'base64')
          const valid = match[1] === 'jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
          if (!valid || bytes.length > 5 * 1024 * 1024) throw fail(400, 'Ảnh không hợp lệ hoặc lớn hơn 5 MB.')
        }
        const review = await reviewsData.add({ houseId, content, rating: body.rating, images }, user)
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
        if (!user || !user.isActive || !await matchesPassword(body.password, user.passwordHash)) throw fail(401, 'Email hoặc mật khẩu không đúng.')
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
      reply(error.status || 503, { message: error.status ? error.message : (path.startsWith('/api/boarding-houses') || path.startsWith('/api/rentals') || path.startsWith('/api/roommates')) ? 'Không đọc hoặc lưu được dữ liệu nhà trọ. Vui lòng thử lại.' : path === '/api/house-reviews' ? 'Không thể đọc hoặc lưu bình luận. Vui lòng thử lại.' : 'Không đọc hoặc ghi được dữ liệu tài khoản. Kiểm tra file data/account.json.', ...(error.field ? { field: error.field } : {}) })
    }
  }
}

async function readUsersForBuild() { return JSON.parse(await readFile(defaultAccountsFile, 'utf8')).filter(account => !/^ACC\d+$/.test(account.account_id)).map(account => ({ id: account.account_id })) }

export function jsonAuthPlugin() {
  const install = server => { server.middlewares.use(createAuthMiddleware({ accountsFile: process.env.AUTH_ACCOUNTS_FILE || defaultAccountsFile, reviewsFile: process.env.HOUSE_REVIEWS_FILE || defaultReviewsFile, reviewImagesFile: process.env.REVIEW_IMAGES_FILE || join(dirname(process.env.HOUSE_REVIEWS_FILE || defaultReviewsFile), 'review_image.json'), housesFile: process.env.MANAGED_HOUSES_FILE || defaultHousesFile, houseImagesFile: process.env.HOUSE_IMAGES_FILE || fileURLToPath(new URL('../data/boarding_house_image.json', import.meta.url)), rentalsFile: process.env.RENTALS_FILE || fileURLToPath(new URL('../data/room_post.json', import.meta.url)), rentalImagesFile: process.env.RENTAL_IMAGES_FILE || fileURLToPath(new URL('../data/room_post_image.json', import.meta.url)), rentalAmenitiesFile: process.env.RENTAL_AMENITIES_FILE || fileURLToPath(new URL('../data/room_post_amenity.json', import.meta.url)), catalogFile: process.env.AMENITY_FILE || fileURLToPath(new URL('../data/amenity.json', import.meta.url)) })) }
  return { name: 'findmyroom-json-auth', enforce: 'pre', configureServer: install, configurePreviewServer: install,
    resolveId(id) { if (id === 'virtual:public-accounts') return '\0public-accounts' },
    async load(id) {
      if (id !== '\0public-accounts') return
      const accounts = JSON.parse(await readFile(defaultAccountsFile, 'utf8'))
      const profiles = accounts.filter(account => /^ACC\d+$/.test(account.account_id)).map(({ password, ...profile }) => profile)
      return 'export default ' + JSON.stringify(profiles)
    },
    async transform(code, id) {
      const file = id.replaceAll('\\', '/')
      const name = file.split('/').at(-1)
      const parents = { boarding_house: 'boarding_house_id', room_post: 'room_post_id', roommate_post: 'roommate_post_id', student_profile: 'student_code', review: 'review_id' }
      const base = name?.replace(/_(image|amenity)\.json$/, '.json').replace(/\.json$/, '')
      if (!file.includes('/data/') || !parents[base]) return
      const owners = new Set((await readUsersForBuild()).map(user => user.id))
      const houses = JSON.parse(await readFile(defaultHousesFile, 'utf8'))
      const students = JSON.parse(await readFile(new URL('../data/student_profile.json', import.meta.url), 'utf8'))
      const houseIds = new Set(houses.filter(row => owners.has(row.account_id)).map(row => row.boarding_house_id))
      const studentCodes = new Set(students.filter(row => owners.has(row.account_id)).map(row => row.student_code))
      const records = JSON.parse(await readFile(new URL('../data/' + base + '.json', import.meta.url), 'utf8'))
      const privateIds = new Set(records.filter(row => base === 'boarding_house' || base === 'student_profile' ? owners.has(row.account_id) : base === 'room_post' ? houseIds.has(row.boarding_house_id) : studentCodes.has(row.student_code)).map(row => row[parents[base]]))
      return { code: JSON.stringify(JSON.parse(code).filter(row => !privateIds.has(row[parents[base]]))), map: null }
    },
    // API writes must not reload the form while a save is in progress.
    handleHotUpdate(context) {
      const file = context.file.replaceAll('\\', '/')
      if (/\/data\/(boarding_house|room_post|roommate_post|student_profile|review|amenity)(_(image|amenity))?\.json$/.test(file)) return []
    },
  }
}
