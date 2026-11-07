<script setup>
import { computed, reactive, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRoute, useRouter, onBeforeRouteLeave } from "vue-router";
import Icon from "../components/Icon.vue";
import MapPanel from "../components/MapPanel.vue";
import RoomCard from "../components/RoomCard.vue";
import GenderDropdown from "../components/GenderDropdown.vue";
import AppDropdown from "../components/AppDropdown.vue";
import universities from "../../data/university.json";
import { canThoUrbanWards } from "../data/can-tho-wards";
import { amenities, nearby, lifestyles, money, boardingHouses } from "../data";
import { state, validateField } from "../store";
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
  success = ref(false),
  errors = reactive({}),
  uploadError = ref(""),
  locationNotice = ref(""),
  locationState = ref(""),
  locating = ref(false),
  dragging = ref(false),
  images = ref([]);
const leaveModal = ref(false),
  initialItem = ref(null);
let locationRequest = 0,
  pendingResolver = null,
  pendingAction = null;
const steps = computed(() =>
  rental.value
    ? ["Thông tin chung", "Vị trí & Địa lý", "Hình ảnh", "Tiện ích", "Xem trước"]
    : ["Thông tin chung", "Vị trí & Địa lý", "Hình ảnh", "Tiện ích"],
);

const houseInputFocused = ref(false);
const highlightedHouseIndex = ref(-1);
const houseDropdownRef = ref(null);

const systemHouses = computed(() => {
  const list = [...state.houses];
  for (const h of boardingHouses) {
    if (!list.some((item) => item.id === h.id || item.name === h.name)) {
      list.push(h);
    }
  }
  return list;
});

const matchingHouses = computed(() => {
  const q = (draft.house || "").trim().toLowerCase();
  if (!q) return systemHouses.value.slice(0, 8);
  return systemHouses.value
    .filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        (h.address && h.address.toLowerCase().includes(q))
    )
    .slice(0, 8);
});

const selectedHouse = computed(() => {
  if (draft.houseId) {
    return systemHouses.value.find((h) => h.id === draft.houseId) || null;
  }
  if (draft.house) {
    return (
      systemHouses.value.find(
        (h) => h.name.toLowerCase().trim() === draft.house.toLowerCase().trim()
      ) || null
    );
  }
  return null;
});

function selectHouse(h) {
  draft.house = h.name;
  draft.houseId = h.id;
  if (h.address) {
    if (!draft.street.trim()) {
      draft.street = h.address;
    }
    const wards = ["Xuân Khánh", "An Bình", "Hưng Lợi", "An Khánh", "Hưng Phú", "Bình Thủy"];
    const matchedWard = wards.find((w) => h.address.includes(w));
    if (matchedWard && !draft.ward) {
      draft.ward = matchedWard;
    }
  }
  if (h.house_latitude && h.house_longitude) {
    draft.latitude = h.house_latitude;
    draft.longitude = h.house_longitude;
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
  const match = systemHouses.value.find(
    (h) => h.name.toLowerCase().trim() === draft.house.toLowerCase().trim()
  );
  draft.houseId = match ? match.id : "";
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
});
onUnmounted(() => {
  document.removeEventListener("pointerdown", onHouseOutside);
});
const defaults = () => ({
  title: "",
  gender: "Tất cả",
  school: "Đại học Cần Thơ",
  moveIn: "",
  people: 1,
  area: "",
  price: "",
  perPerson: "",
  electric: "",
  water: "",
  internet: "",
  other: "",
  deposit: "",
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
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (route.query.edit) {
    const item = state.posts.find((p) => p.id === route.query.edit);
    if (item) {
      Object.assign(draft, defaults(), item);
      images.value = (item.images?.length ? item.images : item.image ? [item.image] : [])
        .map((url) => ({ id: crypto.randomUUID(), url }));
      initialItem.value = JSON.stringify(item);
    }
  } else {
    Object.assign(draft, defaults(), state.drafts[kind.value] || {});
    initialItem.value = null;
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
  if (step.value > 1) return true;
  if (images.value.length > 0) return true;
  if (route.query.edit && initialItem.value) {
    return JSON.stringify(draft) !== initialItem.value;
  }
  return (
    draft.title.trim() !== "" ||
    draft.desc.trim() !== "" ||
    draft.price !== "" ||
    draft.area !== "" ||
    draft.perPerson !== "" ||
    draft.electric !== "" ||
    draft.water !== "" ||
    draft.internet !== "" ||
    draft.other !== "" ||
    draft.deposit !== "" ||
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
  const files = [...(e.dataTransfer?.files || e.target.files || [])];
  for (const file of files) {
    if (images.value.length >= 10) {
      uploadError.value = "Chỉ được tải tối đa 10 ảnh.";
      break;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      uploadError.value = "Chỉ nhận JPG, PNG, WEBP tối đa 10 MB mỗi ảnh.";
      continue;
    }
    const blobUrl = URL.createObjectURL(file);
    const base64Promise = compressImageFile(file);
    images.value.push({ id: crypto.randomUUID(), file, url: blobUrl, base64Promise });
  }
  if (e.target.type === "file") e.target.value = "";
  if (images.value.length >= 4) delete errors.images;
}
function removeImage(i) {
  if (images.value[i]?.file) {
    try {
      URL.revokeObjectURL(images.value[i].url);
    } catch {}
  }
  images.value.splice(i, 1);
}
async function publish() {
  if (!validate()) return;
  if (images.value.length < 4) {
    step.value = 3;
    errors.images = "Vui lòng tải lại ít nhất 4 ảnh cho bài đăng.";
    return;
  }
  const house = systemHouses.value.find((h) => h.id === draft.houseId) || state.houses.find((h) => h.id === draft.houseId);
  const convertedPhotos = await Promise.all(
    images.value.map(async (im) => {
      if (im.base64Promise) return await im.base64Promise;
      return im.url;
    }),
  );
  const mainImage = convertedPhotos[0] || "/illustrations/room-1.svg";
  const post = {
    ...draft,
    ...card.value,
    id: route.query.edit || "post-" + Date.now(),
    kind: kind.value,
    ownerId: state.user.id,
    status: "Chờ duyệt",
    house: house?.name || draft.house,
    houseId: house?.id || draft.houseId || "",
    image: mainImage,
    images: convertedPhotos,
  };
  const index = state.posts.findIndex((p) => p.id === post.id);
  if (index >= 0) state.posts[index] = post;
  else state.posts.unshift(post);
  state.drafts[kind.value] = {};
  success.value = true;
  preview.value = false;
  window.scrollTo({ top: 0 });
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
        locationNotice.value =
          "Đã lấy tọa độ thành công! Vĩ độ: " +
          draft.latitude.toFixed(5) +
          ", kinh độ: " +
          draft.longitude.toFixed(5) +
          ". Vui lòng kiểm tra và điền địa chỉ bên trên.";
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
      Bài đăng ở trạng thái chờ duyệt trong bản demo.<br />Dữ liệu chỉ được lưu trên thiết
      bị này.
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
          <component :is="['gender', 'house', 'school'].includes(type) ? 'div' : 'label'"
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
            /><select
              v-else-if="type === 'house'"
              v-model="draft[key]"
              :aria-label="label + (required ? ' *' : '')"
              :aria-invalid="!!errors[key]"
            >
              <option value="">Chọn nhà trọ của bạn</option>
              <option
                v-for="h in state.houses.filter((h) => h.status === 'Đang hoạt động')"
                :key="h.id"
                :value="h.id"
              >
                {{ h.name }}
              </option>
            </select><input
              v-else
              v-model="draft[key]"
              :aria-label="label + (required ? ' *' : '')"
              :type="type"
              :min="
                type === 'date'
                  ? new Date().toLocaleDateString('en-CA')
                  : type === 'number'
                    ? 0
                    : undefined
              "
              :placeholder="
                placeholder || (type === 'number' ? 'Nhập giá trị' : 'Nhập thông tin')
              "
              :aria-invalid="!!errors[key]"
            /><small class="error" v-if="errors[key]">{{ errors[key] }}</small></component
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
                  @focus="houseInputFocused = true"
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
          @drop.prevent="upload"
          ><Icon name="upload" :size="42" /><strong
            >Nhấp để chọn hoặc kéo ảnh vào đây</strong
          ><span>JPG, PNG, WEBP · tối đa 10 MB mỗi ảnh</span
          ><input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            @change="upload"
            aria-label="Tải hình ảnh chỗ ở"
        /></label>
        <p class="error" v-if="uploadError || errors.images" role="alert">
          {{ uploadError || errors.images }}
        </p>
        <div class="upload-grid">
          <div v-for="(im, i) in images" :key="im.id">
            <img :src="im.url" :alt="'Ảnh phòng ' + (i + 1)" /><span
              v-if="i === 0"
              class="badge"
              >Ảnh bìa</span
            ><button
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
      ><template v-if="step === 5"
        ><h2>Xem trước bài đăng</h2>
        <div class="preview-grid">
          <RoomCard :room="card" />
          <div>
            <h3>Chi tiết</h3>
            <p>{{ draft.desc }}</p>
            <p><strong>Địa chỉ:</strong> {{ card.address }}</p>
            <p>
              <strong>Diện tích:</strong> {{ draft.area }} m² · {{ draft.people }} người
            </p>
            <p><strong>Giá thuê:</strong> {{ money(draft.price) }} / tháng</p>
            <div class="tags">
              <span v-for="a in draft.amenities" :key="a">{{ a }}</span>
            </div>
            <p class="help">
              Kiểm tra thông tin trước khi đăng. Bạn có thể quay lại để chỉnh sửa.
            </p>
          </div>
        </div></template
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
            v-if="!rental && step === 4"
            type="button"
            class="button secondary"
            @click="preview = true"
          >
            <Icon name="eye" :size="17" />Xem trước</button
          ><button
            class="button primary"
            :class="{ 'post-submit': step === steps.length }"
          >
            {{ step === steps.length ? "Đăng bài" : "Tiếp theo" }}
            <Icon name="arrow" :size="17" />
          </button>
        </div>
      </div>
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
        class="modal-backdrop"
        @click.self="preview = false"
        @keydown.esc="preview = false"
      >
        <section
          class="modal large"
          v-dialog-focus
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
        >
          <div class="section-heading">
            <h2 id="preview-title">Xem trước bài ghép trọ</h2>
            <button class="icon-button" @click="preview = false" aria-label="Đóng">
              <Icon name="close" />
            </button>
          </div>
          <img class="preview-image" :src="card.image" :alt="draft.title" />
          <h3>{{ draft.title || "Tiêu đề bài đăng" }}</h3>
          <p class="price">{{ money(draft.perPerson || draft.price) }} / người</p>
          <p>{{ card.address }}</p>
          <p>{{ draft.desc }}</p>
          <div class="tags">
            <span v-for="a in [...draft.amenities, ...draft.lifestyles]" :key="a">{{
              a
            }}</span>
          </div>
          <div class="form-actions">
            <button class="button secondary" @click="preview = false">Chỉnh sửa</button
            ><button class="button primary post-submit" @click="publish">Đăng bài</button>
          </div>
        </section>
      </div></Teleport
    >
  </div>
</template>

<style scoped>
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

/* Thẻ nhà trọ đã liên kết (Selected House Card) */
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
</style>
