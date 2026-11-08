import { people, rooms } from './data'
import { rentalStatus } from './rental-status'

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

  return {
    ...room,
    id: specificIds[index] || `ghep-${person.id}`,
    kind: 'roommate',
    title: specificTitles[index] || `Tìm bạn ở ghép tại ${person.district} (${person.name})`,
    owner: person.name,
    ownerId: person.accountId,
    phone: person.phone,
    zaloPhone: person.zaloPhone,
    gender: person.gender || 'Nữ',
    school: person.school || 'Đại học Cần Thơ',
    major: person.major || 'Công nghệ thông tin',
    age: person.age || 20,
    price: person.price ?? totalRoomPrice,
    perPerson: perPersonPrice,
    totalRent: totalRoomPrice,
    people: 1,
    area: room.area || 24,
    moveIn: moveInDates[index % moveInDates.length],
    electric: room.electric || 3500,
    water: room.water || 18000,
    internet: room.internet || 100000,
    other: 'Rác & dịch vụ: 25.000 đ/tháng',
    deposit: undefined,
    desc: person.bio,
    habits: 'Giữ vệ sinh chung, tôn trọng giờ giấc sinh hoạt và không gian riêng tư.',
    roomId: room.id,
    personId: person.id,
    status: 'Còn phòng',
    phone: person.phone || '0912 345 678',
    email: person.email || `${person.id}@example.com`,
    tags: person.tags || ['Yên tĩnh', 'Không hút thuốc'],
    amenities: person.amenities || room.amenities || ['Wifi tốc độ cao', 'Máy giặt', 'Nhà xe'],
    nearby: ['Gần chợ/BHX', 'Bệnh viện', 'Quán cafe', 'Cây xăng'],
    lifestyles: person.tags || ['Yên tĩnh', 'Không hút thuốc', 'Gọn gàng'],
  }
})

export function publicRentals(posts = []) {
  const listings = new Map(rooms.map(room => [room.id, room]))
  for (const post of posts) {
    if (post.kind === 'rental' && post.status === 'Đang hiển thị') listings.set(post.id, post)
  }
  return [...listings.values()]
}

export function publicRoommates(posts = []) {
  const listings = new Map(roommateListings.map(listing => [listing.id, listing]))
  for (const post of posts) {
    if (post.kind === 'roommate') listings.set(post.id, { ...post, price: Number(post.perPerson || post.price) })
  }
  return [...listings.values()].filter(post => post.status !== 'Bản nháp' && rentalStatus(post) === 'Còn phòng')
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
  return [listing.title, listing.house, listing.address, listing.district, listing.desc, listing.owner].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLocaleLowerCase('vi')
}
