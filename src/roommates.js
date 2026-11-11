import { reactive } from 'vue'

export const roommateDirectory = reactive({ posts: [] })
async function request(path = '', method = 'GET', body) {
  const response = await fetch('/api/roommates' + path, { method, credentials: 'same-origin',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Không tải hoặc lưu được bài đăng ghép trọ.')
  return data
}
export async function loadRoommates() {
  try { roommateDirectory.posts = (await request()).posts; return roommateDirectory.posts }
  catch (error) { roommateDirectory.posts = []; throw error }
}
export async function saveRoommate(post) {
  const saved = (await request('/' + encodeURIComponent(post.id), 'PUT', post)).post
  const result = { ...post, ...saved }
  roommateDirectory.posts = [...roommateDirectory.posts.filter(item => item.id !== post.id), result]
  return result
}
export async function deleteRoommate(id) {
  await request('/' + encodeURIComponent(id), 'DELETE')
  roommateDirectory.posts = roommateDirectory.posts.filter(post => post.id !== id)
}
