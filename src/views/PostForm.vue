<script setup>
import { computed, reactive, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import Icon from "../components/Icon.vue";
import MapPanel from "../components/MapPanel.vue";
import GenderDropdown from "../components/GenderDropdown.vue";
import AppDropdown from "../components/AppDropdown.vue";
import MoneyInput from "../components/MoneyInput.vue";
import universities from "../../data/university.json";
import { canThoUrbanWards } from "../data/can-tho-wards";
import { amenities, nearby, lifestyles, money, boardingHouses } from "../data";
import { state, validateField } from "../store";
import { rentalStatuses, rentalStatus } from '../rental-status'
import { houseDirectory, loadHouses } from '../houses'
import { saveRental } from '../rentals'
import { saveRoommate } from '../roommates'
const universityOptions = universities.map((university) => ({
  value: university.university_name,
  label: university.university_name,
}));
const route = useRoute(),
  router = useRouter(),
  rental = computed(() => route.params.kind === "rental"),
  kind = computed(() => (rental.value ? "rental" : "roommate")),
  step = ref(1),
  preview = ref(false),
  previewPhotoIndex = ref(0),
  success = ref(false),
  errors = reactive({}),
  uploadError = ref(""),
  locationNotice = ref(""),
  locationState = ref(""),
  locating = ref(false),
  images = ref([]),
  dragging = ref(false);
const leaveModal = ref(false),
  initialItem = ref(null);
const publishing = ref(false), publishError = ref('');
let locationRequest = 0,
  pendingResolver = null,
  pendingAction = null;
const steps = computed(() => [
  "Thông tin chung",
  "Vị trí & Địa lý",
  "Hình ảnh",
  "Tiện ích",
]);

const houseInputFocused = ref(false);
const highlightedHouseIndex = ref(-1);
const houseDropdownRef = ref(null);

const systemHouses = computed(() => {
  if (!rental.value) return houseDirectory.houses.filter(house => house.status === 'Đang hoạt động')
  return houseDirectory.houses.filter(house => house.ownerId === state.user?.id && house.status === 'Đang hoạt động');
});

const matchingHouses = computed(() => {
  const q = (draft.house || "").trim().toLowerCase();
  if (!q) return systemHouses.value;
  return systemHouses.value
    .filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.address && h.address.toLowerCase().includes(q))
    );
});

const selectedHouse = computed(() => {
  if (draft.houseId) {
    return systemHouses.value.find((h) => h.id === draft.houseId) || null;
  }
  return null;
});

function selectHouse(h) {
  delete errors.house
  draft.house = h.name;
  draft.houseId = h.id;
  if (h.address) {
    if (!draft.street.trim()) {
      draft.street = h.street || h.address;
    }
    const wards = ["Xuân Khánh", "An Bình", "Hưng Lợi", "An Khánh", "Hưng Phú", "Bình Thủy"];
    const matchedWard = h.ward || wards.find((w) => h.address.includes(w));
    if (matchedWard && !draft.ward) {
      draft.ward = matchedWard;
    }
  }
  if (h.latitude != null && h.longitude != null) {
    draft.latitude = h.latitude;
    draft.longitude = h.longitude;
  }
  houseInputFocused.value = false;
  highlightedHouseIndex.value = -1;
}

function clearHouse() {
  draft.house = "";
  draft.houseId = "";
  houseInputFocused.value = true;
  highlightedHouseIndex.value = -1;
  nextTick(() => {
    document.getElementById("post-house-input")?.focus();
  });
}

function onHouseInput() {
  houseInputFocused.value = true;
  highlightedHouseIndex.value = 0;
  draft.houseId = "";
}

function onHouseKeydown(event) {
  if (!houseInputFocused.value || !matchingHouses.value.length) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      houseInputFocused.value = true;
      highlightedHouseIndex.value = 0;
      event.preventDefault();
    }
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlightedHouseIndex.value =
      (highlightedHouseIndex.value + 1) % matchingHouses.value.length;
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlightedHouseIndex.value =
      (highlightedHouseIndex.value - 1 + matchingHouses.value.length) %
      matchingHouses.value.length;
  } else if (event.key === "Enter") {
    if (highlightedHouseIndex.value >= 0 && matchingHouses.value[highlightedHouseIndex.value]) {
      event.preventDefault();
      selectHouse(matchingHouses.value[highlightedHouseIndex.value]);
    }
  } else if (event.key === "Escape") {
    houseInputFocused.value = false;
    highlightedHouseIndex.value = -1;
  } else if (event.key === "Tab") {
    houseInputFocused.value = false;
  }
}

function onHouseOutside(event) {
  if (!houseDropdownRef.value?.contains(event.target)) {
    houseInputFocused.value = false;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", onHouseOutside);
  loadHouses().catch(() => {});
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", onHouseOutside);
});
const defaults = () => ({
  title: "",
  status: 'Còn phòng',
  gender: "Tất cả",
  school: "Đại học Cần Thơ",
  moveIn: "",
  people: 1,
  area: 1,
  price: "",
  perPerson: "",
  electric: "",
  water: "",
  internet: "",
  other: "",
  deposit: "",
  curfew: "",
  count: 1,
  houseId: "",
  desc: "",
  city: "Cần Thơ",
  ward: "",
  street: "",
  house: "",
  amenities: [],
  nearby: [],
  lifestyles: [],
  habits: "",
  latitude: null,
  longitude: null,
});
const draft = reactive(defaults());
const moneyFields = new Set(['price', 'perPerson', 'electric', 'water', 'internet', 'deposit']);
function updatePositiveNumber(key, event) {
  const value = event.target.value;
  draft[key] = value === '' ? '' : Math.max(1, Number(value));
  if (value !== '' && Number(value) < 1) event.target.value = '1';
}
watch(() => draft.houseId, id => {
  if (!rental.value) return;
  const house = systemHouses.value.find(house => house.id === id);
  if (!house) return;
  draft.house = house.name;
  draft.street = house.street || house.address || '';
  draft.ward = house.ward || '';
  draft.city = house.city || 'Cần Thơ';
  draft.latitude = house.latitude ?? null;
  draft.longitude = house.longitude ?? null;
});
const wardOptions = computed(() => [
  { value: '', label: 'Chọn phường / xã' },
  ...canThoUrbanWards.map(ward => ({ value: ward, label: `Phường ${ward}` })),
  // Keep the old value selectable while editing a draft created before the 2025 merger.
  ...draft.ward && !canThoUrbanWards.includes(draft.ward)
    ? [{ value: draft.ward, label: `${draft.ward} (địa chỉ cũ)` }]
    : [],
]);

function resetDraft() {
  locationRequest++;
  locating.value = false;
  locationState.value = "";
  locationNotice.value = "";
  step.value = 1;
  images.value.forEach((im) => {
    try {
      URL.revokeObjectURL(im.url);
    } catch {}
  });
  images.value = [];
  success.value = false;
  preview.value = false;
  previewPhotoIndex.value = 0;
  Object.keys(errors).forEach((k) => delete errors[k]);
  Object.assign(draft, defaults());
  state.drafts[kind.value] = {};
}

function load() {
  locationRequest++;
  locating.value = false;
  locationState.value = "";
  locationNotice.value = "";
  step.value = 1;
  images.value.forEach((im) => {
    try {
      URL.revokeObjectURL(im.url);
    } catch {}
  });
  images.value = [];
  success.value = false;
  preview.value = false;
  previewPhotoIndex.value = 0;
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (route.query.edit) {
    const item = state.posts.find((p) => p.id === route.query.edit);
    if (item) {
      Object.assign(draft, defaults(), item);
      images.value = (item.images?.length ? item.images : item.image ? [item.image] : [])
        .map((url) => ({ id: crypto.randomUUID(), url }));
      initialItem.value = JSON.stringify(item);
      const existingPhotos = item.images?.length
        ? item.images
        : item.image
          ? [item.image]
          : [];
      images.value = existingPhotos.map((url) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : "img-" + Math.random(),
        url,
        base64Promise: Promise.resolve(url),
      }));
    }
  } else {
    Object.assign(draft, defaults(), state.drafts[kind.value] || {});
    initialItem.value = null;
  }
  for (const key of ['area', 'people', 'count']) {
    if (!Number.isFinite(Number(draft[key])) || Number(draft[key]) < 1) draft[key] = 1;
  }
}
load();
watch(() => [route.params.kind, route.query.edit], load);
watch(
  draft,
  () => {
    if (!route.query.edit) {
      state.drafts[kind.value] = { ...draft };
    }
  },
  { deep: true },
);

const isDirty = computed(() => {
  if (success.value) return false;
  if (route.query.edit && initialItem.value) {
    return JSON.stringify(draft) !== initialItem.value;
  }
  if (step.value > 1) return true;
  if (images.value.length > 0) return true;
  return (
    draft.title.trim() !== "" ||
    draft.desc.trim() !== "" ||
    draft.price !== "" ||
    Number(draft.area) !== 1 ||
    Number(draft.people) !== 1 ||
    Number(draft.count) !== 1 ||
    draft.perPerson !== "" ||
    draft.electric !== "" ||
    draft.water !== "" ||
    draft.internet !== "" ||
    draft.other !== "" ||
    draft.deposit !== "" ||
    draft.curfew !== "" ||
    draft.street.trim() !== "" ||
    draft.ward !== "" ||
    draft.house.trim() !== "" ||
    draft.houseId !== "" ||
    draft.moveIn !== "" ||
    draft.habits.trim() !== "" ||
    draft.amenities.length > 0 ||
    draft.nearby.length > 0 ||
    draft.lifestyles.length > 0
  );
});

function cancelLeave() {
  leaveModal.value = false;
  if (pendingResolver) {
    pendingResolver(false);
    pendingResolver = null;
  }
  pendingAction = null;
}

function confirmLeave() {
  leaveModal.value = false;
  resetDraft();
  if (pendingAction) {
    const action = pendingAction;
    pendingAction = null;
    action();
  }
  if (pendingResolver) {
    const resolver = pendingResolver;
    pendingResolver = null;
    resolver(true);
  }
}

onBeforeRouteLeave((to, from) => {
  if (!isDirty.value || success.value) return true;
  if (pendingResolver) pendingResolver(false);
  leaveModal.value = true;
  return new Promise((resolve) => {
    pendingResolver = resolve;
  });
});

function handleBeforeUnload(e) {
  if (isDirty.value && !success.value) {
    e.preventDefault();
    e.returnValue = "";
  }
}

function handleExternalReset() {
  if (route.path.startsWith("/dang-bai")) {
    if (isDirty.value && !success.value) {
      if (pendingResolver) pendingResolver(false);
      pendingAction = () => {
        resetDraft();
        window.scrollTo({ top: 0, behavior: "smooth" });
      };
      leaveModal.value = true;
    } else {
      resetDraft();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
}

window.addEventListener("beforeunload", handleBeforeUnload);
window.addEventListener("findmyroom:reset-post-form", handleExternalReset);

onUnmounted(() => {
  locationRequest++;
  window.removeEventListener("beforeunload", handleBeforeUnload);
  window.removeEventListener("findmyroom:reset-post-form", handleExternalReset);
  images.value.forEach((im) => {
    try {
      URL.revokeObjectURL(im.url);
    } catch {}
  });
});
const fields = computed(() =>
  rental.value
    ? [
        [
          "title",
          "Tiêu đề bài đăng",
          "text",
          true,
          "Ví dụ: Phòng có gác gần Đại học Cần Thơ",
        ],
        ["houseId", "Chọn nhà trọ", "house", true],
        ["count", "Số lượng phòng", "number", true],
        ["curfew", "Giờ giấc", "time", false],
        ["deposit", "Tiền cọc (đ)", "number", false],
        ["price", "Giá thuê (đ/tháng)", "number", true],
        ["area", "Diện tích (m²)", "number", true],
        ["electric", "Giá điện (đ/kWh)", "number", true],
        ["water", "Giá nước (đ/m³)", "number", true],
        ["internet", "Tiền wifi (đ/tháng)", "number", false],
        ["other", "Chi phí khác", "text", false],
        ["people", "Số người tối đa", "number", true],
      ]
    : [
        [
          "title",
          "Tiêu đề bài đăng",
          "text",
          true,
          "Ví dụ: Tìm bạn nữ ở ghép gần trường",
        ],
        ["gender", "Đối tượng (nam/nữ)", "gender", true],
        ["school", "Trường đại học nhắm tới", "school", false],
        ["moveIn", "Ngày có thể chuyển vào", "date", true],
        ["people", "Số người cần tìm", "number", true],
        ["area", "Diện tích (m²)", "number", true],
        ["price", "Tiền trọ (đ)", "number", true],
        ["perPerson", "Dự kiến giá/người (đ)", "number", true],
        ["electric", "Tiền điện (đ/kWh)", "number", true],
        ["water", "Tiền nước (đ/m³)", "number", true],
        ["internet", "Tiền internet (đ/tháng)", "number", false],
        ["other", "Phí khác", "text", false],
      ],
);
const card = computed(() => ({
  id: "draft",
  title: draft.title || "Tiêu đề bài đăng",
  price: draft.price,
  area: draft.area,
  people: draft.people,
  district: draft.ward || "Ninh Kiều",
  address: [draft.street, draft.ward, draft.city].filter(Boolean).join(", "),
  image: images.value[0]?.url || "/illustrations/room-1.svg",
  status: "Xem trước",
  ...{ house: draft.house, houseId: draft.houseId },
}));
const previewPhotos = computed(() =>
  images.value.length
    ? images.value.map((im) => im.url)
    : ["/illustrations/room-1.svg"],
);
const activePreviewPhoto = computed(
  () => previewPhotos.value[previewPhotoIndex.value] || previewPhotos.value[0],
);
const previewTags = computed(() => [
  ...new Set([...draft.amenities, ...draft.nearby, ...draft.lifestyles].filter(Boolean)),
]);
const previewStatus = computed(() => rentalStatus(draft));
function openPreview() {
  previewPhotoIndex.value = 0;
  publishError.value = "";
  preview.value = true;
}
function validate() {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (step.value === 1) {
    for (const [key, label, type, required] of fields.value) {
      if (required) {
        const err = validateField(key, draft[key]);
        if (err) errors[key] = err;
      } else if (
        draft[key] !== "" &&
        type === "number" &&
        (!Number.isFinite(Number(draft[key])) || Number(draft[key]) < 0)
      )
        errors[key] = "Giá trị không được âm.";
    }
  }
  if (step.value === 2) {
    if (!rental.value && draft.house.trim() && !selectedHouse.value) errors.house = 'Vui lòng chọn nhà trọ trong danh sách của chủ trọ.'
    for (const k of ["ward", "street"])
      if (!draft[k].trim()) errors[k] = "Vui lòng điền địa chỉ.";
  }
  if (step.value === 3 && images.value.length < 4)
    errors.images = "Cần ít nhất 4 ảnh và tối đa 10 ảnh.";
  if (Object.keys(errors).length) {
    requestAnimationFrame(() => document.querySelector('[aria-invalid="true"]')?.focus());
    return false;
  }
  return true;
}
function next() {
  if (validate()) {
    step.value++;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
function back() {
  step.value = Math.max(1, step.value - 1);
  Object.keys(errors).forEach((k) => delete errors[k]);
}
async function compressImageFile(file, maxWidth = 1000, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof window === "undefined" || !window.Image) return resolve(result);
      const img = new Image();
      img.onload = () => {
        let w = img.width,
          h = img.height;
        if (!w || !h) return resolve(result);
        if (w > maxWidth || h > maxWidth) {
          if (w > h) {
            h = Math.round((h * maxWidth) / w);
            w = maxWidth;
          } else {
            w = Math.round((w * maxWidth) / h);
            h = maxWidth;
          }
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
async function upload(e) {
  dragging.value = false;
  uploadError.value = "";
  const files = [...(e.dataTransfer?.files || e.target?.files || [])];
  for (const file of files) {
    if (images.value.length >= 10) {
      uploadError.value = "Chỉ được tải tối đa 10 ảnh.";
      break;
    }
    const isImage =
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        file.type?.toLowerCase(),
      ) || /\.(jpe?g|png|webp)$/i.test(file.name || "");
    if (!isImage || file.size > 5 * 1024 * 1024) {
      uploadError.value = "Chỉ nhận JPG, PNG, WEBP tối đa 5 MB mỗi ảnh.";
      continue;
    }
    const blobUrl = URL.createObjectURL(file);
    const base64Promise = compressImageFile(file);
    images.value.push({
      id: crypto.randomUUID ? crypto.randomUUID() : "img-" + Date.now() + "-" + Math.random(),
      file,
      url: blobUrl,
      base64Promise,
    });
  }
  if (e.target?.type === "file") e.target.value = "";
  if (images.value.length >= 3) delete errors.images;
}

function removeImage(i) {
  if (images.value[i]?.file) {
    try {
      URL.revokeObjectURL(images.value[i].url);
    } catch {}
  }
  images.value.splice(i, 1);
}

function setCoverImage(i) {
  if (i > 0 && i < images.value.length) {
    images.value.unshift(...images.value.splice(i, 1));
  }
}
async function publish() {
  if (publishing.value) return;
  publishError.value = '';
  if (!validate()) return;
  if (images.value.length < 4) {
    preview.value = false;
    step.value = 3;
    errors.images = "Vui lòng tải lại ít nhất 4 ảnh cho bài đăng.";
    return;
  }
  const house = systemHouses.value.find((h) => h.id === draft.houseId) || state.houses.find((h) => h.id === draft.houseId);
  if (rental.value && !systemHouses.value.some(h => h.id === draft.houseId)) {
    preview.value = false;
    step.value = 1;
    errors.houseId = 'Vui lòng chọn nhà trọ đã tạo trong tài khoản của bạn.';
    return;
  }
  publishing.value = true;
  try {
    const convertedPhotos = await Promise.all(
      images.value.map(async (im) => {
        if (im.base64Promise) return await im.base64Promise;
        return im.url;
      }),
    );
    const mainImage = convertedPhotos[0] || "/illustrations/room-1.svg";
    let post = {
      ...draft,
      ...card.value,
      id: route.query.edit || "post-" + Date.now(),
      kind: kind.value,
      ownerId: state.user.id,
      status: rentalStatus(draft),
      house: house?.name || draft.house,
      houseId: house?.id || draft.houseId || "",
      image: mainImage,
      images: convertedPhotos,
    };
    post = rental.value ? await saveRental(post) : await saveRoommate(post);
    const index = state.posts.findIndex((p) => p.id === post.id);
    if (index >= 0) state.posts[index] = post;
    else state.posts.unshift(post);
    state.drafts[kind.value] = {};
    success.value = true;
    preview.value = false;
    window.scrollTo({ top: 0 });
  } catch (error) { publishError.value = error.message; }
  finally { publishing.value = false; }
}
function locate() {
  if (locating.value) return;
  if (!navigator.geolocation) {
    locationState.value = "error";
    locationNotice.value =
      "Trình duyệt này không hỗ trợ định vị. Vui lòng nhập địa chỉ bên dưới.";
    return;
  }
  const request = ++locationRequest;
  locating.value = true;
  locationState.value = "loading";
  locationNotice.value = "Đang lấy tọa độ hiện tại…";
  const failed = (error) => {
    if (request !== locationRequest) return;
    locating.value = false;
    locationState.value = "error";
    locationNotice.value =
      error?.code === 1
        ? "Bạn chưa cho phép truy cập vị trí. Hãy bật quyền định vị trên trình duyệt rồi thử lại."
        : error?.code === 3
          ? "Lấy vị trí quá thời gian chờ. Vui lòng thử lại."
          : "Chưa xác định được vị trí. Bạn có thể thử lại hoặc nhập địa chỉ bên dưới.";
  };
  try {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== locationRequest) return;
        draft.latitude = position.coords.latitude;
        draft.longitude = position.coords.longitude;
        locating.value = false;
        locationState.value = "success";
        locationNotice.value = "Đã lấy tọa độ thành công!";
      },
      failed,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  } catch {
    failed();
  }
}
</script>
<template>
  <div v-if="!state.user" class="container empty-state">
    <Icon name="edit" :size="40" />
    <h1>{{ rental ? "Đăng bài cho thuê" : "Đăng bài ghép trọ" }}</h1>
    <p>Đăng nhập để tạo bài đăng và lưu bản nháp.</p>
    <RouterLink
      :to="'/dang-nhap?redirect=' + encodeURIComponent(route.fullPath)"
      class="button primary"
      >Đăng nhập để tiếp tục</RouterLink
    >
  </div>
  <div v-else-if="rental && state.user.role !== 'landlord'" class="container empty-state">
    <h1>Đăng tin dành cho chủ trọ</h1>
    <p>Bạn có thể đăng bài ghép trọ với tài khoản sinh viên.</p>
    <RouterLink to="/dang-bai/roommate" class="button primary"
      >Đăng bài ghép trọ</RouterLink
    >
  </div>
  <div v-else-if="success" class="container empty-state">
    <span class="empty-icon"><Icon name="done" :size="40" /></span
    ><span class="eyebrow">Đã hoàn tất</span>
    <h1>Bài đăng đã được lưu</h1>
    <p>
      Bài đăng đã được lưu với trạng thái bạn đã chọn.<br />Dữ liệu chỉ được lưu trên thiết bị này.
    </p>
    <RouterLink to="/quan-ly/bai-dang" class="button primary"
      >Quản lý bài đăng <Icon name="arrow" :size="18"
    /></RouterLink>
  </div>
  <div v-else class="container page post-page">
    <div class="center">
      <span class="eyebrow">Chia sẻ không gian, mở thêm kết nối</span>
      <h1>{{ rental ? "Đăng bài cho thuê" : "Đăng bài ghép trọ" }}</h1>
      <p class="muted">Thông tin rõ ràng giúp bạn tìm đúng người nhanh hơn.</p>
    </div>
    <ol class="stepper">
      <li
        v-for="(label, i) in steps"
        :key="label"
        :class="{ current: step === i + 1, complete: step > i + 1 }"
      >
        <span class="step-number"
          ><Icon v-if="step > i + 1" name="check" :size="16" /><template v-else>{{
            i + 1
          }}</template></span
        ><span>{{ label }}</span>
      </li>
    </ol>
    <form
      class="form-panel post-panel"
      @submit.prevent="step < steps.length ? next() : publish()"
      novalidate
    >
      <template v-if="step === 1"
        ><h2>Thông tin chung</h2>
        <div class="form-grid">
          <component :is="['gender', 'house', 'school', 'status'].includes(type) || moneyFields.has(key) ? 'div' : 'label'"
            v-for="[key, label, type, required, placeholder] in fields"
            :key="key"
            class="field"
            :class="{ 'span-two': key === 'title' }"
            ><span>{{ label }} <b v-if="required" class="required">*</b></span
            ><GenderDropdown v-if="type === 'gender'" v-model="draft[key]" :label="label" /><AppDropdown
              v-else-if="type === 'school'"
              v-model="draft[key]"
              :label="label"
              placeholder="Chọn trường đại học"
              :invalid="!!errors[key]"
              :options="universityOptions"
            /><AppDropdown v-else-if="type === 'status'" v-model="draft.status" label="Trạng thái" :options="rentalStatuses" /><select
              v-else-if="type === 'house'"
              v-model="draft[key]"
              :aria-label="label + (required ? ' *' : '')"
              :aria-invalid="!!errors[key]"
            >
              <option value="">Chọn nhà trọ của bạn</option>
              <option
                v-for="h in systemHouses"
                :key="h.id"
                :value="h.id"
              >
                {{ h.name }}
              </option>
            </select><MoneyInput
              v-else-if="moneyFields.has(key)"
              v-model="draft[key]"
              :label="label + (required ? ' *' : '')"
              :invalid="!!errors[key]"
            /><input
              v-else-if="type === 'number'"
              :value="draft[key]"
              :aria-label="label + (required ? ' *' : '')"
              type="number" min="1" step="1" placeholder="Nhập giá trị"
              :aria-invalid="!!errors[key]"
              @input="updatePositiveNumber(key, $event)"
              @blur="draft[key] = draft[key] === '' ? 1 : Math.max(1, Number(draft[key]))"
            /><input
              v-else
              v-model="draft[key]"
              :aria-label="label + (required ? ' *' : '')"
              :type="type"
              :min="
                type === 'date'
                  ? new Date().toLocaleDateString('en-CA')
                  : undefined
              "
              :placeholder="
                placeholder || (type === 'number' ? 'Nhập giá trị' : 'Nhập thông tin')
              "
              :aria-invalid="!!errors[key]"
            /><small v-if="key === 'curfew'" class="muted">Để trống nếu giờ giấc tự do.</small><small class="error" v-if="errors[key]">{{ errors[key] }}</small></component
          ><label class="field span-two"
            ><span>Mô tả chi tiết</span
            ><textarea
              rows="5"
              v-model="draft.desc"
              placeholder="Mô tả phòng, người bạn muốn ở cùng và những lưu ý…"
            ></textarea>
          </label></div></template
      ><template v-if="step === 2"
        ><h2>Vị trí & Địa lý</h2>
        <div class="location-form">
          <div>
            <label class="field"
              ><span>Tỉnh / Thành phố</span><input v-model="draft.city" readonly /></label
            ><div class="field"
              ><span>Phường / Xã <b class="required">*</b></span
              ><AppDropdown v-model="draft.ward" label="Phường / Xã" :invalid="!!errors.ward" :options="wardOptions" /><small class="error">{{ errors.ward }}</small></div
            ><label class="field"
              ><span>Tên đường / số nhà <b class="required">*</b></span
              ><input
                v-model="draft.street"
                placeholder="Ví dụ: 123 đường 3/2"
                :aria-invalid="!!errors.street"
              /><small class="error">{{ errors.street }}</small></label
            ><div class="field house-autocomplete-field" ref="houseDropdownRef">
              <label for="post-house-input" class="field-label">
                <span>Tên trọ</span>
                <span class="field-optional">Không bắt buộc</span>
              </label>

              <!-- Trạng thái 1: Đã chọn nhà trọ từ hệ thống (Connected House Card) -->
              <div v-if="selectedHouse" class="selected-house-card">
                <div class="house-card-main">
                  <div class="house-icon-wrap">
                    <Icon name="home" :size="20" />
                  </div>
                  <div class="house-info-wrap">
                    <div class="house-title-row">
                      <strong class="house-name">{{ selectedHouse.name }}</strong>
                      <span class="connected-pill">
                        <Icon name="check" :size="12" /> Đã liên kết
                      </span>
                    </div>
                    <p class="house-sub-detail" v-if="selectedHouse.address">
                      <Icon name="pin" :size="12" />
                      <span>{{ selectedHouse.address }}</span>
                      <template v-if="selectedHouse.rooms">
                        <span class="sep-bullet">·</span>
                        <span>{{ selectedHouse.rooms }} phòng</span>
                      </template>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="house-change-btn"
                  title="Thay đổi hoặc nhập tên khác"
                  @click="clearHouse"
                >
                  <Icon name="close" :size="13" />
                  <span>Đổi</span>
                </button>
              </div>

              <!-- Trạng thái 2: Chưa chọn hoặc đang tìm kiếm / nhập tên tùy ý -->
              <div v-else class="autocomplete-wrapper">
                <div class="input-icon-box">
                  <Icon name="home" :size="16" />
                </div>
                <input
                  id="post-house-input"
                  v-model="draft.house"
                  placeholder="Ví dụ: Nhà trọ Minh An (gõ để tìm trọ trong hệ thống)"
                  autocomplete="off"
                  @focus="houseInputFocused = true; loadHouses().catch(() => {})"
                  @input="onHouseInput"
                  @keydown="onHouseKeydown"
                />
                <button
                  v-if="draft.house"
                  type="button"
                  class="clear-house-btn"
                  title="Xóa"
                  @click="clearHouse"
                >
                  <Icon name="close" :size="14" />
                </button>
              </div>

              <!-- Dropdown gợi ý danh sách nhà trọ trong hệ thống -->
              <div
                v-if="!selectedHouse && houseInputFocused && matchingHouses.length"
                class="house-suggestions-panel"
                role="listbox"
              >
                <div class="suggestions-header">
                  <Icon name="home" :size="13" />
                  <span>Nhà trọ có trong hệ thống ({{ matchingHouses.length }})</span>
                </div>
                <ul class="suggestions-list">
                  <li
                    v-for="(h, idx) in matchingHouses"
                    :key="h.id || h.name"
                    role="option"
                    :aria-selected="draft.houseId === h.id || draft.house === h.name"
                    class="suggestion-item"
                    :class="{
                      highlighted: idx === highlightedHouseIndex,
                      selected: draft.houseId === h.id || draft.house === h.name
                    }"
                    @mouseenter="highlightedHouseIndex = idx"
                    @mousedown.prevent="selectHouse(h)"
                  >
                    <div class="house-item-main">
                      <div class="house-item-name">
                        <strong>{{ h.name }}</strong>
                        <span v-if="h.rooms" class="house-rooms-badge">{{ h.rooms }} phòng</span>
                      </div>
                      <p v-if="h.address" class="house-item-address">
                        <Icon name="pin" :size="12" /> {{ h.address }}
                      </p>
                    </div>
                    <span v-if="draft.houseId === h.id || draft.house === h.name" class="check-icon">
                      <Icon name="check" :size="16" />
                    </span>
                  </li>
                </ul>
              </div>

              <p class="house-meta-hint" :class="{ 'is-linked': selectedHouse }">
                <Icon :name="selectedHouse ? 'check' : 'info'" :size="15" />
                <span v-if="selectedHouse">
                  Thông tin và đánh giá của <strong>{{ selectedHouse.name }}</strong> sẽ xuất hiện cùng bài đăng.
                </span>
                <span v-else>
                  Gõ để tìm nhà trọ có sẵn nhằm tự động gắn kèm đánh giá và vị trí.
                </span>
              </p>
              <p v-if="houseDirectory.error || errors.house" class="error" role="alert">{{ houseDirectory.error || errors.house }}</p>
              <p v-else-if="houseDirectory.loading" class="help" role="status">Đang tải nhà trọ của chủ trọ…</p>
              <p v-else-if="houseInputFocused && !matchingHouses.length" class="help">Không có nhà trọ phù hợp trong danh sách của chủ trọ.</p>
            </div><button
              type="button"
              class="button secondary location-button"
              :disabled="locating"
              :aria-busy="locating"
              @click="locate"
            >
              <Icon name="pin" :size="18" />{{
                locating ? "Đang lấy vị trí…" : "Vị trí hiện tại"
              }}
            </button>
            <div
              v-if="locationNotice"
              class="location-feedback"
              :class="locationState"
              :role="locationState === 'error' ? 'alert' : 'status'"
            >
              <Icon :name="locationState === 'success' ? 'check' : 'info'" :size="19" />
              <p>{{ locationNotice }}</p>
            </div>
          </div>
          <div>
            <MapPanel :label="draft.house || 'Đại học Cần Thơ'" :address="draft.street" />
          </div>
        </div></template
      ><template v-if="step === 3"
        ><h2>Hình ảnh chỗ ở</h2>

        <p class="muted">Tải từ 4 đến 10 ảnh. Ảnh đầu tiên sẽ làm ảnh bìa.</p>
        <label
          class="upload-zone"
          :class="{ dragging }"
          @dragover.prevent="dragging = true; $event.dataTransfer.dropEffect = 'copy'"
          @dragleave.prevent="dragging = false"
          @drop.stop.prevent="upload"
          ><Icon name="upload" :size="42" /><strong>Nhấp để chọn hoặc kéo ảnh vào đây</strong
          ><span>JPG, PNG, WEBP · tối đa 5 MB mỗi ảnh</span
          ><input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            @change="upload"
            @dragover.prevent="dragging = true; if ($event.dataTransfer) $event.dataTransfer.dropEffect = 'copy'"
            @dragleave.prevent="dragging = false"
            @drop.stop.prevent="upload"
            aria-label="Tải hình ảnh chỗ ở"
        /></label>
        <p class="error" v-if="uploadError || errors.images" role="alert">
          {{ uploadError || errors.images }}
        </p>
        <div class="upload-grid">
          <div v-for="(im, i) in images" :key="im.id">
            <img :src="im.url" :alt="'Ảnh phòng ' + (i + 1)" />
            <span v-if="i === 0" class="badge">Ảnh bìa</span>
            <button
              v-else
              type="button"
              class="photo-cover-btn"
              @click="setCoverImage(i)"
            >
              Đặt làm ảnh bìa
            </button>
            <button
              type="button"
              class="icon-button"
              @click="removeImage(i)"
              :aria-label="'Xóa ảnh ' + (i + 1)"
            >
              <Icon name="close" :size="16" />
            </button>
          </div>
        </div>
      </template>
      <template v-if="step === 4"
        ><h2>Tiện ích chỗ ở</h2>
        <fieldset
          v-for="[label, key, items] in [
            ['Tiện ích nội khu', 'amenities', amenities],
            ['Tiện ích ngoại khu', 'nearby', nearby],
            ['Phong cách sống', 'lifestyles', lifestyles],
          ]"
          :key="key"
          class="post-amenity-group"
        >
          <legend>{{ label }}</legend>
          <div class="amenity-checks">
            <label v-for="a in items" :key="a" class="check"
              ><input type="checkbox" :value="a" v-model="draft[key]" />{{ a }}</label
            >
          </div>
        </fieldset>
        <label class="field"
          ><span>Thói quen sống / lưu ý khác</span
          ><textarea
            v-model="draft.habits"
            rows="3"
            placeholder="Những điều bạn mong muốn ở người ở cùng…"
          ></textarea></label></template
      >
      <div class="form-actions">
        <button
          type="button"
          class="button secondary"
          @click="step === 1 ? router.push('/quan-ly/bai-dang') : back()"
        >
          <Icon name="back" :size="17" />{{ step === 1 ? "Hủy" : "Trước" }}
        </button>
        <div class="inline">
          <button
            v-if="step === steps.length"
            type="button"
            class="button secondary preview-trigger-btn"
            @click="openPreview"
          >
            <Icon name="eye" :size="17" />Xem trước</button
          ><button
            class="button primary"
            :disabled="publishing"
            :class="{ 'post-submit': step === steps.length }"
          >
            {{ publishing ? 'Đang lưu…' : step === steps.length ? "Đăng bài" : "Tiếp theo" }}
            <Icon name="arrow" :size="17" />
          </button>
        </div>
      </div>
      <p v-if="publishError" role="alert" class="error">{{ publishError }}</p>
    </form>
    <Teleport to="body"
      ><div
        v-if="leaveModal"
        class="modal-backdrop"
        @click.self="cancelLeave"
        @keydown.esc="cancelLeave"
      >
        <section
          class="modal"
          v-dialog-focus
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-warning-title"
        >
          <span class="empty-icon coral"><Icon name="info" :size="28" /></span>
          <h2 id="leave-warning-title">Rời khỏi các bước đăng bài?</h2>
          <p>Bạn có chắc chắn muốn thoát không?</p>
          <p class="muted">Nếu thoát lúc này, toàn bộ dữ liệu đang ghi sẽ bị mất.</p>
          <div class="form-actions">
            <button type="button" class="button secondary" @click="cancelLeave">
              Ở lại tiếp tục</button
            ><button type="button" class="button danger" @click="confirmLeave">
              Thoát & Xóa dữ liệu
            </button>
          </div>
        </section>
      </div>
      <div
        v-if="preview"
        class="modal-backdrop preview-backdrop"
        @click.self="preview = false"
        @keydown.esc="preview = false"
      >
        <section
          class="modal large preview-modal"
          v-dialog-focus
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
        >
          <header class="preview-modal-header">
            <div class="preview-header-meta">
              <div class="preview-badges">
                <span class="preview-kind-pill">
                  <Icon :name="rental ? 'home' : 'users'" :size="13" />
                  {{ rental ? "Cho thuê phòng trọ" : "Tìm bạn ghép trọ" }}
                </span>
                <span
                  class="preview-status-pill"
                  :class="{ 'is-available': previewStatus === 'Còn phòng' }"
                >
                  {{ previewStatus }}
                </span>
              </div>
              <h2 id="preview-title">
                {{ rental ? "Xem trước bài đăng" : "Xem trước bài ghép trọ" }}
              </h2>
            </div>
            <button
              type="button"
              class="icon-button preview-close-btn"
              @click="preview = false"
              aria-label="Đóng"
            >
              <Icon name="close" :size="18" />
            </button>
          </header>

          <div class="preview-modal-body">
            <div class="preview-gallery">
              <div class="preview-hero">
                <img
                  class="preview-hero-image"
                  :src="activePreviewPhoto"
                  :alt="draft.title || 'Ảnh xem trước bài đăng'"
                />
                <span v-if="previewPhotoIndex === 0 && images.length" class="badge preview-cover-badge">
                  Ảnh bìa
                </span>
                <span v-if="images.length" class="preview-photo-count">
                  <Icon name="images" :size="13" />
                  {{ previewPhotoIndex + 1 }} / {{ previewPhotos.length }} ảnh
                </span>
              </div>
              <div v-if="previewPhotos.length > 1" class="preview-thumbs" role="group" aria-label="Chọn ảnh xem trước">
                <button
                  v-for="(src, idx) in previewPhotos"
                  :key="idx"
                  type="button"
                  class="preview-thumb-btn"
                  :class="{ active: idx === previewPhotoIndex }"
                  :aria-label="`Xem ảnh ${idx + 1}`"
                  :aria-pressed="idx === previewPhotoIndex"
                  @click="previewPhotoIndex = idx"
                >
                  <img :src="src" :alt="`Ảnh thu nhỏ ${idx + 1}`" />
                </button>
              </div>
            </div>

            <div class="preview-summary-card">
              <div class="preview-summary-top">
                <div class="preview-title-block">
                  <h3>{{ draft.title || "Tiêu đề bài đăng" }}</h3>
                  <div class="preview-location-row">
                    <span v-if="draft.house" class="preview-house-pill">
                      <Icon name="building" :size="13" />
                      {{ draft.house }}
                    </span>
                    <p class="preview-address">
                      <Icon name="pin" :size="14" />
                      <span>{{ card.address || "Cần Thơ" }}</span>
                    </p>
                  </div>
                </div>
                <div class="preview-price-box">
                  <p class="price preview-price">
                    {{ money(rental ? draft.price : draft.perPerson || draft.price) }}
                    <span>{{ rental ? "/ tháng" : "/ người" }}</span>
                  </p>
                  <span v-if="rental && draft.deposit" class="preview-price-sub">
                    Tiền cọc: {{ money(draft.deposit) }}
                  </span>
                  <span v-else-if="!rental && draft.perPerson && draft.price" class="preview-price-sub">
                    Tổng phòng: {{ money(draft.price) }} / tháng
                  </span>
                </div>
              </div>

              <div class="preview-specs">
                <div class="preview-spec-item">
                  <span class="spec-label">Diện tích</span>
                  <strong class="spec-value">{{ draft.area ? `${draft.area} m²` : "Chưa nhập" }}</strong>
                </div>
                <div class="preview-spec-item">
                  <span class="spec-label">{{ rental ? "Tối đa" : "Cần tìm" }}</span>
                  <strong class="spec-value">
                    {{ draft.people || 1 }} người{{ !rental && draft.gender && draft.gender !== "Tất cả" ? ` (${draft.gender})` : "" }}
                  </strong>
                </div>
                <div v-if="rental" class="preview-spec-item">
                  <span class="spec-label">Số phòng</span>
                  <strong class="spec-value">{{ draft.count || 1 }} phòng</strong>
                </div>
                <div v-else class="preview-spec-item">
                  <span class="spec-label">Chuyển vào</span>
                  <strong class="spec-value">{{ draft.moveIn || "Linh hoạt" }}</strong>
                </div>
                <div class="preview-spec-item">
                  <span class="spec-label">Điện / Nước</span>
                  <strong class="spec-value">
                    {{ draft.electric ? `${money(draft.electric)}/kWh` : "—" }} ·
                    {{ draft.water ? `${money(draft.water)}/m³` : "—" }}
                  </strong>
                </div>
              </div>

              <div v-if="!rental && draft.school" class="preview-meta-line">
                <Icon name="graduate" :size="15" />
                <span><strong>Trường nhắm tới:</strong> {{ draft.school }}</span>
              </div>
              <div v-if="draft.internet || draft.other" class="preview-meta-line">
                <Icon name="wallet" :size="15" />
                <span>
                  <template v-if="draft.internet"><strong>Wifi:</strong> {{ money(draft.internet) }}/tháng</template>
                  <template v-if="draft.internet && draft.other"> · </template>
                  <template v-if="draft.other"><strong>Chi phí khác:</strong> {{ draft.other }}</template>
                </span>
              </div>
            </div>

            <div v-if="draft.desc || (!rental && draft.habits)" class="preview-text-block">
              <template v-if="draft.desc">
                <h4>Mô tả chi tiết</h4>
                <p>{{ draft.desc }}</p>
              </template>
              <template v-if="!rental && draft.habits">
                <h4>Thói quen sống &amp; lưu ý</h4>
                <p>{{ draft.habits }}</p>
              </template>
            </div>

            <div v-if="previewTags.length" class="preview-tags-block">
              <h4>Tiện ích &amp; phong cách sống</h4>
              <div class="tags preview-tags">
                <span v-for="a in previewTags" :key="a">{{ a }}</span>
              </div>
            </div>

            <p class="preview-helper-note">
              <Icon name="info" :size="15" />
              <span>Kiểm tra thông tin trước khi đăng. Bạn có thể bấm Chỉnh sửa để quay lại biểu mẫu.</span>
            </p>
          </div>

          <footer class="preview-modal-footer">
            <p v-if="publishError" role="alert" class="error preview-error">{{ publishError }}</p>
            <div class="form-actions preview-footer-actions">
              <button type="button" class="button secondary" @click="preview = false">
                <Icon name="edit" :size="16" />Chỉnh sửa
              </button>
              <button
                type="button"
                class="button primary post-submit"
                :disabled="publishing"
                @click="publish"
              >
                {{ publishing ? "Đang lưu…" : "Đăng bài" }}
                <Icon name="arrow" :size="17" />
              </button>
            </div>
          </footer>
        </section>
      </div></Teleport
    >
  </div>
</template>

<style scoped>
.post-panel .form-grid > .field { position: relative; }
.post-panel .form-grid > .field > small.error { position: absolute; top: calc(100% + 3px); left: 0; }
.post-panel .post-amenity-group { margin-bottom: 24px; }
.post-amenity-group legend { margin-bottom: 14px; }
.post-amenity-group .amenity-checks { border: 1px solid var(--muted); padding: 12px 16px; }
@media (max-width: 700px) {
  .post-amenity-group .amenity-checks { padding: 10px; }
}
/* Autocomplete nhà trọ */
.house-autocomplete-field {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 500;
  font-size: 14px;
  color: var(--ink, #131414);
}
.field-optional {
  font-size: 12px;
  font-weight: 400;
  color: var(--muted, #647076);
}

.selected-house-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  background: #ffffff;
  border: 1px solid rgba(140, 148, 150, 0.45);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(19, 20, 20, 0.04);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.selected-house-card:hover {
  border-color: #638d92;
  box-shadow: 0 2px 8px rgba(99, 141, 146, 0.12);
}
.house-card-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.house-icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #edf5f4;
  color: #3b6c67;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.house-info-wrap {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.house-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.house-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--ink, #131414);
}
.connected-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  color: #1e6b45;
  background: #edf7f0;
  border: 1px solid #cce8d4;
  border-radius: 999px;
  padding: 1px 7px;
}
.house-sub-detail {
  margin: 0;
  font-size: 12px;
  color: var(--muted, #647076);
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sep-bullet {
  color: rgba(140, 148, 150, 0.6);
}
.house-change-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink, #131414);
  background: #f7f9fa;
  border: 1px solid rgba(140, 148, 150, 0.35);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}
.house-change-btn:hover {
  background: #ebf0f2;
  border-color: rgba(140, 148, 150, 0.6);
  color: #131414;
}

/* Khung nhập liệu tìm kiếm */
.autocomplete-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.input-icon-box {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--muted, #647076);
  pointer-events: none;
  display: flex;
  align-items: center;
}
.autocomplete-wrapper input {
  width: 100%;
  padding-left: 44px !important;
  padding-right: 36px;
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(140, 148, 150, 0.4);
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.autocomplete-wrapper input:focus {
  border-color: #638d92;
  box-shadow: 0 0 0 3px rgba(143, 200, 207, 0.35);
  outline: none;
}
.clear-house-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--muted, #647076);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: color 0.15s, background 0.15s;
}
.clear-house-btn:hover {
  color: var(--ink, #131414);
  background: rgba(0, 0, 0, 0.06);
}

/* Panel gợi ý thả xuống */
.house-suggestions-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  background: #fff;
  border: 1px solid rgba(140, 148, 150, 0.35);
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(19, 20, 20, 0.12);
  overflow: hidden;
  animation: fadeInDown 0.15s ease-out;
}
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.suggestions-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  background: #f7f9fa;
  border-bottom: 1px solid rgba(140, 148, 150, 0.2);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--muted, #647076);
  letter-spacing: 0.2px;
}
.suggestions-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 240px;
  overflow-y: auto;
}
.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.12s;
  gap: 10px;
}
.suggestion-item:hover,
.suggestion-item.highlighted {
  background: var(--cream, #faf7f0);
}
.suggestion-item.selected {
  background: var(--cream-deep, #f8eed3);
}
.house-item-main {
  flex: 1;
  min-width: 0;
}
.house-item-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ink, #131414);
}
.house-rooms-badge {
  font-size: 11px;
  font-weight: 500;
  color: #3b6c67;
  background: #edf5f4;
  padding: 1px 6px;
  border-radius: 4px;
}
.house-item-address {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--muted, #647076);
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.check-icon {
  color: #b4831e;
  display: flex;
  align-items: center;
}

.house-meta-hint {
  margin: 2px 0 0;
  display: inline-flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #52666a;
}
.house-meta-hint svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #5a8286;
}
.house-meta-hint.is-linked {
  padding: 9px 12px;
  background: #edf6f2;
  border: 1px solid #d7e9df;
  border-radius: 9px;
  color: #305b49;
}
.house-meta-hint.is-linked svg {
  color: #317357;
}
.house-meta-hint strong {
  color: inherit;
  font-weight: 700;
}

/* Preview trigger & unified modal */
.preview-trigger-btn {
  min-height: 44px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}
.preview-backdrop {
  padding: 20px;
}
.preview-modal {
  width: min(760px, 100%);
  max-height: min(88dvh, 860px);
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--line);
  background: var(--cream, #faf7f0);
}
.preview-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 26px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--cream, #faf7f0);
}
.preview-header-meta {
  min-width: 0;
  flex: 1;
}
.preview-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.preview-kind-pill,
.preview-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.preview-kind-pill {
  background: var(--cream-deep, #f8eed3);
  color: var(--ink, #131414);
  border: 1px solid rgba(19, 20, 20, 0.12);
}
.preview-status-pill {
  background: #eceeed;
  color: #364146;
}
.preview-status-pill.is-available {
  background: #276b50;
  color: #ffffff;
}
.preview-modal-header h2 {
  margin: 0;
  font-size: 23px;
  line-height: 1.25;
  color: var(--ink, #131414);
}
.preview-close-btn {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.preview-close-btn:hover {
  background: var(--cream-deep, #f8eed3);
}
.preview-modal-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 22px 26px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.preview-gallery {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview-hero {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  background: #ffffff;
}
.preview-hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 300px;
  object-fit: cover;
  display: block;
}
.preview-cover-badge {
  position: absolute;
  top: 12px;
  left: 12px;
}
.preview-photo-count {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(19, 20, 20, 0.78);
  color: #ffffff;
  font-size: 12px;
  font-weight: 500;
}
.preview-thumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.preview-thumb-btn {
  flex: 0 0 auto;
  width: 60px;
  height: 48px;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid transparent;
  background: #ffffff;
  opacity: 0.72;
  cursor: pointer;
  transition: opacity 0.18s ease, border-color 0.18s ease;
}
.preview-thumb-btn:hover {
  opacity: 1;
}
.preview-thumb-btn.active {
  opacity: 1;
  border-color: var(--ink, #131414);
}
.preview-thumb-btn img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.preview-summary-card {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.preview-summary-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.preview-title-block {
  flex: 1 1 280px;
  min-width: 0;
}
.preview-title-block h3 {
  margin: 0;
  font-size: 20px;
  line-height: 1.35;
  color: var(--ink, #131414);
  overflow-wrap: anywhere;
}
.preview-location-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 8px;
}
.preview-house-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 6px;
  background: #edf5f4;
  color: #29524e;
  font-size: 12px;
  font-weight: 600;
}
.preview-address {
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #4d575c;
  line-height: 1.45;
}
.preview-address svg {
  flex-shrink: 0;
  color: #3f7177;
}
.preview-price-box {
  text-align: right;
  flex-shrink: 0;
}
.preview-price {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--ink, #131414);
  font-variant-numeric: tabular-nums;
}
.preview-price span {
  font-size: 13px;
  font-weight: 500;
  color: #4d575c;
}
.preview-price-sub {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #4d575c;
}
.preview-specs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.preview-spec-item {
  background: var(--cream, #faf7f0);
  border: 1px solid rgba(19, 20, 20, 0.08);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.spec-label {
  font-size: 11px;
  font-weight: 500;
  color: #4d575c;
}
.spec-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink, #131414);
  overflow-wrap: anywhere;
}
.preview-meta-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  line-height: 1.5;
  color: #364146;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
.preview-meta-line svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #3f7177;
}
.preview-text-block,
.preview-tags-block {
  background: #ffffff;
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px 20px;
}
.preview-text-block h4,
.preview-tags-block h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink, #131414);
}
.preview-text-block h4 + p + h4 {
  margin-top: 16px;
}
.preview-text-block p {
  margin: 0;
  font-size: 14px;
  line-height: 1.65;
  color: #24292c;
  white-space: pre-line;
  max-width: 68ch;
}
.preview-tags {
  margin: 0;
}
.preview-helper-note {
  margin: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #4d575c;
  padding: 2px 2px 0;
}
.preview-helper-note svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: #3f7177;
}
.preview-modal-footer {
  padding: 14px 26px 18px;
  border-top: 1px solid var(--line);
  background: var(--cream, #faf7f0);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview-error {
  margin: 0;
}
.preview-footer-actions {
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
  justify-content: flex-end;
}
.preview-footer-actions .button {
  min-height: 44px;
  cursor: pointer;
}
@media (max-width: 700px) {
  .preview-backdrop {
    padding: 12px;
  }
  .preview-modal {
    max-height: calc(100dvh - 24px);
    border-radius: 16px;
  }
  .preview-modal-header {
    padding: 16px 18px 14px;
  }
  .preview-modal-header h2 {
    font-size: 20px;
  }
  .preview-modal-body {
    padding: 16px 18px;
    gap: 14px;
  }
  .preview-hero-image {
    aspect-ratio: 4 / 3;
    max-height: 230px;
  }
  .preview-summary-card,
  .preview-text-block,
  .preview-tags-block {
    padding: 14px 16px;
  }
  .preview-price-box {
    text-align: left;
  }
  .preview-specs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .preview-modal-footer {
    padding: 12px 18px 16px;
  }
  .preview-footer-actions {
    width: 100%;
    justify-content: stretch;
  }
  .preview-footer-actions .button {
    flex: 1;
    justify-content: center;
  }
}
@media (prefers-reduced-motion: reduce) {
  .preview-trigger-btn,
  .preview-close-btn,
  .preview-thumb-btn {
    transition: none;
  }
}
</style>
