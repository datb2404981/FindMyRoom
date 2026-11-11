import { randomUUID } from 'node:crypto'
import { readRows, writeRows } from './json-collection.js'

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
