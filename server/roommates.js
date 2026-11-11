import { ensureStudent } from './student-profile.js'
import { jsonCollection, roommateFields, readRows } from './json-collection.js'

const fail = (status, message) => Object.assign(new Error(message), { status })
export function roommateStore({ file, imagesFile, linksFile, catalogFile, studentsFile, universitiesFile }) {
  const data = jsonCollection(file, imagesFile, roommateFields, 'roommate_post_image_id', { linksFile, catalogFile })
  async function read(houses, users) {
    const [posts, students, universities] = await Promise.all([data.read(), readRows(studentsFile), readRows(universitiesFile)])
    return posts.map(post => {
      const student = students.find(student => student.student_code === post.studentCode)
      const owner = users.find(user => user.id === student?.account_id && user.role === 'student')
      if (!owner) return null
      const house = houses.find(house => house.address === post.address)
      return { ...post, kind: 'roommate', ownerId: owner.id, owner: owner.name, phone: owner.phone, email: owner.email,
        school: universities.find(school => school.university_id === post.universityId)?.university_name || '',
        houseId: house?.id || '', house: house?.name || '', district: house?.ward || '',
        perPerson: Number(post.price) / (Number(post.people) + 1), totalRent: post.price }
    }).filter(Boolean)
  }
  function authorize(user) {
    if (!user) throw fail(401, 'Vui lòng đăng nhập.')
    if (user.role !== 'student') throw fail(403, 'Chỉ sinh viên được quản lý bài đăng ghép trọ.')
  }
  async function remove(id, user) {
    authorize(user)
    const students = await readRows(studentsFile)
    await data.update(posts => {
      const index = posts.findIndex(post => post.id === id)
      if (index < 0) throw fail(404, 'Không tìm thấy bài đăng.')
      if (!students.some(student => student.student_code === posts[index].studentCode && student.account_id === user.id)) throw fail(403, 'Bạn không có quyền xóa bài đăng này.')
      posts.splice(index, 1)
    })
  }
  async function save(id, body, user, houses) {
    authorize(user)
    if (!['Còn phòng', 'Hết phòng', 'Ẩn'].includes(body.status)) throw fail(400, 'Trạng thái không hợp lệ.')
    const post = { id, status: body.status }
    for (const key of ['title', 'desc', 'other', 'address', 'moveIn', 'habits']) {
      if (body[key] != null && (typeof body[key] !== 'string' || body[key].length > 10000)) throw fail(400, 'Thông tin bài đăng không hợp lệ.')
      post[key] = body[key] || ''
    }
    if (!post.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(post.moveIn) || !Number.isFinite(Date.parse(post.moveIn))) throw fail(400, 'Vui lòng nhập tiêu đề và ngày chuyển vào hợp lệ.')
    post.gender = body.gender || 'Tất cả'
    if (!['Tất cả', 'Nam', 'Nữ'].includes(post.gender)) throw fail(400, 'Đối tượng không hợp lệ.')
    for (const key of ['price', 'electric', 'water', 'internet', 'people']) {
      post[key] = Number(body[key] || 0)
      if (!Number.isFinite(post[key]) || post[key] < 0 || (['price', 'people'].includes(key) && !post[key]) || (key === 'people' && !Number.isInteger(post[key]))) throw fail(400, 'Giá và số người không hợp lệ.')
    }
    for (const [key, limit] of [['latitude', 90], ['longitude', 180]]) {
      post[key] = body[key] == null ? null : Number(body[key])
      if (post[key] != null && (!Number.isFinite(post[key]) || Math.abs(post[key]) > limit)) throw fail(400, 'Tọa độ không hợp lệ.')
    }
    const house = body.houseId ? houses.find(house => house.id === body.houseId) : null
    if (body.houseId && !house) throw fail(400, 'Vui lòng chọn lại nhà trọ.')
    if (house) post.address = house.address
    if (!post.address.trim()) throw fail(400, 'Vui lòng nhập địa chỉ.')
    for (const key of ['amenities', 'nearby', 'lifestyles']) {
      post[key] = body[key] || []
      if (!Array.isArray(post[key]) || post[key].length > 50 || post[key].some(value => typeof value !== 'string' || value.length > 200)) throw fail(400, 'Tiện ích không hợp lệ.')
    }
    post.images = body.images || []
    if (!Array.isArray(post.images) || !post.images.length || post.images.length > 10 || post.images.some(photo => {
      if (typeof photo !== 'string') return true
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(photo)
      return !(match && Buffer.byteLength(match[2], 'base64') <= 5 * 1024 * 1024) && !(photo.length <= 2000 && (/^https?:\/\/[^\s]+$/.test(photo) || /^\/(?!\/)[\w/.-]+$/.test(photo)))
    })) throw fail(400, 'Cần từ 1 đến 10 ảnh JPG, PNG, WEBP tối đa 5 MB mỗi ảnh.')
    const universities = await readRows(universitiesFile)
    post.universityId = universities.find(school => school.university_name === body.school)?.university_id || null
    const student = await ensureStudent(studentsFile, user, post.universityId)
    post.studentCode = student.student_code
    await data.update(posts => {
      const index = posts.findIndex(item => item.id === id)
      if (index >= 0 && posts[index].studentCode !== post.studentCode) throw fail(403, 'Bạn không có quyền sửa bài đăng này.')
      post.postedAt = index < 0 ? new Date().toISOString() : posts[index].postedAt
      post.distance = index < 0 ? null : posts[index].distance
      post.expiresAt = index < 0 ? null : posts[index].expiresAt
      if (index < 0) posts.push(post); else posts[index] = post
    })
    return { ...post, kind: 'roommate', ownerId: user.id, houseId: house?.id || '', house: house?.name || '', image: post.images[0] }
  }
  return { read, save, remove }
}
