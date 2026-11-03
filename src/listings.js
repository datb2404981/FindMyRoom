import { people, rooms } from './data'

// Public sample posts, separate from the private drafts and matching candidates.
export const roommateListings = [
  { ...rooms[0], id: 'ghep-thu', kind: 'roommate', title: 'Tìm bạn nữ ở ghép gần Đại học Cần Thơ', owner: people[0].name, price: people[0].price, people: 1, desc: people[0].bio, roomId: rooms[0].id, status: 'Đang tìm bạn' },
  { ...rooms[1], id: 'ghep-hieu', kind: 'roommate', title: 'Tìm bạn ở ghép phòng đầy đủ tiện nghi', owner: people[1].name, price: people[1].price, people: 1, desc: people[1].bio, roomId: rooms[1].id, status: 'Đang tìm bạn' },
  { ...rooms[2], id: 'ghep-khoa', kind: 'roommate', title: 'Tìm bạn ở ghép tại Hưng Phú, Cái Răng', owner: people[2].name, price: people[2].price, people: 1, desc: people[2].bio, roomId: rooms[2].id, status: 'Đang tìm bạn' },
  { ...rooms[3], id: 'ghep-mai', kind: 'roommate', title: 'Tìm bạn ở ghép khu trọ yên tĩnh Bình Thủy', owner: 'Ngọc Mai', price: 850_000, people: 1, desc: 'Mình muốn tìm một bạn ở ghép lâu dài, giữ không gian chung gọn gàng và tôn trọng giờ học của nhau.', roomId: rooms[3].id, status: 'Đang tìm bạn' },
]

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
    if (post.kind === 'roommate' && post.status === 'Đang hiển thị') listings.set(post.id, { ...post, price: Number(post.perPerson || post.price), status: 'Đang tìm bạn' })
  }
  return [...listings.values()]
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
