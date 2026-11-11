import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createAuthMiddleware } from './auth.js'

test('house directory persists landlord houses and enforces ownership', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'findmyroom-houses-api-'))
  const accountsFile = join(directory, 'account.json'), housesFile = join(directory, 'houses.json')
  const rentalsFile = join(directory, 'rentals.json')
  const seed = { boarding_house_id: 'seed-house', house_name: 'Seed house', account_id: 'seed-owner', house_address: null, house_latitude: null, house_longitude: null, rules: null }
  await writeFile(housesFile, JSON.stringify([seed]))
  await writeFile(accountsFile, JSON.stringify([]))
  const servers = []
  t.after(async () => {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
    await rm(directory, { recursive: true, force: true })
  })
  async function start() {
    const middleware = createAuthMiddleware({ accountsFile, housesFile, rentalsFile })
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
  for (const [i, role] of ['landlord', 'landlord', 'student', 'student'].entries()) {
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
  const rental = { title: 'New rental', houseId: 'house-test', status: 'Còn phòng', price: 2000000, area: 25, people: 2, count: 3, images: ['/illustrations/room-1.svg'], amenities: ['Wifi'], ownerId: users[1].data.user.id }
  assert.equal((await request('/api/rentals/new-rental', 'PUT', rental)).status, 401)
  assert.equal((await request('/api/rentals/new-rental', 'PUT', rental, users[2].cookie)).status, 403)
  assert.equal((await request('/api/rentals/new-rental', 'PUT', rental, users[1].cookie)).status, 400)
  const savedRental = await request('/api/rentals/new-rental', 'PUT', rental, users[0].cookie)
  assert.equal(savedRental.status, 200)
  assert.equal(savedRental.data.post.ownerId, users[0].data.user.id)
  const rawHouses = JSON.parse(await readFile(housesFile, 'utf8'))
  assert.deepEqual(rawHouses.find(house => house.boarding_house_id === seed.boarding_house_id), seed)
  assert.equal(rawHouses.find(house => house.boarding_house_id === 'house-test').account_id, users[0].data.user.id)
  assert.deepEqual(Object.keys(rawHouses.find(house => house.boarding_house_id === 'house-test')).sort(), ['boarding_house_id', 'house_name', 'house_address', 'house_latitude', 'house_longitude', 'rules', 'account_id'].sort())
  const rawPost = JSON.parse(await readFile(rentalsFile, 'utf8'))[0]
  assert.equal(rawPost.boarding_house_id, 'house-test')
  assert.equal('remaining_rooms' in rawPost, false)
  assert.equal('owner_id' in rawPost, false)
  assert.equal('amenities' in rawPost, false)
  assert.equal(JSON.parse(await readFile(join(directory, 'rentals-amenities.json'), 'utf8'))[0].room_post_id, rawPost.room_post_id)
  assert.equal(rawPost.room_post_price, rental.price)
  assert.deepEqual(Object.keys(rawPost).sort(), ['room_post_id', 'boarding_house_id', 'room_post_title', 'room_post_area', 'room_post_price', 'deposit', 'room_post_water_price', 'room_post_electronic_price', 'room_post_internet_price', 'room_post_other_service_fee', 'max_occupants', 'room_post_description', 'curfew', 'status', 'posted_at'].sort())
  assert.equal(JSON.parse(await readFile(join(directory, 'rentals-images.json'), 'utf8'))[0].room_post_id, rawPost.room_post_id)
  assert.equal((await afterRestart('/api/rentals')).data.posts[0].house, 'Tên đã sửa')
  assert.equal((await request('/api/boarding-houses/house-test', 'DELETE', undefined, users[0].cookie)).status, 409)
  assert.equal((await request('/api/rentals/new-rental', 'DELETE', undefined, users[1].cookie)).status, 403)
  assert.equal((await request('/api/rentals/new-rental', 'PUT', { ...rental, status: 'Chờ duyệt' }, users[0].cookie)).status, 400)
  assert.equal((await request('/api/rentals/new-rental', 'PUT', { ...rental, status: 'Ẩn' }, users[0].cookie)).status, 200)
  assert.deepEqual((await request('/api/rentals', 'GET', undefined, users[2].cookie)).data.posts, [])
  assert.equal((await request('/api/rentals', 'GET', undefined, users[0].cookie)).data.posts[0].status, 'Ẩn')
  assert.equal((await request('/api/rentals/new-rental', 'DELETE', undefined, users[0].cookie)).status, 200)
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'rentals-images.json'), 'utf8')), [])
  assert.equal((await request('/api/boarding-houses/house-test', 'DELETE', undefined, users[0].cookie)).status, 200)
  assert.deepEqual((await request('/api/boarding-houses')).data.houses, [])
  const roommate = { title: 'Shared roommate', status: 'Còn phòng', address: '123 Cần Thơ', price: 2000000, people: 1, gender: 'Tất cả', moveIn: '2027-12-01', images: ['/illustrations/room-1.svg'], nearby: ['Nhà thuốc'], school: 'Đại học Cần Thơ' }
  assert.equal((await request('/api/roommates/new-roommate', 'PUT', roommate, users[0].cookie)).status, 403)
  assert.equal((await request('/api/roommates/new-roommate', 'PUT', roommate, users[2].cookie)).status, 200)
  assert.equal((await request('/api/roommates/new-roommate', 'PUT', roommate, users[3].cookie)).status, 403)
  const rawRoommate = JSON.parse(await readFile(join(directory, 'roommate_post.json'), 'utf8'))[0]
  assert.deepEqual(Object.keys(rawRoommate).sort(), ['roommate_post_id', 'university_id', 'student_code', 'title', 'description', 'distance_to_school', 'preferred_gender', 'current_room_price', 'electric_price', 'water_price', 'internet_price', 'other_service_fee', 'current_address', 'longitude', 'latitude', 'status', 'posted_at', 'vacancies', 'move_in_date', 'hobbies', 'expires_at'].sort())
  const studentRows = JSON.parse(await readFile(join(directory, 'student_profile.json'), 'utf8'))
  assert.equal(studentRows.find(student => student.student_code === rawRoommate.student_code).account_id, users[2].data.user.id)
  assert.equal((await afterRestart('/api/roommates')).data.posts[0].title, roommate.title)
  assert.equal((await request('/api/roommates/new-roommate', 'PUT', { ...roommate, status: 'Ẩn' }, users[2].cookie)).status, 200)
  assert.deepEqual((await request('/api/roommates')).data.posts, [])
  assert.equal((await request('/api/roommates/new-roommate', 'DELETE', undefined, users[3].cookie)).status, 403)
  assert.equal((await request('/api/roommates/new-roommate', 'DELETE', undefined, users[2].cookie)).status, 200)
  assert.deepEqual(JSON.parse(await readFile(join(directory, 'roommate_post_amenity.json'), 'utf8')), [])
})
