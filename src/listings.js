import { boardingHouses, extractDistrict, people, rooms } from './data'
import { houseDirectory } from './houses'
import { rentalStatus } from './rental-status'
import { rentalDirectory } from './rentals'
import { roommateDirectory } from './roommates'
import { schools } from './search-filters'

function schoolIdsForListing(item) {
  if (Array.isArray(item.schoolIds) && item.schoolIds.length) return item.schoolIds
  const match = item.school ? schools.find(s => s.name === item.school) : null
  return match ? [match.id] : []
}

// Public sample posts, separate from the private drafts and matching candidates.
export const roommateListings = people.map((person, index) => {
  const room = rooms[index % rooms.length]
  const specificIds = ['ghep-thu', 'ghep-hieu', 'ghep-khoa', 'ghep-mai']
  const specificTitles = [
    'Tìm bạn nữ ở ghép gần Đại học Cần Thơ',
    'Tìm bạn ở ghép phòng đầy đủ tiện nghi',
    'Tìm bạn ở ghép tại Hưng Phú, Cái Răng',
    'Tìm bạn ở ghép khu trọ yên tĩnh Bình Thủy',
  ]
  const moveInDates = ['2026-11-20', '2026-12-01', '2026-11-25', '2026-12-05']
  const perPersonPrice = Number(person.price) || 1200000
  const totalRoomPrice = Math.round(perPersonPrice * 2)
  const address = person.address || room.address || ''
  const district = person.district || extractDistrict(address) || room.district || ''

  return {
    ...room,
    id: specificIds[index] || `ghep-${person.id}`,
    kind: 'roommate',
    title: person.title || specificTitles[index] || `Tìm bạn ở ghép tại ${district} (${person.name})`,
    house: '',
    houseId: '',
    rules: '',
    address,
    district,
    schoolIds: schoolIdsForListing(person),
    owner: person.name,
    ownerId: person.accountId,
    phone: person.phone || '0912 345 678',
    zaloPhone: person.zaloPhone,
    gender: person.gender || 'Nữ',
    school: person.school || 'Đại học Cần Thơ',
    major: person.major || 'Công nghệ thông tin',
    age: person.age || 20,
    price: person.price ?? totalRoomPrice,
    perPerson: perPersonPrice,
    totalRent: totalRoomPrice,
    people: person.vacancies || 1,
    area: room.area || 24,
    moveIn: person.moveIn || moveInDates[index % moveInDates.length],
    electric: room.electric || 3500,
    water: room.water || 18000,
    internet: room.internet || 100000,
    other: person.other || 'Rác & dịch vụ: 25.000 đ/tháng',
    deposit: undefined,
    desc: person.bio,
    hobbies: person.hobbies || '',
    habits: 'Giữ vệ sinh chung, tôn trọng giờ giấc sinh hoạt và không gian riêng tư.',
    roomId: room.id,
    personId: person.id,
    status: person.status || 'Còn phòng',
    email: person.email || `${person.id}@example.com`,
    image: person.image || room.image,
    images: person.images || room.images,
    tags: person.tags || ['Yên tĩnh', 'Không hút thuốc'],
    amenities: person.amenities || room.amenities || ['Wifi tốc độ cao', 'Máy giặt', 'Nhà xe'],
    nearby: person.nearby || ['Gần chợ/BHX', 'Bệnh viện', 'Quán cafe', 'Cây xăng'],
    lifestyles: person.tags || ['Yên tĩnh', 'Không hút thuốc', 'Gọn gàng'],
  }
})

export function publicRentals(posts = []) {
  const listings = new Map(rooms.map(room => [room.id, room]))
  for (const post of [...posts, ...rentalDirectory.posts]) {
    if (post.kind === 'rental') listings.set(post.id, post)
  }
  return [...listings.values()].filter(post => post.status !== 'Bản nháp' && rentalStatus(post) !== 'Ẩn')
}

export function publicRoommates(posts = []) {
  const listings = new Map(roommateListings.map(listing => [listing.id, listing]))
  for (const post of [...posts, ...roommateDirectory.posts]) {
    if (post.kind === 'roommate') {
      listings.set(post.id, {
        ...post,
        price: Number(post.perPerson || post.price),
        district: post.district || extractDistrict(post.address),
        schoolIds: schoolIdsForListing(post),
      })
    }
  }
  return [...listings.values()].filter(post => post.status !== 'Bản nháp' && rentalStatus(post) === 'Còn phòng')
}

export function publicHouses(rentals = []) {
  const houses = new Map()
  for (const house of [...boardingHouses, ...houseDirectory.houses]) {
    if (house && house.status !== 'Ẩn') houses.set(house.id, house)
  }
  return [...houses.values()].map(house => {
    const activeRooms = rentals.filter(
      room => room.status === 'Còn phòng' && (room.houseId === house.id || (!room.houseId && room.house === house.name)),
    )
    const linkedRooms = activeRooms.length ? activeRooms : rooms.filter(room => room.houseId === house.id)
    const prices = activeRooms.map(room => Number(room.price)).filter(price => Number.isFinite(price) && price > 0)
    const address = house.address || ''
    const district = house.district || house.ward || extractDistrict(address)
    return {
      ...house,
      id: house.id,
      houseId: house.id,
      kind: 'house',
      title: house.name,
      house: house.name,
      address,
      district,
      price: prices.length ? Math.min(...prices) : null,
      schoolIds: [...new Set(linkedRooms.flatMap(room => room.schoolIds || []))],
      amenities: [...new Set(linkedRooms.flatMap(room => room.amenities || []))],
      nearby: [...new Set(linkedRooms.flatMap(room => room.nearby || []))],
      lifestyles: [...new Set(linkedRooms.flatMap(room => room.lifestyles || []))],
      desc: house.desc || house.rules || '',
      rules: house.rules || house.desc || '',
      owner: house.owner || linkedRooms[0]?.owner || '',
      status: house.status || 'Đang hoạt động',
      availableCount: activeRooms.length,
      roomCount: Number(house.rooms) || linkedRooms.length,
      image: house.image || linkedRooms[0]?.image || '/illustrations/room-1.svg',
    }
  })
}

export function housesFromRooms(rentals) {
  const houses = new Map()
  for (const room of rentals) {
    if (!room.house) continue
    const key = room.houseId || room.house
    if (!houses.has(key)) houses.set(key, { ...room, id: 'house-' + room.id, kind: 'house', title: room.house, status: 'Còn phòng', rooms: [], schoolIds: [], amenities: [] })
    const house = houses.get(key)
    house.rooms.push(room)
    house.price = Math.min(house.price, room.price)
    house.schoolIds = [...new Set([...house.schoolIds, ...(room.schoolIds || [])])]
    house.amenities = [...new Set([...house.amenities, ...room.amenities])]
  }
  return [...houses.values()]
}

export function searchableText(listing) {
  const parts = [
    listing.title,
    listing.house,
    listing.address,
    listing.district,
    listing.desc,
    listing.other,
    listing.rules,
    listing.owner,
    listing.hobbies,
    listing.school,
    listing.major,
    ...(Array.isArray(listing.amenities) ? listing.amenities : []),
    ...(Array.isArray(listing.nearby) ? listing.nearby : []),
    ...(Array.isArray(listing.lifestyles) ? listing.lifestyles : []),
  ]
  return parts
    .filter(Boolean)
    .join(' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^\p{L}\p{N}/]+/gu, ' ')
    .replace(/(?<![\p{L}\p{N}])\/+|\/+(?![\p{L}\p{N}])/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function matchesKeyword(listing, keyword) {
  const normalizedQuery = searchableText({ title: keyword })
  if (!normalizedQuery) return true
  const text = searchableText(listing)
  if (!text) return false
  const words = text.split(' ')
  const wordSet = new Set(words)
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  return tokens.every(token =>
    wordSet.has(token) ||
    words.some(word => word.includes('/') && word.split('/').includes(token)) ||
    (token.length >= 4 && words.some(word => word.startsWith(token)))
  )
}
