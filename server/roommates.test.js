import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createAuthMiddleware } from './auth.js'

const ROOMMATE_POST_KEYS = [
  'roommate_post_id', 'university_id', 'student_code', 'title', 'description',
  'distance_to_school', 'preferred_gender', 'current_room_price', 'area',
  'electric_price', 'water_price', 'internet_price', 'other_service_fee',
  'current_address', 'longitude', 'latitude', 'status', 'posted_at',
  'vacancies', 'move_in_date', 'hobbies', 'expires_at',
].sort()

const STUDENT_PROFILE_KEYS = [
  'account_id', 'student_code', 'major', 'gender', 'date_of_birth',
  'academic_year', 'student_verified_at', 'university_id',
].sort()

test('roommate posts persist to JSON collections with exact existing schema and appear in GET /api/roommates', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'findmyroom-roommates-api-'))
  const files = {
    accountsFile: join(directory, 'account.json'),
    housesFile: join(directory, 'boarding_house.json'),
    rentalsFile: join(directory, 'room_post.json'),
    rentalImagesFile: join(directory, 'room_post_image.json'),
    rentalAmenitiesFile: join(directory, 'room_post_amenity.json'),
    roommatesFile: join(directory, 'roommate_post.json'),
    roommateImagesFile: join(directory, 'roommate_post_image.json'),
    roommateAmenitiesFile: join(directory, 'roommate_post_amenity.json'),
    catalogFile: join(directory, 'amenity.json'),
    studentsFile: join(directory, 'student_profile.json'),
    universitiesFile: join(directory, 'university.json'),
  }
  await writeFile(files.accountsFile, JSON.stringify([]))
  await writeFile(files.universitiesFile, JSON.stringify([
    { university_id: 'UNI000001', university_name: 'Đại học Cần Thơ' },
  ]))
  await writeFile(files.catalogFile, JSON.stringify([
    { amenity_id: 'AM00000001', amenity_name: 'Wifi tốc độ cao', category: 'Tiện ích nội khu', description: '' },
  ]))

  const servers = []
  t.after(async () => {
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))))
    await rm(directory, { recursive: true, force: true })
  })

  const middleware = createAuthMiddleware(files)
  const server = createServer((req, res) => middleware(req, res, () => { res.writeHead(404); res.end() }))
  servers.push(server)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')

  const request = async (path, method = 'GET', data, cookie) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method,
      headers: { ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    })
    return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] }
  }

  const registered = await request('/api/auth/register', 'POST', {
    name: 'Nguyễn Văn Test',
    email: 'roommate-schema@example.com',
    phone: '0987654321',
    password: 'testpass123',
    role: 'student',
    terms: true,
  })
  assert.equal(registered.status, 201)

  const payload = {
    id: 'post-schema-1',
    title: 'Tìm bạn ở ghép Ô Môn',
    desc: 'Phòng rộng, thoáng mát, gần trường.',
    school: 'Đại học Cần Thơ',
    gender: 'Tất cả',
    people: 1,
    area: 24,
    price: 2000000,
    electric: 3500,
    water: 18000,
    internet: 100000,
    other: 'Rác 20k/tháng',
    address: '456 QL91, Ô Môn, Cần Thơ',
    latitude: 10.11,
    longitude: 105.62,
    moveIn: '2027-01-15',
    habits: 'Đọc sách, nấu ăn',
    amenities: ['Wifi tốc độ cao'],
    nearby: ['Gần chợ/BHX'],
    lifestyles: ['Yên tĩnh'],
    images: ['/illustrations/room-1.svg', '/illustrations/room-2.svg'],
    status: 'Còn phòng',
  }

  const saved = await request('/api/roommates/post-schema-1', 'PUT', payload, registered.cookie)
  assert.equal(saved.status, 200)
  assert.equal(saved.data.post.district, 'Ô Môn')
  assert.equal(saved.data.post.perPerson, 1000000)

  const [posts, images, links, students] = await Promise.all([
    readFile(files.roommatesFile, 'utf8').then(JSON.parse),
    readFile(files.roommateImagesFile, 'utf8').then(JSON.parse),
    readFile(files.roommateAmenitiesFile, 'utf8').then(JSON.parse),
    readFile(files.studentsFile, 'utf8').then(JSON.parse),
  ])

  assert.equal(posts.length, 1)
  assert.deepEqual(Object.keys(posts[0]).sort(), ROOMMATE_POST_KEYS)
  assert.equal(posts[0].roommate_post_id, 'post-schema-1')
  assert.equal(posts[0].university_id, 'UNI000001')
  assert.equal(typeof posts[0].current_room_price, 'number')
  assert.equal(typeof posts[0].vacancies, 'number')
  assert.equal(typeof posts[0].area, 'number')
  assert.equal(posts[0].status, 'Còn phòng')

  assert.equal(images.length, 1)
  assert.deepEqual(Object.keys(images[0]).sort(), ['images_url', 'roommate_post_id', 'roommate_post_image_id'])
  assert.deepEqual(images[0].images_url, ['/illustrations/room-1.svg', '/illustrations/room-2.svg'])

  assert.equal(links.length, 3)
  for (const link of links) {
    assert.deepEqual(Object.keys(link).sort(), ['amenity_id', 'roommate_post_id'])
  }

  assert.equal(students.length, 1)
  assert.deepEqual(Object.keys(students[0]).sort(), STUDENT_PROFILE_KEYS)

  const listed = await request('/api/roommates')
  assert.equal(listed.status, 200)
  assert.equal(listed.data.posts.length, 1)
  assert.equal(listed.data.posts[0].id, 'post-schema-1')
  assert.equal(listed.data.posts[0].district, 'Ô Môn')
})
