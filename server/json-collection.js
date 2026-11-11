import { readFile, writeFile, rename, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { randomUUID } from 'node:crypto'

async function read(file) {
  try {
    const data = JSON.parse(await readFile(file, 'utf8'))
    if (!Array.isArray(data)) throw new Error('Invalid JSON collection')
    return data
  } catch (error) { if (error.code === 'ENOENT') return []; throw error }
}

async function write(file, data) {
  await mkdir(dirname(file), { recursive: true })
  const temporary = `${file}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 })
  await rename(temporary, file)
}

// Store only the original columns. UI aliases never become JSON columns.
let pending = Promise.resolve()
export function jsonCollection(file, imagesFile, fields, imageIdField, { linksFile, catalogFile } = {}) {
  const idField = fields.id
  async function records() {
    const [rows, photos, links, catalog] = await Promise.all([read(file), read(imagesFile), linksFile ? read(linksFile) : [], catalogFile ? read(catalogFile) : []])
    return rows.map(row => {
      const item = Object.fromEntries(Object.entries(fields).map(([key, column]) => [key, row[column]]))
      item.images = photos.find(photo => photo[idField] === item.id)?.images_url || []
      item.image = item.images[0] || '/illustrations/room-1.svg'
      for (const [key, category] of amenityGroups) item[key] = links.filter(link => link[idField] === item.id).map(link => catalog.find(amenity => amenity.amenity_id === link.amenity_id)).filter(amenity => amenity?.category === category).map(amenity => amenity.amenity_name)
      return item
    })
  }
  function update(change) {
    const task = pending.then(async () => {
      const items = await records()
      const result = change(items)
      const photos = await read(imagesFile)
      const rows = items.map(item => Object.fromEntries(Object.entries(fields).map(([key, column]) => [column, item[key] ?? null])))
      const nextPhotos = items.map(item => ({ [imageIdField]: photos.find(photo => photo[idField] === item.id)?.[imageIdField] || randomUUID(), [idField]: item.id, images_url: item.images || [] }))
      const files = [[file, rows], [imagesFile, nextPhotos]]
      if (linksFile && catalogFile) {
        const catalog = await read(catalogFile), links = []
        for (const item of items) for (const [key, category] of amenityGroups) for (const name of new Set(item[key] || [])) {
          let amenity = catalog.find(amenity => amenity.amenity_name === name && amenity.category === category)
          if (!amenity) { amenity = { amenity_id: randomUUID(), amenity_name: name, category, description: '' }; catalog.push(amenity) }
          links.push({ [idField]: item.id, amenity_id: amenity.amenity_id })
        }
        files.unshift([catalogFile, catalog], [linksFile, links])
      }
      const previous = await Promise.all(files.map(async ([file]) => [file, await read(file)]))
      const written = []
      try { for (const [file, rows] of files) { await write(file, rows); written.push(file) } }
      catch (error) { for (const [file, rows] of previous.reverse()) if (written.includes(file)) await write(file, rows); throw error }
      return result
    })
    pending = task.catch(() => {})
    return task
  }
  return { read: async () => { await pending; return records() }, update }
}

export const amenityGroups = [['amenities', '\u0054i\u1ec7n \u00edch n\u1ed9i khu'], ['nearby', 'Ti\u1ec7n \u00edch ngo\u1ea1i khu'], ['lifestyles', 'Kh\u00e1c']]
export const houseFields = {
  id: 'boarding_house_id', ownerId: 'account_id', name: 'house_name', address: 'house_address',
  latitude: 'house_latitude', longitude: 'house_longitude', rules: 'rules',
}
export const rentalFields = {
  id: 'room_post_id', houseId: 'boarding_house_id', title: 'room_post_title',
  area: 'room_post_area', price: 'room_post_price', deposit: 'deposit', water: 'room_post_water_price',
  electric: 'room_post_electronic_price', internet: 'room_post_internet_price', other: 'room_post_other_service_fee',
  people: 'max_occupants', desc: 'room_post_description', curfew: 'curfew', status: 'status', postedAt: 'posted_at',
}
export { read as readRows, write as writeRows }
export const roommateFields = {
  id: 'roommate_post_id', universityId: 'university_id', studentCode: 'student_code', title: 'title', desc: 'description',
  distance: 'distance_to_school', gender: 'preferred_gender', price: 'current_room_price', electric: 'electric_price',
  water: 'water_price', internet: 'internet_price', other: 'other_service_fee', address: 'current_address',
  longitude: 'longitude', latitude: 'latitude', status: 'status', postedAt: 'posted_at', people: 'vacancies',
  moveIn: 'move_in_date', habits: 'hobbies', expiresAt: 'expires_at',
}
