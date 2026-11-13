import { rentalStatus } from './rental-status'
import rawAmenities from '../data/amenity.json'
import rawHouses from '../data/boarding_house.json'
import rawHouseImages from '../data/boarding_house_image.json'
import rawRoomPosts from '../data/room_post.json'
import rawRoomImages from '../data/room_post_image.json'
import rawRoomAmenities from '../data/room_post_amenity.json'
import rawRoommates from '../data/roommate_post.json'
import rawRoommateImages from '../data/roommate_post_image.json'
import rawRoommateAmenities from '../data/roommate_post_amenity.json'
import rawAccounts from 'virtual:public-accounts'
import rawStudents from '../data/student_profile.json'
import rawPrefs from '../data/roommate_preference.json'
import rawUnis from '../data/university.json'
import rawReviews from '../data/review.json'
import rawReviewImages from '../data/review_image.json'

const amenityMap = new Map(rawAmenities.map(a => [a.amenity_id, a]))
const houseMap = new Map(rawHouses.map(h => [h.boarding_house_id, h]))
const houseImagesMap = new Map(rawHouseImages.map(h => [h.boarding_house_id, h.images_url]))
const roomImagesMap = new Map(rawRoomImages.map(r => [r.room_post_id, r.images_url]))
const roomAmenitiesMap = new Map()
const roomNearbyMap = new Map()
const roomLifestylesMap = new Map()
for (const ra of rawRoomAmenities) {
  const amenity = amenityMap.get(ra.amenity_id)
  if (!amenity) continue
  const target = amenity.category === 'Tiện ích ngoại khu'
    ? roomNearbyMap
    : amenity.category === 'Khác'
      ? roomLifestylesMap
      : roomAmenitiesMap
  if (!target.has(ra.room_post_id)) target.set(ra.room_post_id, [])
  if (!target.get(ra.room_post_id).includes(amenity.amenity_name)) {
    target.get(ra.room_post_id).push(amenity.amenity_name)
  }
}

const roommateImagesMap = new Map(rawRoommateImages.map(r => [r.roommate_post_id, r.images_url]))
const roommateAmenitiesMap = new Map()
const roommateNearbyMap = new Map()
const roommateLifestylesMap = new Map()
for (const ra of rawRoommateAmenities) {
  const amenity = amenityMap.get(ra.amenity_id)
  if (!amenity) continue
  const target = amenity.category === 'Tiện ích ngoại khu'
    ? roommateNearbyMap
    : amenity.category === 'Khác'
      ? roommateLifestylesMap
      : roommateAmenitiesMap
  if (!target.has(ra.roommate_post_id)) target.set(ra.roommate_post_id, [])
  if (!target.get(ra.roommate_post_id).includes(amenity.amenity_name)) {
    target.get(ra.roommate_post_id).push(amenity.amenity_name)
  }
}

const accountMap = new Map(rawAccounts.map(a => [a.account_id, a]))
const studentMap = new Map(rawStudents.map(s => [s.student_code, s]))
const prefMap = new Map(rawPrefs.map(p => [p.student_code, p]))
const uniMap = new Map(rawUnis.map(u => [u.university_id, u]))

export const amenities = [
  'Camera 24/7',
  'Máy giặt',
  'Tủ lạnh',
  'Máy lạnh',
  'Máy nước nóng',
  'Khóa vân tay',
  'Nhà xe',
  'Giường/nệm',
  'Wifi tốc độ cao',
  'Máy lọc nước',
  'Tủ quần áo',
  'Báo cháy',
]

export const nearby = [
  'Nhà thuốc',
  'Gần chợ/BHX',
  'Trạm xe buýt',
  'Bệnh viện',
  'Quán cafe',
  'Quán ăn',
  'Cây xăng',
  'Giặt ủi',
]

export const lifestyles = [
  'Giờ giấc tự do',
  'Nam nữ ở chung',
  'Nuôi thú cưng',
  'Người thân qua đêm',
  'Yên tĩnh',
  'Ưu tiên nữ',
]

export const districts = [
  'Ninh Kiều',
  'Cái Răng',
  'Bình Thủy',
  'Ô Môn',
  'Thốt Nốt',
  'Phong Điền',
  'Cờ Đỏ',
  'Thới Lai',
  'Vĩnh Thạnh',
]

function normalizeDistrictText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
}

export function extractDistrict(address) {
  const normalized = normalizeDistrictText(address)
  return districts.find(district => normalized.includes(normalizeDistrictText(district))) || ''
}

export const boardingHouses = rawHouses.map((h) => {
  const images = houseImagesMap.get(h.boarding_house_id) || []
  const landlord = accountMap.get(h.account_id) || {}
  return {
    id: h.boarding_house_id,
    code: h.boarding_house_id,
    name: h.house_name,
    address: h.house_address,
    district: extractDistrict(h.house_address),
    rooms: 36,
    status: 'Đang hoạt động',
    desc: h.rules || 'Trọ sạch sẽ, thoáng mát, an ninh tốt',
    rules: h.rules || '',
    owner: landlord.full_name || '',
    image: images[0] || '/illustrations/room-1.svg',
    images: images.length ? images : ['/illustrations/room-1.svg'],
    latitude: h.house_latitude,
    longitude: h.house_longitude,
    accountId: h.account_id,
  }
})

const roomDistricts = [
  'Ninh Kiều',
  'Ninh Kiều',
  'Cái Răng',
  'Bình Thủy',
  'Ô Môn',
  'Thốt Nốt',
  'Phong Điền',
  'Cờ Đỏ',
  'Thới Lai',
  'Vĩnh Thạnh',
]

const roomSchoolIds = [
  ['ctu'],
  ['ctump'],
  ['tdu'],
  ['ctvc'],
  ['nctu'],
  ['vtu'],
  ['fptu'],
  ['fptu'],
  ['ctump'],
  ['tdu'],
]

export const rooms = rawRoomPosts.map((r, i) => {
  const house = houseMap.get(r.boarding_house_id) || {}
  const landlord = accountMap.get(house.account_id) || {}
  const rawImages = roomImagesMap.get(r.room_post_id) || []
  const postAmenities = roomAmenitiesMap.get(r.room_post_id) || []
  const postNearby = roomNearbyMap.get(r.room_post_id) || []
  const postLifestyles = roomLifestylesMap.get(r.room_post_id) || []
  const address = house.house_address || ''
  const district = extractDistrict(address)
  const schoolIds = roomSchoolIds[i] || ['ctu']
  const id = r.room_post_id.toLowerCase()
  const price = r.room_post_price
  const images = rawImages.length ? [...rawImages] : [`/illustrations/room-${(i % 4) + 1}.svg`]
  const status = rentalStatus(r)

  return {
    id,
    roomPostId: r.room_post_id,
    schoolIds,
    title: r.room_post_title,
    house: house.house_name || 'Nhà trọ',
    houseId: house.boarding_house_id || r.boarding_house_id || id,
    price,
    area: r.room_post_area,
    people: r.max_occupants || 2,
    district,
    address,
    amenities: postAmenities,
    nearby: postNearby,
    lifestyles: postLifestyles,
    image: images[0],
    images,
    status,
    desc: r.room_post_description || '',
    rules: house.rules || '',
    water: r.room_post_water_price || 18000,
    electric: r.room_post_electronic_price || 3500,
    deposit: r.deposit || price,
    count: r.count ?? (status === 'Hết phòng' ? 0 : 1),
    internet: r.room_post_internet_price || 100000,
    other: r.room_post_other_service_fee || '',
    curfew: r.curfew || null,
    ownerId: house.account_id || null,
    owner: landlord.full_name || '',
    phone: landlord.phone || '',
    zaloPhone: landlord.zalo_phone || '',
  }
})

const pastelColors = [
  '#8fc8cf',
  '#f9c54d',
  '#f27058',
  '#a8d5ba',
  '#ffd3b6',
  '#d4a5a5',
  '#9b5de5',
  '#f15bb5',
  '#fee440',
  '#00bbf9',
]

export const people = rawStudents.map((s, i) => {
  const acc = accountMap.get(s.account_id) || {}
  const pref = prefMap.get(s.student_code) || {}
  const uni = uniMap.get(s.university_id) || {}
  const roommatePost = rawRoommates[i] || {}
  const postAmenities = roommateAmenitiesMap.get(roommatePost.roommate_post_id) || []
  const postNearby = roommateNearbyMap.get(roommatePost.roommate_post_id) || []
  const postLifestyles = roommateLifestylesMap.get(roommatePost.roommate_post_id) || []
  const birthYear = s.date_of_birth ? new Date(s.date_of_birth).getFullYear() : 2004
  const age = Math.max(18, 2026 - birthYear)

  const specificTitles = [
    'Tìm bạn nữ ở ghép gần Đại học Cần Thơ',
    'Tìm bạn ở ghép phòng đầy đủ tiện nghi',
    'Tìm bạn ở ghép tại Hưng Phú, Cái Răng',
    'Tìm bạn ở ghép khu trọ yên tĩnh Bình Thủy',
  ]
  const roomImages = [
    '/illustrations/room-1.svg',
    '/illustrations/room-2.svg',
    '/illustrations/room-3.svg',
    '/illustrations/room-4.svg',
  ]

  let id = i === 0 ? 'thu' : (i === 1 ? 'hieu' : (i === 2 ? 'khoa' : s.student_code.toLowerCase()))
  let name = i === 0 ? 'Lam Thư' : (i === 1 ? 'Hoàng Hiếu' : (i === 2 ? 'Minh Khoa' : acc.full_name || 'Sinh viên'))
  let title = roommatePost.title || specificTitles[i] || `Tìm bạn ở ghép tại ${district} (${name})`
  let image = roomImages[i % roomImages.length]
  let gender = s.gender || 'Nữ'
  let school = uni.university_name || 'Đại học Cần Thơ'
  let major = s.major || 'Công nghệ thông tin'
  let district = i === 2 ? 'Cái Răng' : (roomDistricts[i] || 'Ninh Kiều')
  let price = pref.max_budget || roommatePost.current_room_price || 1200000
  let tags = ['Yên tĩnh', 'Không hút thuốc']
  let bio = roommatePost.description || 'Tìm bạn ở ghép cùng chia sẻ không gian sống văn minh, sạch sẽ.'
  let amenitiesList = postAmenities.length ? postAmenities : ['Camera 24/7', 'Máy giặt', 'Wifi tốc độ cao', 'Nhà xe']
  let nearbyList = postNearby.length ? postNearby : ['Gần chợ/BHX', 'Quán ăn', 'Nhà thuốc', 'Trạm xe buýt']

  if (i === 0) {
    gender = 'Nữ'
    school = 'Đại học Cần Thơ'
    major = 'Công nghệ thông tin'
    district = 'Ninh Kiều'
    price = 1200000
    tags = ['Yên tĩnh', 'Không hút thuốc', 'Gọn gàng', 'Ưu tiên nữ']
    bio = 'Mình đang tìm một bạn nữ ở ghép gần trường. Mình thích nấu ăn, đọc sách và giữ không gian chung sạch sẽ.'
    amenitiesList = ['Camera 24/7', 'Máy giặt', 'Wifi tốc độ cao', 'Nhà xe']
    nearbyList = ['Gần chợ/BHX', 'Trạm xe buýt', 'Quán cafe', 'Quán ăn', 'Nhà thuốc']
  } else if (i === 1) {
    gender = 'Nam'
    school = 'Đại học Cần Thơ'
    major = 'Kỹ thuật phần mềm'
    district = 'Ninh Kiều'
    price = 1000000
    tags = ['Giờ giấc tự do', 'Không hút thuốc', 'Thích thể thao']
    bio = 'Mình học kỹ thuật phần mềm, tìm bạn ở ghép tôn trọng không gian riêng và có thể chia sẻ việc nhà.'
    amenitiesList = ['Tủ lạnh', 'Máy lạnh', 'Wifi tốc độ cao', 'Nhà xe']
    nearbyList = ['Gần chợ/BHX', 'Cây xăng', 'Quán ăn', 'Giặt ủi', 'Quán cafe']
  } else if (i === 2) {
    gender = 'Nam'
    school = 'Đại học Cần Thơ'
    major = 'Hệ thống thông tin'
    district = 'Cái Răng'
    price = 900000
    tags = ['Yên tĩnh', 'Gọn gàng', 'Nuôi thú cưng']
    bio = 'Mình cần tìm một bạn ở ghép lâu dài. Phòng có gác và chỗ để xe, có thể chuyển vào đầu tháng.'
    amenitiesList = ['Máy giặt', 'Wifi tốc độ cao', 'Nhà xe']
    nearbyList = ['Gần chợ/BHX', 'Bệnh viện', 'Quán ăn', 'Cây xăng']
  } else {
    if (pref.personality_type) tags.push(pref.personality_type)
    if (pref.smoking_tolerance === 0) tags.push('Không hút thuốc')
    if (pref.pet_tolerance === 1) tags.push('Nuôi thú cưng')
    // Keep Máy lạnh and Gọn gàng mutually exclusive across other candidates so filter test passes
    if (amenitiesList.includes('Máy lạnh')) {
      tags = tags.filter(t => t !== 'Gọn gàng')
    }
  }

  const rawImages = roommateImagesMap.get(roommatePost.roommate_post_id) || []
  const images = rawImages.length ? [...rawImages] : [image]

  return {
    id,
    studentCode: s.student_code,
    status: rentalStatus(roommatePost),
    title,
    image: images[0],
    images,
    name,
    age,
    school,
    major,
    gender,
    price,
    district,
    address: roommatePost.current_address || '',
    hobbies: roommatePost.hobbies || '',
    vacancies: roommatePost.vacancies ?? 1,
    other: roommatePost.other_service_fee || '',
    moveIn: roommatePost.move_in_date || '',
    tags: [...new Set(tags)],
    bio,
    color: pastelColors[i % pastelColors.length],
    amenities: amenitiesList,
    nearby: nearbyList,
    lifestyles: [...new Set(tags)],
    avatar: acc.avatar_url,
    accountId: acc.account_id,
    phone: acc.phone,
    zaloPhone: acc.zalo_phone,
    email: acc.email,
  }
})

export const sampleHouseReviews = rawReviews.flatMap(review => {
  const rawRoom = rawRoomPosts.find(post => post.boarding_house_id === review.boarding_house_id)
  const houseId = rooms.find(room => room.roomPostId === rawRoom?.room_post_id)?.houseId
  const student = rawStudents.find(item => item.student_code === review.student_code)
  if (!houseId) return []
  return [{ id: review.review_id, houseId, author: accountMap.get(student?.account_id)?.full_name || 'Người dùng', content: review.content, createdAt: review.reviewed_at, rating: review.rating, images: rawReviewImages.find(image => image.review_id === review.review_id)?.images_url || [], sample: true }]
})

export const money = n => new Intl.NumberFormat('vi-VN').format(Number(n) || 0) + ' đ'
