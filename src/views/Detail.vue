<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "../components/Icon.vue";
import MapPanel from "../components/MapPanel.vue";
import { rooms, money, sampleHouseReviews } from "../data";
import { roommateListings } from "../listings";
import { state, toggleFavorite } from "../store";

const route = useRoute(),
  router = useRouter();
const room = computed(() => {
  const id = route.params.id;
  const all = [...state.posts, ...roommateListings, ...rooms];
  return all.find((r) => r.id === id || r.personId === id || r.id === `ghep-${id}`);
});
const isRoommate = computed(() => room.value?.kind === "roommate");
const houseId = computed(() =>
  !isRoommate.value && typeof room.value?.houseId === "string" ? room.value.houseId : "",
);
const reviews = ref([]),
  reviewContent = ref(""),
  reviewError = ref(""),
  reviewsLoading = ref(false),
  reviewSaving = ref(false);
const reviewRating = ref(0), reviewImage = ref("");
const houseReviews = computed(() => [...reviews.value, ...sampleHouseReviews.filter(review => review.houseId === houseId.value)]);
watch(
  houseId,
  async (id, _, onCleanup) => {
    reviews.value = [];
    reviewContent.value = "";
    reviewRating.value = 0;
    reviewImage.value = "";
    reviewError.value = "";
    if (!id) {
      reviewsLoading.value = false;
      return;
    }
    const controller = new AbortController();
    onCleanup(() => controller.abort());
    reviewsLoading.value = true;
    try {
      const response = await fetch(
        "/api/house-reviews?houseId=" + encodeURIComponent(id),
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error();
      reviews.value = (await response.json()).reviews;
    } catch (error) {
      if (error.name !== "AbortError")
        reviewError.value = "Không tải được bình luận. Vui lòng tải lại trang.";
    } finally {
      if (!controller.signal.aborted) reviewsLoading.value = false;
    }
  },
  { immediate: true },
);
async function submitReview() {
  const content = reviewContent.value.trim(),
    id = houseId.value;
  if (!content) {
    reviewError.value = "Vui lòng nhập bình luận.";
    return;
  }
  if (!reviewRating.value) { reviewError.value = "Vui lòng chọn số sao."; return; }
  if (!id || reviewSaving.value) return;
  reviewError.value = "";
  reviewSaving.value = true;
  try {
    const response = await fetch("/api/house-reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseId: id, content, rating: reviewRating.value, image: reviewImage.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Không gửi được bình luận.");
    if (houseId.value === id) {
      reviews.value.unshift(data.review);
      reviewContent.value = "";
      reviewRating.value = 0;
      reviewImage.value = "";
    }
  } catch (error) {
    if (houseId.value === id)
      reviewError.value = error.message || "Không gửi được bình luận. Vui lòng thử lại.";
  } finally {
    reviewSaving.value = false;
  }
}
function selectReviewImage(event) {
  const file = event.target.files?.[0];
  reviewImage.value = "";
  event.target.value = "";
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_000_000) { reviewError.value = "Chọn ảnh JPG, PNG hoặc WEBP không quá 1 MB."; return; }
  const reader = new FileReader();
  reader.onload = () => { reviewImage.value = reader.result; reviewError.value = ""; };
  reader.onerror = () => { reviewError.value = "Không đọc được ảnh. Vui lòng chọn lại."; };
  reader.readAsDataURL(file);
}
const slide = ref(0),
  contact = ref(false);

const contactPhone = computed(() => {
  const post = room.value;
  if (!post) return "";
  const original = [...rooms, ...roommateListings].find((item) => item.id === post.id);
  return (
    (post.ownerId === state.user?.id ? state.profile.phone || state.user?.phone : "") ||
    post.phone ||
    original?.phone ||
    ""
  );
});

const remainingRooms = computed(
  () => room.value?.count ?? rooms.find((item) => item.id === route.params.id)?.count,
);
const internetPrice = computed(
  () =>
    room.value?.internet ?? rooms.find((item) => item.id === route.params.id)?.internet,
);

function act(kind) {
  if (!state.user)
    return router.push("/dang-nhap?redirect=" + encodeURIComponent(route.fullPath));
  if (kind === "save") toggleFavorite(room.value.id);
  else contact.value = true;
}

const backTo = computed(() => {
  const path = route.query.returnTo;
  return typeof path === "string" &&
    (path === "/" ||
      path.startsWith("/?") ||
      path.startsWith("/ghep-tro") ||
      path === "/quan-ly/bai-dang" ||
      /^\/nha-tro\/[^/?#]+$/.test(path))
    ? path
    : state.user?.role === "landlord"
      ? "/quan-ly/bai-dang"
      : "/?search=1";
});

function formatDate(dateStr) {
  if (!dateStr) return "Vào ngay / Thỏa thuận";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}
</script>

<template>
  <div class="container page" v-if="room">
    <RouterLink :to="backTo" class="back-link">
      <Icon name="back" :size="18" />
      {{
        backTo.startsWith("/ghep-tro")
          ? "Quay lại ghép trọ"
          : backTo === "/quan-ly/bai-dang"
            ? "Quay lại quản lý bài đăng"
            : backTo.startsWith("/nha-tro/")
              ? "Quay lại nhà trọ"
              : "Quay lại tìm trọ"
      }}
    </RouterLink>

    <div class="detail-grid">
      <section>
        <!-- Ảnh bài đăng -->
        <div class="detail-photo">
          <img
            :src="
              slide === 0 ? room.image : '/illustrations/room-' + (slide + 1) + '.svg'
            "
            :alt="room.title + ' — góc nhìn ' + (slide + 1)"
          />
          <button
            class="icon-button photo-prev"
            aria-label="Ảnh trước"
            @click="slide = (slide + 3) % 4"
          >
            <Icon name="left" />
          </button>
          <button
            class="icon-button photo-next"
            aria-label="Ảnh tiếp theo"
            @click="slide = (slide + 1) % 4"
          >
            <Icon name="right" />
          </button>
          <span class="photo-counter">{{ slide + 1 }} / 4</span>
        </div>

        <!-- Tiêu đề & Badges -->
        <div class="section-heading detail-title">
          <div>
            <div class="detail-badges">
              <span class="badge">{{ room.status || "Đang mở" }}</span>
              <span v-if="isRoommate" class="badge roommate-tag">Tìm người ở ghép</span>
              <span v-if="room.school" class="badge school-tag">{{ room.school }}</span>
            </div>
            <h1>{{ room.title }}</h1>
            <p class="muted location"><Icon name="pin" :size="17" />{{ room.address }}</p>
          </div>
          <button
            class="icon-button outlined"
            :class="{ 'saved-heart': state.favorites.includes(room.id) }"
            @click="act('save')"
            :aria-label="state.favorites.includes(room.id) ? 'Bỏ lưu tin' : 'Lưu tin'"
          >
            <Icon name="heart" />
          </button>
        </div>

        <!-- Giá hiển thị -->
        <div class="detail-price-box">
          <p class="detail-price">
            {{ money(room.price) }}
            <span
              >/
              {{
                isRoommate ? (room.perPerson ? "người / tháng" : "tháng") : "tháng"
              }}</span
            >
          </p>
          <p v-if="isRoommate && room.totalRent" class="muted total-room-hint">
            Tổng giá thuê phòng: <strong>{{ money(room.totalRent) }} / tháng</strong>
          </p>
        </div>

        <!-- Thông số đặc tả -->
        <div class="spec-grid">
          <div>
            <Icon name="area" />
            <span
              >Diện tích<strong>{{ room.area }} m²</strong></span
            >
          </div>

          <div v-if="isRoommate">
            <Icon name="users" />
            <span
              >Cần tìm<strong
                >{{ room.capacity || room.people || 1 }} bạn ({{
                  room.gender || "Nam/Nữ"
                }})</strong
              ></span
            >
          </div>
          <div v-else>
            <Icon name="users" />
            <span
              >Số người tối đa<strong>{{ room.people }} người</strong></span
            >
          </div>

          <div v-if="isRoommate">
            <Icon name="calendar" />
            <span
              >Thời gian dọn vào<strong>{{ formatDate(room.moveIn) }}</strong></span
            >
          </div>
          <div v-else>
            <Icon name="calendar" />
            <span>Giờ giấc<strong>Tự do</strong></span>
          </div>

          <div class="remaining-rooms">
            <Icon name="home" />
            <span>
              {{ isRoommate ? "Hiện tại" : "Phòng còn lại" }}
              <strong>
                {{
                  isRoommate
                    ? room.currentPeople
                      ? "Đang ở " + room.currentPeople + " người"
                      : "Đang ở ghép"
                    : remainingRooms == null || remainingRooms === ""
                      ? "Chưa cập nhật"
                      : remainingRooms + " phòng"
                }}
              </strong>
            </span>
          </div>
        </div>

        <!-- Chi phí dịch vụ -->
        <div class="cost-grid">
          <p>
            Tiền nước
            <strong>{{
              room.water ? money(room.water) + " / m³" : "Theo hóa đơn"
            }}</strong>
          </p>
          <p>
            Tiền điện
            <strong>{{
              room.electric ? money(room.electric) + " / kWh" : "Theo hóa đơn"
            }}</strong>
          </p>
          <p class="internet-cost">
            Tiền internet
            <strong>{{
              internetPrice == null || internetPrice === ""
                ? "Miễn phí / Chia đều"
                : money(internetPrice) + " / tháng"
            }}</strong>
          </p>
          <p>
            Tiền cọc
            <strong>{{ room.deposit ? money(room.deposit) : "Thỏa thuận" }}</strong>
          </p>
        </div>

        <!-- Mô tả chi tiết & Thói quen sống -->
        <section class="detail-section">
          <h2>Mô tả chi tiết</h2>
          <p class="desc-text">{{ room.desc }}</p>
          <p v-if="!isRoommate">
            Tôn trọng không gian chung, giữ vệ sinh và hạn chế tiếng ồn sau 22 giờ.
          </p>

          <!-- Thói quen sống / lưu ý khác đưa xuống dưới mô tả chi tiết -->
          <div v-if="room.habits" class="habits-box">
            <h4><Icon name="info" :size="16" /> Thói quen sống & Lưu ý của người ghép</h4>
            <p>{{ room.habits }}</p>
          </div>
        </section>

        <section v-if="!isRoommate" class="detail-section">
          <h2>Đánh giá nhà trọ</h2>
          <p class="review-intro">Bình luận được chia sẻ giữa các phòng cùng nhà trọ.</p>
          <p v-if="!houseId" class="review-intro">
            Nhà trọ này chưa có mã để lưu bình luận.
          </p>
          <template v-else>
            <p v-if="reviewsLoading" class="review-intro" role="status">
              Đang tải bình luận…
            </p>
            <p v-else-if="!houseReviews.length && !reviewError" class="review-intro">
              Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ.
            </p>
            <div v-for="review in houseReviews" :key="review.id" class="house-review">
              <div class="review-heading">
                <strong>{{ review.author }}</strong
                ><time :datetime="review.createdAt">{{
                  formatDate(review.createdAt)
                }}</time>
              </div>
              <div v-if="review.rating" class="review-stars" :aria-label="review.rating + ' trên 5 sao'"><Icon v-for="star in 5" :key="star" name="star" :size="20" :class="{ filled: star <= review.rating }" /></div>
              <p v-if="review.sample" class="review-sample">Dữ liệu mẫu</p>
              <div v-if="review.images?.length" class="review-images"><img v-for="(image, index) in review.images" :key="index" :src="image" :alt="'Ảnh đánh giá của ' + review.author" loading="lazy"></div>
              <p>{{ review.content }}</p>
            </div>
            <form v-if="state.user" class="review-form" @submit.prevent="submitReview">
              <div class="rating-row"><fieldset class="rating-choice"><legend>Đánh giá của bạn</legend><label v-for="star in 5" :key="star"><input v-model.number="reviewRating" type="radio" name="rating" :value="star" :aria-label="star + ' sao'"><Icon name="star" :size="23" :class="{ filled: star <= reviewRating }" /></label></fieldset><span class="rating-caption" aria-live="polite">{{ reviewRating ? reviewRating + ' / 5' : 'Chọn số sao' }}</span></div>
              <label for="review-content">Viết bình luận</label>
              <textarea
                id="review-content"
                v-model="reviewContent"
                rows="3"
                maxlength="1000"
                placeholder="Chia sẻ trải nghiệm của bạn về nhà trọ"
                :aria-invalid="!!reviewError"
                :aria-describedby="reviewError ? 'review-error' : undefined"
              ></textarea>
              <div v-if="reviewImage" class="review-image-preview"><img :src="reviewImage" alt="Ảnh đánh giá đã chọn"><button type="button" @click="reviewImage = ''">Xóa ảnh</button></div>
              <p v-if="reviewError" id="review-error" class="review-error" role="alert">
                {{ reviewError }}
              </p>
              <div class="review-actions"><div><label class="review-upload" for="review-image"><Icon name="camera" :size="18" /><span>Thêm ảnh</span></label><input id="review-image" class="review-file-input" type="file" accept="image/jpeg,image/png,image/webp" @change="selectReviewImage"><small class="review-upload-hint">JPG, PNG, WEBP · Tối đa 1 MB</small></div><button
                type="submit"
                class="button primary"
                :disabled="reviewSaving || reviewsLoading"
              >
                {{ reviewSaving ? "Đang gửi…" : "Gửi bình luận" }}
              </button></div>
            </form>
            <template v-else
              ><p v-if="reviewError" class="review-error" role="alert">
                {{ reviewError }}
              </p>
              <RouterLink
                :to="{ path: '/dang-nhap', query: { redirect: route.fullPath } }"
                class="button secondary review-login"
                >Đăng nhập để bình luận</RouterLink
              ></template
            >
          </template>
        </section>
      </section>

      <!-- Cột Aside bên phải -->
      <aside>
        <!-- Vị trí chỗ ở -->
        <section class="detail-section location-section">
          <h2>Vị trí chỗ ở</h2>
          <MapPanel
            :label="room.house || room.title"
            :address="
              room.address ||
              [room.street, room.ward, room.city].filter(Boolean).join(', ')
            "
          />
          <a
            class="map-external"
            :href="
              'https://www.google.com/maps/search/?api=1&query=' +
              encodeURIComponent(
                room.address ||
                  [room.street, room.ward, room.city].filter(Boolean).join(', '),
              )
            "
            target="_blank"
            rel="noopener"
          >
            Mở khu vực trên Google Maps <Icon name="external" :size="15" />
          </a>
        </section>

        <!-- Thông tin nhà trọ (nếu là phòng trọ cho thuê) -->
        <section v-if="!isRoommate" class="detail-section">
          <h2>Nhà trọ</h2>
          <img class="house-preview" :src="room.image" :alt="room.house || room.title" />
          <h3>{{ room.house || room.title }}</h3>
          <p class="muted">{{ room.address }}</p>
        </section>

        <!-- Thẻ liên hệ cho phòng trọ cho thuê (nếu không phải ghép trọ) -->
        <section v-if="!isRoommate" class="contact-card">
          <div class="inline">
            <span class="avatar">
              {{
                (room.house || "FindMyRoom")
                  .trim()
                  .split(/\s+/)
                  .map((s) => s[0])
                  .slice(-2)
                  .join("")
              }}
            </span>
            <div>
              <h3>{{ room.house || "Chủ trọ" }}</h3>
              <p class="muted">{{ room.house || "Chủ nhà trọ" }}</p>
            </div>
          </div>
          <div class="inline contact-actions">
            <a
              v-if="contactPhone"
              class="button primary contact-phone"
              :href="'tel:' + contactPhone"
            >
              <Icon name="phone" :size="18" />{{ contactPhone }}
            </a>
            <button v-else class="button primary contact-phone" disabled>
              <Icon name="phone" :size="18" />Chưa có số điện thoại
            </button>
            <button class="button secondary" @click="act('chat')">Chat Zalo</button>
          </div>
          <p v-if="contact" class="notice">
            {{
              room.phone
                ? "Số điện thoại: " +
                  room.phone +
                  (room.email ? " · Email: " + room.email : "")
                : "Chức năng liên hệ thực tế sẽ hoạt động khi kết nối dữ liệu chủ trọ."
            }}
          </p>
        </section>
        <!-- Thẻ tóm tắt người đăng ghép trọ (có tích hợp nút liên hệ) -->
        <section
          v-if="isRoommate"
          class="detail-section author-profile-card contact-card"
        >
          <h2>Hồ sơ người đăng</h2>
          <div class="profile-compact">
            <div class="avatar-large" :style="{ background: room.color || '#8fc8cf' }">
              {{
                (room.owner || "SV")
                  .trim()
                  .split(/\s+/)
                  .map((s) => s[0])
                  .slice(-2)
                  .join("")
              }}
            </div>
            <div>
              <h3>{{ room.owner || "Bạn sinh viên" }}</h3>
              <p class="muted">
                {{ room.age ? room.age + " tuổi · " : ""
                }}{{ room.gender || "Sinh viên" }}
              </p>
              <p class="muted">{{ room.school || "Đại học Cần Thơ" }}</p>
              <p v-if="room.major" class="muted">Ngành: {{ room.major }}</p>
            </div>
          </div>

          <!-- Tags phong cách sống / sở thích của người đăng -->
          <div v-if="room.tags && room.tags.length" class="tags">
            <span v-for="t in room.tags" :key="t">{{ t }}</span>
          </div>

          <!-- Nút liên hệ đưa vào trong Hồ sơ người đăng -->
          <div class="profile-contact-actions inline">
            <a
              v-if="contactPhone"
              class="button primary contact-phone"
              :href="'tel:' + contactPhone"
            >
              <Icon name="phone" :size="18" />{{ contactPhone }}
            </a>
            <button v-else class="button primary contact-phone" disabled>
              <Icon name="phone" :size="18" />Chưa có số điện thoại
            </button>
            <button class="button secondary" @click="act('chat')">Chat Zalo</button>
          </div>
          <p v-if="contact" class="notice">
            {{
              room.phone
                ? "Số điện thoại: " +
                  room.phone +
                  (room.email ? " · Email: " + room.email : "")
                : "Chức năng liên hệ thực tế sẽ hoạt động khi kết nối tài khoản người đăng."
            }}
          </p>
        </section>

        <!-- Tiện ích & Không gian sống đưa qua bên phải -->
        <section class="detail-section aside-amenities">
          <h2>{{ isRoommate ? "Tiện ích & Không gian sống" : "Tiện ích" }}</h2>

          <!-- Tiện ích nội khu -->
          <div class="amenity-group">
            <h3 v-if="isRoommate" class="sub-heading">
              <Icon name="home" :size="16" /> Tiện ích nội khu
            </h3>
            <div class="amenity-grid">
              <span v-for="a in room.amenities || []" :key="a">
                <Icon name="check" :size="18" />{{ a }}
              </span>
            </div>
          </div>

          <!-- Tiện ích ngoại khu -->
          <div v-if="room.nearby && room.nearby.length" class="amenity-group">
            <h3 class="sub-heading">
              <Icon name="pin" :size="16" /> Tiện ích xung quanh
            </h3>
            <div class="amenity-grid">
              <span v-for="n in room.nearby" :key="n">
                <Icon name="check" :size="18" />{{ n }}
              </span>
            </div>
          </div>

          <!-- Phong cách sống mong muốn -->
          <div
            v-if="
              (room.lifestyles && room.lifestyles.length) ||
              (room.tags && room.tags.length)
            "
            class="amenity-group"
          >
            <h3 class="sub-heading">
              <Icon name="heart" :size="16" /> Phong cách sống mong muốn
            </h3>
            <div class="tags">
              <span v-for="l in room.lifestyles || room.tags" :key="l">{{ l }}</span>
            </div>
          </div>
        </section>

      </aside>
    </div>
  </div>
  <div v-else class="container empty-state">
    <h1>Không tìm thấy bài đăng</h1>
    <RouterLink :to="backTo" class="button primary">Về trang trước</RouterLink>
  </div>
</template>

<style scoped>
.review-stars{display:flex;gap:3px;color:#b4831e;margin-top:8px}
.review-stars .filled,.rating-choice .filled{fill:currentColor}
.review-images{display:flex;gap:8px;overflow-x:auto;margin-top:12px}
.review-images img{width:150px;height:100px;object-fit:cover;border-radius:10px;flex:none}
.house-review .review-sample{font-size:12px;color:#526065;margin-top:4px}
.rating-row{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
.rating-caption{align-self:flex-end;padding-bottom:12px;font-size:13px;color:#526065}
.rating-choice{border:0;padding:0;margin:0;display:flex;gap:2px;color:#a36c0d}
.rating-choice legend{font-size:14px;font-weight:600;color:var(--ink);margin-bottom:8px}
.rating-choice label{width:44px;height:44px;display:grid;place-items:center;cursor:pointer;position:relative;border-radius:10px;transition:background-color .2s}
.rating-choice label:hover{background:#fff3d8}
.rating-choice input{position:absolute;opacity:0}
.rating-choice label:has(input:focus-visible){outline:3px solid #638d92;outline-offset:2px;border-radius:8px}
.review-image-preview{display:flex;align-items:end;gap:12px}
.review-image-preview img{width:120px;height:80px;object-fit:cover;border-radius:8px}
.review-image-preview button{text-decoration:underline;min-height:44px}
.review-intro {
  font-size: 14px;
  line-height: 1.5;
  color: #526065;
}
.house-review {
  padding: 16px 0;
  border-bottom: 1px solid var(--line);
}
.review-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.review-heading strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.review-heading time {
  font-size: 12px;
  color: #526065;
  white-space: nowrap;
}
.house-review p {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 8px 0 0;
}
.review-form {
  display: grid;
  gap: 10px;
  margin-top: 24px;
  padding: 24px 0 0;
  border-top: 1px solid var(--line);
}
.review-form label {
  font-size: 14px;
  font-weight: 600;
}
.review-form textarea {
  resize: vertical;
  min-height: 120px;
  font-size: 16px;
  line-height: 1.5;
  background: #fff;
  border-color: #c9ceca;
  border-radius: 10px;
}
.review-form textarea::placeholder{color:#626e6b}
.review-actions{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-top:4px}
.review-upload{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid #b5c4b8;border-radius:999px;background:#fff;cursor:pointer;color:#315b3b;transition:background-color .2s,border-color .2s}
.review-upload:hover{background:#eff6f0;border-color:#55775f}
.review-upload:has(+ .review-file-input:focus-visible){outline:3px solid #638d92;outline-offset:3px}
.review-upload-hint{display:block;margin-top:5px;font-size:12px;line-height:1.4;color:#52655a}
.review-file-input{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.review-form .button {
  justify-self: start;
}
@media(max-width:600px){.review-actions{align-items:flex-start}.review-upload-hint{font-size:11px}}
@media(prefers-reduced-motion:reduce){.rating-choice label,.review-upload{transition:none}}
.review-error {
  color: var(--error);
  font-size: 13px;
  margin: 0;
}
.review-login {
  margin-top: 18px;
  white-space: normal;
}
.detail-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.detail-badges .roommate-tag {
  background: #dceff1;
  color: #215157;
}
.detail-badges .school-tag {
  background: #eef2f3;
  color: #3b5054;
}
.detail-price-box {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.total-room-hint {
  font-size: 13.5px;
  color: #5a686b;
  margin: 0;
}
.sub-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  color: #334447;
  margin: 18px 0 10px;
  font-weight: 600;
}
.amenity-group {
  margin-bottom: 16px;
}
.habits-box {
  margin-top: 18px;
  padding: 16px;
  background: #f8f6f0;
  border-radius: 12px;
  border: 1px solid var(--line);
}
.habits-box h4 {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  color: #283a3d;
  margin-bottom: 6px;
}
.habits-box p {
  font-size: 13px;
  color: #4f5e61;
  margin: 0;
  line-height: 1.5;
}
.author-profile-card {
  padding: 20px;
  background: #fcfbf7;
  border: 1px solid var(--line);
  border-radius: 16px;
}
.profile-compact {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.avatar-large {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 18px;
  color: #131414;
  border: 1px solid var(--ink);
  flex-shrink: 0;
}
.profile-compact h3 {
  font-size: 16px;
  margin: 0 0 3px;
}
.profile-compact p {
  font-size: 12px;
  margin: 2px 0;
  line-height: 1.4;
}
.profile-contact-actions {
  margin-top: 16px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.profile-contact-actions .button {
  font-size: 13px;
  padding: 10px 18px;
  border-radius: 999px;
}
.author-profile-card.contact-card {
  margin-top: 5px;
  margin-bottom: 24px;
}
.desc-text {
  font-size: 14.5px;
  line-height: 1.65;
  color: #2b393b;
  margin-bottom: 12px;
}
.aside-amenities {
  margin-bottom: 24px;
}
.location-section {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}
.spec-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.spec-grid > div {
  min-width: 0;
}
.cost-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
@media (max-width: 600px) {
  .spec-grid,
  .cost-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .spec-grid {
    gap: 20px 12px;
  }
  .cost-grid {
    gap: 14px 10px;
  }
}
.saved-heart {
  background: var(--coral, #f8d6cc);
  border-color: #f27058;
}
.saved-heart svg {
  fill: #c93636;
  color: #c93636;
}
</style>
