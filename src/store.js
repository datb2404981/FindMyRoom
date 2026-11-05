import { computed, reactive, watch } from 'vue'
import { rooms, boardingHouses } from './data'

const key = 'findmyroom-demo-v1'
const defaults = () => ({
  profile: { name: '', cccd: '', taxCode: '', studentId: '', birth: '', gender: 'Nam', school: 'Đại học Cần Thơ', major: '', phone: '', zalo: '', email: '', address: 'Cần Thơ', bio: '' },
  favorites: [], likes: [], passed: [],
  houses: boardingHouses.slice(0, 1),
  posts: rooms.slice(0, 3).map(room => ({ ...room, kind: 'rental' })),
  drafts: { roommate: {}, rental: {} },
})
function savedData(storageKey) {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {} } catch { return {} }
}
// The old browser-only session is no longer accepted as proof of login.
try { sessionStorage.removeItem('findmyroom-session-v1') } catch {}
export const state = reactive({ ...defaults(), ...savedData(key), user: null })
export const canManagePosts = computed(() => state.user?.role === 'landlord' || (
  state.user?.role === 'student' && state.posts.some(post => post.kind === 'roommate' && post.status !== 'Bản nháp' && (!post.ownerId || post.ownerId === state.user.id))
))
let hydrating = false
function storageKey(user) { return user ? `${key}:${user.id}` : key }
function persist() {
  if (hydrating) return
  try {
    const { user, ...data } = state
    localStorage.setItem(storageKey(user), JSON.stringify(data))
  } catch {}
}
watch(state, persist, { deep: true, flush: 'sync' })

function applyUser(user) {
  persist()
  const base = defaults()
  const saved = savedData(storageKey(user))
  hydrating = true
  Object.assign(state, base, saved, {
    user,
    profile: { ...base.profile, ...saved.profile, ...(user ? { name: user.name, email: user.email, phone: user.phone, zalo: saved.profile?.zalo || user.phone } : {}) },
  })
  hydrating = false
  persist()
  try {
    if (user) {
      localStorage.setItem('findmyroom:user', JSON.stringify(user))
      localStorage.setItem('findmyroom:role', user.role)
    } else {
      localStorage.removeItem('findmyroom:user')
      localStorage.removeItem('findmyroom:role')
    }
  } catch {}
}

async function authRequest(path, body, method = 'POST') {
  let response
  try {
    response = await fetch('/api/auth/' + path, {
      method, credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
  } catch { throw new Error('Không kết nối được máy chủ. Hãy chạy npm run dev rồi thử lại.') }
  let data
  try { data = await response.json() } catch { throw new Error('Máy chủ chưa hỗ trợ đăng nhập. Hãy chạy npm run dev.') }
  if (!response.ok) throw Object.assign(new Error(data.message || 'Không thực hiện được yêu cầu.'), { field: data.field })
  return data.user
}

export async function restoreSession() {
  try { applyUser(await authRequest('session', undefined, 'GET')) } catch { applyUser(null) }
}
export async function login(credentials) { applyUser(await authRequest('login', credentials)) }
export async function register(account) { applyUser(await authRequest('register', account)) }
export async function logout() {
  await authRequest('logout')
  applyUser(null)
}
export async function updateAccount(profile) {
  const payload = { name: profile.name, email: profile.email, phone: profile.phone }
  if (profile.role) payload.role = profile.role
  const user = await authRequest('profile', payload, 'PATCH')
  Object.assign(state.profile, profile, { name: user.name, email: user.email, phone: user.phone })
  state.user = user
  try {
    localStorage.setItem('findmyroom:user', JSON.stringify(user))
    localStorage.setItem('findmyroom:role', user.role)
  } catch {}
}

export function updateRentalPost(post) {
  const index = state.posts.findIndex(item => item.id === post.id)
  if (state.user?.role !== 'landlord' || index < 0 || (state.posts[index].kind || 'rental') !== 'rental') throw new Error('Không tìm thấy bài đăng cho thuê để chỉnh sửa.')
  const posts = state.posts.map((item, i) => i === index ? { ...item, ...post } : item)
  const { user, ...data } = state
  try {
    localStorage.setItem(storageKey(user), JSON.stringify({ ...data, posts }))
  } catch { throw new Error('Không đủ bộ nhớ trình duyệt để lưu. Hãy giảm dung lượng ảnh hoặc kiểm tra quyền lưu dữ liệu.') }
  state.posts = posts
}

export function toggleFavorite(id) {
  const i = state.favorites.indexOf(id)
  i < 0 ? state.favorites.push(id) : state.favorites.splice(i, 1)
}

export function validateField(key,value){
 const v=String(value??'').trim()
 if(!v)return 'Vui lòng điền thông tin này.'
 if(/email/i.test(key)&&!/^\S+@\S+\.\S+$/.test(v))return 'Email chưa đúng định dạng.'
 if(/phone|zalo/i.test(key)&&!/^(03|05|07|08|09)\d{8}$/.test(v))return 'Nhập số điện thoại Việt Nam gồm 10 chữ số.'
 if(/price|perPerson|area|people|electric|water|deposit|count|internet/i.test(key)&&(!Number.isFinite(Number(v))||Number(v)<=0))return 'Giá trị phải lớn hơn 0.'
 if(key==='moveIn'&&v<new Date().toLocaleDateString('en-CA'))return 'Ngày chuyển vào không được ở quá khứ.'
 return ''
}
