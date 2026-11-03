import { reactive, watch } from 'vue'
import { rooms } from './data'

const key = 'findmyroom-demo-v1'
const defaults = () => ({
  profile: { name: '', studentId: '', birth: '', gender: 'Nam', school: 'Đại học Cần Thơ', major: '', phone: '', zalo: '', email: '', address: 'Cần Thơ', bio: '' },
  favorites: [], likes: [], passed: [],
  houses: [{ id: 'minh-an', name: 'Nhà trọ Minh An', address: 'Nguyễn Văn Cừ, An Bình, Ninh Kiều, Cần Thơ', rooms: 36, status: 'Đang hoạt động', desc: 'Trọ sạch sẽ, thoáng mát, an ninh tốt' }],
  posts: rooms.slice(0, 3).map(room => ({ ...room, kind: 'rental' })),
  drafts: { roommate: {}, rental: {} },
})
function savedData(storageKey) {
  try { return JSON.parse(localStorage.getItem(storageKey) || '{}') || {} } catch { return {} }
}
// The old browser-only session is no longer accepted as proof of login.
try { sessionStorage.removeItem('findmyroom-session-v1') } catch {}
export const state = reactive({ ...defaults(), ...savedData(key), user: null })
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
  const user = await authRequest('profile', { name: profile.name, email: profile.email, phone: profile.phone }, 'PATCH')
  Object.assign(state.profile, profile, { name: user.name, email: user.email, phone: user.phone })
  state.user = user
}

export function toggleFavorite(id){const i=state.favorites.indexOf(id);i<0?state.favorites.push(id):state.favorites.splice(i,1)}
export function validateField(key,value){
 const v=String(value??'').trim()
 if(!v)return 'Vui lòng điền thông tin này.'
 if(/email/i.test(key)&&!/^\S+@\S+\.\S+$/.test(v))return 'Email chưa đúng định dạng.'
 if(/phone|zalo/i.test(key)&&!/^(03|05|07|08|09)\d{8}$/.test(v))return 'Nhập số điện thoại Việt Nam gồm 10 chữ số.'
 if(/price|perPerson|area|people|electric|water|deposit|count|internet|other/i.test(key)&&(!Number.isFinite(Number(v))||Number(v)<=0))return 'Giá trị phải lớn hơn 0.'
 if(key==='moveIn'&&v<new Date().toLocaleDateString('en-CA'))return 'Ngày chuyển vào không được ở quá khứ.'
 return ''
}
