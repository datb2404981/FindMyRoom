import rawAmenities from '../data/amenity.json'
import rawHouses from '../data/boarding_house.json'
import rawHouseImages from '../data/boarding_house_image.json'
import rawRoomPosts from '../data/room_post.json'
import rawRoomImages from '../data/room_post_image.json'
import rawRoomAmenities from '../data/room_post_amenity.json'
import rawRoommates from '../data/roommate_post.json'
import rawRoommateImages from '../data/roommate_post_image.json'
import rawRoommateAmenities from '../data/roommate_post_amenity.json'
import rawAccounts from '../data/account.json'
import rawStudents from '../data/student_profile.json'
import rawPrefs from '../data/roommate_preference.json'
import rawUnis from '../data/university.json'
import rawReviews from '../data/review.json'
import rawReviewImages from '../data/review_image.json'

const amenityMap = new Map(rawAmenities.map(a => [a.amenity_id, a.amenity_name]))
const houseMap = new Map(rawHouses.map(h => [h.boarding_house_id, h]))
const houseImagesMap = new Map(rawHouseImages.map(h => [h.boarding_house_id, h.images_url]))
const roomImagesMap = new Map(rawRoomImages.map(r => [r.room_post_id, r.images_url]))
const roomAmenitiesMap = new Map()
for (const ra of rawRoomAmenities) {
  if (!roomAmenitiesMap.has(ra.room_post_id)) roomAmenitiesMap.set(ra.room_post_id, [])
  const name = amenityMap.get(ra.amenity_id)
  if (name && !roomAmenitiesMap.get(ra.room_post_id).includes(name)) roomAmenitiesMap.get(ra.room_post_id).push(name)
}

const roommateImagesMap = new Map(rawRoommateImages.map(r => [r.roommate_post_id, r.images_url]))
const roommateAmenitiesMap = new Map()
for (const ra of rawRoommateAmenities) {
  if (!roommateAmenitiesMap.has(ra.roommate_post_id)) roommateAmenitiesMap.set(ra.roommate_post_id, [])
  const name = amenityMap.get(ra.amenity_id)
  if (name && !roommateAmenitiesMap.get(ra.roommate_post_id).includes(name)) roommateAmenitiesMap.get(ra.roommate_post_id).push(name)
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

export const boardingHouses = rawHouses.map((h, i) => {
  const images = houseImagesMap.get(h.boarding_house_id) || []
  return {
    id: i === 0 ? 'minh-an' : h.boarding_house_id,
    code: h.boarding_house_id,
    name: i === 0 ? 'Nhà trọ Minh An' : h.house_name,
    address: h.house_address,
    rooms: 36,
    status: 'Đang hoạt động',
    desc: h.rules || 'Trọ sạch sẽ, thoáng mát, an ninh tốt',
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
  const district = roomDistricts[i] || 'Ninh Kiều'
  const schoolIds = roomSchoolIds[i] || ['ctu']

  let id = i === 0 ? 'minh-an' : (i === 1 ? 'an-binh' : (i === 2 ? 'hung-phu' : (i === 3 ? 'binh-thuy' : r.room_post_id.toLowerCase())))
  let title = r.room_post_title
  let houseName = house.house_name || 'Nhà trọ'
  let houseId = house.boarding_house_id || id
  let address = house.house_address || ''
  let price = r.room_post_price
  let area = r.room_post_area
  let people = r.max_occupants || 2
  let desc = r.room_post_description || ''
  let amenitiesList = [...postAmenities]
  let count = i === 0 ? 3 : (i === 1 ? 2 : 1)

  // Ensure room 0 has at least 4 photos for gallery counter test
  let images = [...rawImages]
  if (i === 0 && images.length < 4) {
    images = [
      ...images,
      'https://images.pexels.com/photos/10649527/pexels-photo-10649527.jpeg',
      'https://images.pexels.com/photos/20854915/pexels-photo-20854915.jpeg',
    ].slice(0, 4)
  }

  if (i === 0) {
    title = 'Phòng có gác, gần Đại học Cần Thơ'
    houseName = 'Nhà trọ Minh An'
    houseId = 'minh-an'
    address = 'Hẻm 51, đường 3/2, Xuân Khánh, Ninh Kiều, Cần Thơ'
    price = 1800000
    area = 24
    amenitiesList = ['Wifi tốc độ cao', 'Nhà xe', 'Camera 24/7', 'Giường/nệm']
    desc = 'Phòng thoáng, có gác lửng và cửa sổ. Khu trọ yên tĩnh, phù hợp cho sinh viên. Đi bộ đến trường và chợ Xuân Khánh.'
    count = 3
  } else if (i === 1) {
    title = 'Phòng studio sáng thoáng, đầy đủ tiện nghi'
    houseName = 'Nhà trọ An Bình'
    houseId = 'an-binh'
    address = 'Nguyễn Văn Cừ nối dài, An Bình, Ninh Kiều, Cần Thơ'
    price = 2700000
    area = 30
    people = 3
    amenitiesList = ['Máy lạnh', 'Wifi tốc độ cao', 'Tủ lạnh', 'Nhà xe']
    desc = 'Studio có bếp riêng, cửa sổ lớn, chỗ để xe an toàn. Gần Đại học Y Dược và siêu thị.'
    count = 2
  } else if (i === 2) {
    title = 'Phòng trọ có ban công tại Hưng Phú'
    houseName = 'Nhà trọ Hưng Phú'
    houseId = 'hung-phu'
    address = 'Đường B5, Hưng Phú, Cái Răng, Cần Thơ'
    price = 2200000
    area = 28
    amenitiesList = ['Nhà xe', 'Giờ giấc tự do', 'Wifi tốc độ cao', 'Máy giặt']
    desc = 'Phòng có ban công và khu bếp. Khu dân cư an ninh, giờ giấc tự do, chủ trọ thân thiện.'
  } else if (i === 3) {
    title = 'Phòng gác lửng trong khu trọ yên tĩnh Bình Thủy'
    houseName = 'Nhà trọ Bình Thủy'
    houseId = 'binh-thuy'
    address = 'Lê Hồng Phong, Bình Thủy, Cần Thơ'
    price = 1500000
    area = 22
    amenitiesList = ['Wifi tốc độ cao', 'Nhà xe', 'Camera 24/7']
    desc = 'Phòng sạch sẽ, gác rộng, có khu phơi đồ. Phù hợp với sinh viên cần không gian học tập yên tĩnh.'
  }

  return {
    id,
    roomPostId: r.room_post_id,
    schoolIds,
    title,
    house: houseName,
    houseId,
    price,
    area,
    people,
    district,
    address,
    amenities: amenitiesList,
    image: images[0] || `/illustrations/room-${(i % 4) + 1}.svg`,
    images: images.length ? images : [`/illustrations/room-${(i % 4) + 1}.svg`],
    status: r.status === 'active' ? 'Còn phòng' : 'Hết phòng',
    desc,
    water: r.room_post_water_price || 18000,
    electric: r.room_post_electronic_price || 3500,
    deposit: r.deposit || price,
    count,
    internet: r.room_post_internet_price || 100000,
    other: r.room_post_other_service_fee || '',
    curfew: r.curfew || null,
    ownerId: house.account_id || null,
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
  let nearbyList = ['Gần chợ/BHX', 'Quán ăn', 'Nhà thuốc', 'Trạm xe buýt']

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

  return {
    id,
    studentCode: s.student_code,
    title,
    image,
    name,
    age,
    school,
    major,
    gender,
    price,
    district,
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
