<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import Icon from './Icon.vue'

const props = defineProps({ kind: { type: String, required: true } })
const emit = defineEmits(['close'])
const closeButton = ref(null), panel = ref(null)
const topics = {
  roommate: {
    title: 'Quy tắc ghép trọ', icon: 'users',
    intro: 'Trao đổi rõ từ đầu để cùng nhau xây dựng một không gian sống thoải mái.',
    items: [
      ['Thống nhất chi phí', 'Trao đổi cụ thể tiền phòng, điện, nước, internet, đồ dùng chung và thời điểm thanh toán.'],
      ['Tôn trọng nếp sống của nhau', 'Thống nhất giờ nghỉ, việc hút thuốc, nuôi thú cưng và mời khách đến phòng trước khi ở cùng.'],
      ['Chia sẻ việc nhà', 'Phân công dọn dẹp, đổ rác và giữ sạch các khu vực dùng chung.'],
      ['Giữ sự riêng tư', 'Hỏi ý kiến trước khi dùng đồ cá nhân hoặc chia sẻ hình ảnh, thông tin của người ở cùng.'],
      ['Gặp gỡ và trao đổi trước', 'Hẹn gặp ở nơi công cộng, tìm hiểu mong muốn của nhau và cùng xem phòng trước khi quyết định.'],
    ],
  },
  safety: {
    title: 'Cảnh báo lừa đảo', icon: 'shield',
    intro: 'Kiểm tra thông tin cẩn thận và dành thời gian xem phòng trước khi quyết định.',
    items: [
      ['Kiểm tra tin đăng', 'Đối chiếu hình ảnh, địa chỉ và chi phí. Cẩn trọng với mức giá rẻ bất thường hoặc lời thúc ép phải quyết định ngay.'],
      ['Xem phòng trước khi chuyển tiền', 'Đến xem tình trạng thực tế và xác minh người trực tiếp quản lý phòng trước khi đặt cọc.'],
      ['Làm rõ các điều khoản', 'Hỏi rõ giá điện, nước, phụ phí, thời hạn ở và điều kiện hoàn cọc; giữ lại những nội dung đã thống nhất.'],
      ['Bảo vệ thông tin cá nhân', 'Không cung cấp mật khẩu, mã OTP hoặc thông tin đăng nhập ngân hàng cho người đăng tin.'],
      ['Dừng lại khi có dấu hiệu bất thường', 'Tạm dừng giao dịch, lưu lại tin nhắn và nội dung tin đăng, rồi nhờ người tin cậy hỗ trợ kiểm tra.'],
    ],
  },
}
const content = computed(() => topics[props.kind] || topics.roommate)
let previousOverflow = ''
let previousFocus = null
function keepFocus(event) {
  const items = [...panel.value.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(item => !item.disabled && item.getClientRects().length)
  const first = items[0], last = items.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
}
onMounted(async () => {
  previousFocus = document.activeElement
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  await nextTick()
  closeButton.value?.focus()
})
onUnmounted(() => {
  document.body.style.overflow = previousOverflow
  if (previousFocus?.isConnected) previousFocus.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" @click.self="emit('close')" @keydown.esc.stop.prevent="emit('close')">
      <section ref="panel" class="modal footer-info-modal" role="dialog" aria-modal="true" aria-labelledby="footer-help-heading" aria-describedby="footer-help-intro" @keydown.tab="keepFocus">
        <header class="footer-info-header"><div><span class="footer-info-kicker"><Icon :name="content.icon" :size="17" />Hỗ trợ &amp; an toàn</span><h2 id="footer-help-heading">{{ content.title }}</h2></div><button ref="closeButton" type="button" class="footer-info-close" aria-label="Đóng thông tin" @click="emit('close')"><Icon name="close" :size="21" /></button></header>
        <p id="footer-help-intro" class="footer-info-intro">{{ content.intro }}</p>
        <ol class="footer-info-list"><li v-for="[title, text] in content.items" :key="title"><div><h3>{{ title }}</h3><p>{{ text }}</p></div></li></ol>
        <div class="footer-info-actions"><button type="button" class="button primary" @click="emit('close')">Đã hiểu <Icon name="check" :size="18" /></button></div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal.footer-info-modal{width:100%;max-width:620px;max-height:calc(100dvh - 40px);overflow-y:auto;overscroll-behavior:contain;padding:28px;text-align:left;border:1px solid var(--line);border-radius:22px;background:var(--cream)}
.footer-info-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}
.footer-info-kicker{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#426462;margin-bottom:10px}
.footer-info-header h2{font-size:27px;line-height:1.3}
.footer-info-close{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border:1px solid var(--line);border-radius:50%;background:#fff}
.footer-info-close:hover{background:var(--cream-deep)}
.footer-info-intro{font-size:14px;line-height:1.7;color:#526065;margin:14px 0 24px}
.footer-info-list{list-style:none;counter-reset:help-item;padding:0;margin:0;display:grid;gap:18px}
.footer-info-list li{counter-increment:help-item;display:grid;grid-template-columns:30px minmax(0,1fr);gap:12px}
.footer-info-list li:before{content:counter(help-item);display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--cream-deep);font-size:13px;font-weight:600}
.footer-info-list h3{font-family:inherit;font-size:15px;font-weight:600;line-height:1.5;margin:0}
.footer-info-list p{font-size:14px;line-height:1.65;color:#526065;margin:5px 0 0}
.footer-info-actions{display:flex;justify-content:flex-end;border-top:1px solid var(--line);margin-top:24px;padding-top:20px}
@media(max-width:600px){.modal.footer-info-modal{padding:22px 18px;max-height:calc(100dvh - 36px);border-radius:18px}.footer-info-header h2{font-size:24px}.footer-info-intro,.footer-info-list p{font-size:15px}.footer-info-list h3{font-size:16px}.footer-info-actions .button{width:100%}}
</style>
