import { randomUUID } from 'node:crypto'
import { readRows, writeRows } from './json-collection.js'

const fail = (status, message, field) => Object.assign(new Error(message), { status, field })
const validGenders = new Set(['Nam', 'Nữ', 'Khác'])

let pending = Promise.resolve()
export function ensureStudent(studentsFile, user, universityId = null) {
  const task = pending.then(async () => {
    const rows = await readRows(studentsFile)
    let student = rows.find(row => row.account_id === user.id)
    if (!student) {
      student = { account_id: user.id, student_code: randomUUID(), major: '', gender: null, date_of_birth: null, academic_year: null, student_verified_at: null, university_id: universityId }
      rows.push(student)
      await writeRows(studentsFile, rows)
    }
    return student
  })
  pending = task.catch(() => {})
  return task
}

function formatStudentProfile(student, universities) {
  if (!student) return null
  return {
    gender: student.gender || '',
    major: student.major || '',
    birth: student.date_of_birth || '',
    school: universities.find(item => item.university_id === student.university_id)?.university_name || '',
  }
}

export async function readStudentProfile(studentsFile, userId, universitiesFile) {
  await pending
  const [rows, universities] = await Promise.all([readRows(studentsFile), universitiesFile ? readRows(universitiesFile) : []])
  return formatStudentProfile(rows.find(row => row.account_id === userId), universities)
}

export function updateStudentProfile(studentsFile, user, patch, universitiesFile) {
  const task = pending.then(async () => {
    const [rows, universities] = await Promise.all([readRows(studentsFile), universitiesFile ? readRows(universitiesFile) : []])
    let student = rows.find(row => row.account_id === user.id)
    if (!student) {
      student = { account_id: user.id, student_code: randomUUID(), major: '', gender: null, date_of_birth: null, academic_year: null, student_verified_at: null, university_id: null }
      rows.push(student)
    }
    if (patch.gender !== undefined) {
      const gender = typeof patch.gender === 'string' ? patch.gender.trim() : ''
      if (gender && !validGenders.has(gender)) throw fail(400, 'Giới tính không hợp lệ.', 'gender')
      student.gender = gender || null
    }
    if (patch.major !== undefined) {
      if (patch.major !== null && typeof patch.major !== 'string') throw fail(400, 'Ngành học không hợp lệ.', 'major')
      const major = typeof patch.major === 'string' ? patch.major.trim() : ''
      if (major.length > 120) throw fail(400, 'Ngành học tối đa 120 ký tự.', 'major')
      student.major = major
    }
    if (patch.birth !== undefined) {
      const birth = typeof patch.birth === 'string' ? patch.birth.trim() : ''
      if (birth && (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || !Number.isFinite(Date.parse(birth)))) {
        throw fail(400, 'Ngày sinh không hợp lệ.', 'birth')
      }
      student.date_of_birth = birth || null
    }
    if (patch.school !== undefined) {
      const school = typeof patch.school === 'string' ? patch.school.trim() : ''
      const matched = school ? universities.find(item => item.university_name === school) : null
      if (matched) student.university_id = matched.university_id
      else if (!school) student.university_id = null
    }
    await writeRows(studentsFile, rows)
    return formatStudentProfile(student, universities)
  })
  pending = task.catch(() => {})
  return task
}
