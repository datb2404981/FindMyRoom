import { computed, reactive, watch } from "vue";
import { rooms, boardingHouses } from "./data";
import { rentalStatus } from './rental-status'
import { readBrowserData, writeBrowserData } from './browser-storage'
import { loadHouses, saveHouse } from './houses'
import { loadRentals, saveRental } from './rentals'
import { loadRoommates, saveRoommate } from './roommates'

const key = "findmyroom-demo-v1";
const defaults = () => ({
  profile: {
    avatar: "",
    name: "",
    cccd: "",
    taxCode: "",
    studentId: "",
    birth: "",
    gender: "Nam",
    school: "Đại học Cần Thơ",
    major: "",
    phone: "",
    zalo: "",
    email: "",
    address: "Cần Thơ",
    bio: "",
  },
  likes: [],
  passed: [],
  houses: boardingHouses.slice(0, 1),
  posts: rooms.slice(0, 3).map((room) => ({ ...room, kind: "rental" })),
  drafts: { roommate: {}, rental: {} },
});
const legacySamplePostIds = new Set(["minh-an", "an-binh", "hung-phu", "binh-thuy"]);
const roomsById = new Map(rooms.map((room) => [room.id, room]));
async function savedData(storageKey) {
  try {
    const saved = await readBrowserData(storageKey);
    delete saved.favorites;
    if (Array.isArray(saved.posts)) saved.posts = saved.posts
      .filter(post => !(legacySamplePostIds.has(post.id) && (!post.ownerId || /^ACC\d+$/.test(post.ownerId))))
      .map(post => {
        if (roomsById.has(post.id) && (!post.ownerId || /^ACC\d+$/.test(post.ownerId))) {
          return { ...roomsById.get(post.id), kind: 'rental' };
        }
        return ['rental', 'roommate'].includes(post.kind || 'rental') && post.status !== 'Bản nháp' ? { ...post, status: rentalStatus(post) } : post;
      });
    return saved;
  } catch {
    return {};
  }
}
// The old browser-only session is no longer accepted as proof of login.
try {
  sessionStorage.removeItem("findmyroom-session-v1");
} catch {}
export const state = reactive({ ...defaults(), user: null });
export const canManagePosts = computed(
  () =>
    state.user?.role === "landlord" ||
    (state.user?.role === "student" &&
      state.posts.some(
        (post) =>
          post.kind === "roommate" &&
          post.status !== "Bản nháp" &&
          (!post.ownerId || post.ownerId === state.user.id),
      )),
);
let hydrating = false;
let initialized = false;
function storageKey(user) {
  return user ? `${key}:${user.id}` : key;
}
async function persist() {
  if (hydrating || !initialized) return;
  try {
    const { user, ...data } = state;
    await writeBrowserData(storageKey(user), data);
  } catch {}
}
watch(state, persist, { deep: true, flush: "sync" });

async function applyUser(user) {
  await persist();
  const base = defaults();
  const saved = await savedData(storageKey(user));
  hydrating = true;
  Object.assign(state, base, saved, {
    user,
    profile: {
      ...base.profile,
      ...saved.profile,
      ...(user
        ? {
            name: user.name,
            email: user.email,
            phone: user.phone,
            zalo: saved.profile?.zalo || user.phone,
          }
        : {}),
    },
  });
  hydrating = false;
  initialized = true;
  await persist();
  try {
    if (user) {
      localStorage.setItem("findmyroom:user", JSON.stringify(user));
      localStorage.setItem("findmyroom:role", user.role);
    } else {
      localStorage.removeItem("findmyroom:user");
      localStorage.removeItem("findmyroom:role");
    }
  } catch {}
  if (user?.role === 'landlord') {
    try {
      const remote = await loadHouses()
      const owned = remote.filter(house => house.ownerId === user.id)
      // Publish only old user-created houses, never the bundled sample houses.
      for (const house of saved.houses || []) {
        if (!house.ownerId && !boardingHouses.some(sample => sample.id === house.id) && !remote.some(item => item.id === house.id)) {
          owned.push(await saveHouse(house))
        }
      }
      state.houses = [...state.houses.filter(house => !house.ownerId && !owned.some(item => item.id === house.id)), ...owned]
      await persist()
    } catch { /* Keep the local list available when the server cannot be reached. */ }
  }
  try {
    const remote = await loadRentals()
    if (user?.role === 'landlord') {
      const owned = remote.filter(post => post.ownerId === user.id)
      for (const post of saved.posts || []) {
        if (post.kind === 'rental' && post.ownerId === user.id && post.status !== 'Bản nháp' && !remote.some(item => item.id === post.id) && state.houses.some(house => house.id === post.houseId && house.ownerId === user.id)) {
          owned.push(await saveRental(post))
        }
      }
      state.posts = [...state.posts.filter(post => !owned.some(item => item.id === post.id)), ...owned]
      await persist()
    }
  } catch { /* Keep private drafts available if the shared directory is offline. */ }
  try {
    const remote = await loadRoommates()
    if (user?.role === 'student') {
      const owned = remote.filter(post => post.ownerId === user.id)
      state.posts = [...state.posts.filter(post => !owned.some(item => item.id === post.id)), ...owned]
      await persist()
    }
  } catch { /* Keep private drafts available if the shared directory is offline. */ }
}

async function authRequest(path, body, method = "POST") {
  let response;
  try {
    response = await fetch("/api/auth/" + path, {
      method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : {},
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error("Không kết nối được máy chủ. Hãy chạy npm run dev rồi thử lại.");
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Máy chủ chưa hỗ trợ đăng nhập. Hãy chạy npm run dev.");
  }
  if (!response.ok)
    throw Object.assign(new Error(data.message || "Không thực hiện được yêu cầu."), {
      field: data.field,
    });
  return data.user;
}

export async function restoreSession() {
  try {
    await applyUser(await authRequest("session", undefined, "GET"));
  } catch {
    await applyUser(null);
  }
}
export async function login(credentials) {
  await applyUser(await authRequest("login", credentials));
}
export async function register(account) {
  await applyUser(await authRequest("register", account));
}
export async function logout() {
  await authRequest("logout");
  await applyUser(null);
}
export async function updateAccount(profile) {
  const payload = { name: profile.name, email: profile.email, phone: profile.phone };
  if (profile.role) payload.role = profile.role;
  const user = await authRequest("profile", payload, "PATCH");
  const nextProfile = { ...state.profile, ...profile,
    name: user.name,
    email: user.email,
    phone: user.phone,
  };
  const { user: currentUser, ...data } = state;
  await writeBrowserData(storageKey(user), { ...data, profile: nextProfile });
  Object.assign(state.profile, nextProfile);
  state.user = user;
  try {
    localStorage.setItem("findmyroom:user", JSON.stringify(user));
    localStorage.setItem("findmyroom:role", user.role);
  } catch {}
}

export async function updateManagedPost(post) {
  const index = state.posts.findIndex((item) => item.id === post.id);
  if (
    !state.user ||
    index < 0 ||
    state.posts[index].ownerId !== state.user.id ||
    (state.posts[index].kind || 'rental') !== (state.user.role === 'landlord' ? 'rental' : 'roommate') ||
    post.kind !== state.posts[index].kind
  )
    throw new Error("Không tìm thấy bài đăng của bạn để chỉnh sửa.");
  const savedPost = post.kind === 'rental' ? await saveRental(post) : await saveRoommate(post);
  const posts = state.posts.map((item, i) =>
    i === index ? { ...item, ...savedPost } : item,
  );
  const { user, ...data } = state;
  try {
    await writeBrowserData(storageKey(user), { ...data, posts });
  } catch {
    throw new Error(
      "Không lưu được dữ liệu. Hãy kiểm tra dung lượng thiết bị và quyền lưu dữ liệu của trình duyệt.",
    );
  }
  state.posts = posts;
}

export function validateField(key, value) {
  const v = String(value ?? "").trim();
  if (!v) return "Vui lòng điền thông tin này.";
  if (/email/i.test(key) && !/^\S+@\S+\.\S+$/.test(v))
    return "Email chưa đúng định dạng.";
  if (/phone|zalo/i.test(key) && !/^(03|05|07|08|09)\d{8}$/.test(v))
    return "Nhập số điện thoại Việt Nam gồm 10 chữ số.";
  if (
    /price|perPerson|area|people|electric|water|deposit|count|internet/i.test(key) &&
    (!Number.isFinite(Number(v)) || Number(v) <= 0)
  )
    return "Giá trị phải lớn hơn 0.";
  if (key === "moveIn" && v < new Date().toLocaleDateString("en-CA"))
    return "Ngày chuyển vào không được ở quá khứ.";
  return "";
}
