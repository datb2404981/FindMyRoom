import { randomUUID } from 'node:crypto'
import { jsonCollection, readRows } from './json-collection.js'
import { ensureStudent } from './student-profile.js'

export const reviewFields = { id: 'review_id', houseId: 'boarding_house_id', studentCode: 'student_code', rating: 'rating', content: 'content', createdAt: 'reviewed_at' }
export const houseAliases = { 'minh-an': 'BH00000001', 'an-binh': 'BH00000002', 'hung-phu': 'BH00000003', 'binh-thuy': 'BH00000004' }
export function reviewStore({ file, imagesFile, studentsFile }) {
  const data = jsonCollection(file, imagesFile, reviewFields, 'review_image_id')
  async function read(houseId, users) {
    const [reviews, students] = await Promise.all([data.read(), readRows(studentsFile)])
    return reviews.filter(review => review.houseId === houseId).reverse().map(review => {
      const student = students.find(student => student.student_code === review.studentCode)
      return { ...review, author: users.find(user => user.id === student?.account_id)?.name || 'Người dùng' }
    })
  }
  async function add(body, user) {
    const student = await ensureStudent(studentsFile, user)
    const review = { id: randomUUID(), houseId: body.houseId, studentCode: student.student_code, rating: body.rating,
      content: body.content, images: body.images, createdAt: new Date().toISOString() }
    await data.update(reviews => { reviews.push(review) })
    return { ...review, author: user.name }
  }
  return { read, add }
}
