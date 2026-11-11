import { reactive } from 'vue'

export const rentalDirectory = reactive({ posts: [], error: '' })
async function request(path = '', method = 'GET', body) {
  const response = await fetch('/api/rentals' + path, {
    method, credentials: 'same-origin',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Không tải được bài đăng cho thuê.')
  return data
}
export async function loadRentals() {
  rentalDirectory.error = ''
  try { rentalDirectory.posts = (await request()).posts; return rentalDirectory.posts }
  catch (error) { rentalDirectory.posts = []; rentalDirectory.error = error.message; throw error }
}
export async function saveRental(post) {
  const saved = (await request('/' + encodeURIComponent(post.id), 'PUT', post)).post
  rentalDirectory.posts = [...rentalDirectory.posts.filter(item => item.id !== saved.id), { ...post, ...saved }]
  return { ...post, ...saved }
}
export async function deleteRental(id) {
  await request('/' + encodeURIComponent(id), 'DELETE')
  rentalDirectory.posts = rentalDirectory.posts.filter(post => post.id !== id)
}
