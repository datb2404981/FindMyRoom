import { reactive } from 'vue'

export const houseDirectory = reactive({ houses: [], loading: false, error: '' })
let loading

async function request(path, method = 'GET', body) {
  const response = await fetch('/api/boarding-houses' + path, {
    method, credentials: 'same-origin',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Không tải được danh sách nhà trọ.')
  return data
}

export function loadHouses() {
  if (loading) return loading
  houseDirectory.loading = true
  houseDirectory.error = ''
  loading = request('').then(data => {
    houseDirectory.houses = data.houses
    return data.houses
  }).catch(error => {
    houseDirectory.error = 'Không tải được danh sách nhà trọ. Vui lòng thử lại.'
    throw error
  }).finally(() => { houseDirectory.loading = false; loading = null })
  return loading
}

export async function saveHouse(house) {
  const data = await request('/' + encodeURIComponent(house.id), 'PUT', house)
  houseDirectory.houses = [...houseDirectory.houses.filter(item => item.id !== data.house.id), data.house]
  return data.house
}

export async function deleteHouse(id) {
  await request('/' + encodeURIComponent(id), 'DELETE')
  houseDirectory.houses = houseDirectory.houses.filter(house => house.id !== id)
}
