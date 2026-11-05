<script setup>
import {computed,reactive,ref,onUnmounted} from 'vue'
import {useRoute,useRouter} from 'vue-router'
import Icon from '../components/Icon.vue'
import RoomCard from '../components/RoomCard.vue'
import RentalPostEditor from '../components/RentalPostEditor.vue'
import {rooms,money} from '../data'
import {state,validateField,updateRentalPost} from '../store'
const route=useRoute(),router=useRouter(),houses=computed(()=>route.params.kind==='nha-tro'),saved=computed(()=>route.params.kind==='da-luu'),modal=ref(''),deleting=ref(null),editingId=ref(null),notice=ref(''),errors=reactive({}),form=reactive({name:'',address:'',rooms:1,status:'Đang hoạt động',desc:''}),more=ref(false),housesMore=ref(false)
let noticeTimer
function showNotice(message){clearTimeout(noticeTimer);notice.value=message;noticeTimer=setTimeout(()=>{notice.value=''},5000)}
onUnmounted(()=>clearTimeout(noticeTimer))
const editingPost=ref(null),postEditError=ref('')
function editRental(post){postEditError.value='';editingPost.value=post}
function saveRental(post){try{updateRentalPost(post);editingPost.value=null;showNotice('Đã lưu thay đổi bài đăng.')}catch(error){postEditError.value=error.message}}
const list=computed(()=>saved.value?rooms.filter(r=>state.favorites.includes(r.id)):state.posts)
function open(h){editingId.value=h?.id||null;Object.assign(form,h||{name:'',address:'',rooms:1,status:'Đang hoạt động',desc:''});Object.keys(errors).forEach(k=>delete errors[k]);modal.value='house'}
function save(){Object.keys(errors).forEach(k=>delete errors[k]);for(const k of ['name','address'])if(!form[k].trim())errors[k]='Vui lòng điền thông tin này.';if(Number(form.rooms)<=0)errors.rooms='Số phòng phải lớn hơn 0.';if(Object.keys(errors).length)return;const item={...form,id:editingId.value||'house-'+Date.now()};if(editingId.value)Object.assign(state.houses.find(h=>h.id===editingId.value),item);else state.houses.push(item);modal.value='';showNotice('Đã lưu thông tin nhà trọ trên thiết bị này.')}
function remove(){if(houses.value){state.houses=state.houses.filter(h=>h.id!==deleting.value.id);state.posts=state.posts.filter(p=>p.houseId!==deleting.value.id)}else state.posts=state.posts.filter(p=>p.id!==deleting.value.id);deleting.value=null;showNotice('Đã xóa và cập nhật danh sách.')}
</script>
<template><div v-if="!state.user" class="container empty-state"><Icon name="building" :size="42"/><h1>Quản lý không gian của bạn</h1><p>Đăng nhập để quản lý nhà trọ và bài đăng.</p><RouterLink :to="'/dang-nhap?redirect='+encodeURIComponent(route.fullPath)" class="button primary">Đăng nhập</RouterLink></div><div v-else-if="houses&&state.user.role!=='landlord'" class="container empty-state"><Icon name="building" :size="42"/><h1>Không gian dành cho chủ trọ</h1><p>Bạn đang đăng nhập với vai trò sinh viên.</p><RouterLink to="/ho-so" class="button secondary">Về hồ sơ</RouterLink></div><div v-else class="container page"><div class="section-heading"><div><span class="eyebrow">Không gian của bạn</span><h1>{{houses?'Quản lý nhà trọ':saved?'Tin đã lưu':'Quản lý bài đăng trọ'}}</h1></div><button v-if="houses" class="button primary add-house" @click="open()"><Icon name="plus" :size="18"/>Thêm nhà trọ</button><RouterLink v-else-if="!saved" :to="'/dang-bai/'+(state.user.role==='landlord'?'rental':'roommate')" class="button primary"><Icon name="plus" :size="18"/>{{state.user.role==='landlord'?'Đăng bài cho thuê':'Đăng bài ghép trọ'}}</RouterLink></div><p v-if="notice" class="notice" role="status">{{notice}}</p><template v-if="houses"><div class="table-header"><span>Thông tin nhà trọ</span><span>Địa chỉ</span><span>Số phòng</span><span>Thao tác</span></div><article v-for="h in state.houses.slice(0,housesMore?state.houses.length:3)" :key="h.id" class="house-row"><div class="house-summary"><img :src="h.image||'/illustrations/room-1.svg'" :alt="h.name"><div><h3><RouterLink :to="'/nha-tro/'+h.id" class="house-detail-link">{{h.name}}</RouterLink></h3><p class="muted">{{h.desc}}</p></div></div><p class="house-address"><Icon name="pin" :size="16"/>{{h.address}}</p><span class="house-room-count"><Icon name="home" :size="16"/>{{h.rooms}} phòng</span><div class="inline house-actions"><button class="icon-button manage-edit" @click="open(h)" :aria-label="'Chỉnh sửa '+h.name"><Icon name="edit" :size="17"/></button><button class="icon-button manage-delete" @click="deleting=h" :aria-label="'Xóa '+h.name"><Icon name="trash" :size="17"/></button></div></article><div v-if="state.houses.length>3" class="center section-action"><button type="button" class="button secondary" :aria-expanded="housesMore" @click="housesMore=!housesMore">{{housesMore?'Thu gọn':'Xem thêm'}}<Icon name="down" :size="18"/></button></div><div v-if="!state.houses.length" class="empty-state"><h2>Chưa có nhà trọ</h2><p>Thêm nhà trọ đầu tiên để bắt đầu đăng tin cho thuê.</p><button class="button primary add-house" @click="open()">Thêm nhà trọ</button></div></template><div v-else-if="saved&&list.length" class="room-grid"><RoomCard v-for="r in list" :key="r.id" :room="r"/></div><template v-else-if="!saved&&list.length"><div class="manage-list"><article v-for="r in list.slice(0,more?list.length:3)" :key="r.id" class="manage-post"><img :src="r.image" :alt="r.title"><div class="manage-post-info"><span class="badge cream">{{r.status}}</span><h3><RouterLink :to="{path:'/phong/'+r.id,query:{returnTo:route.fullPath}}" class="manage-post-detail">{{r.title}}</RouterLink></h3><p class="muted">{{r.address||'Cần Thơ'}} · {{r.area}} m²</p><p class="price">{{money(r.price)}}<span> / tháng</span></p></div><div class="manage-post-actions"><button v-if="(r.kind||'rental')==='rental'" type="button" class="icon-button manage-edit" aria-label="Chỉnh sửa" title="Chỉnh sửa" @click="editRental(r)"><Icon name="edit" :size="17"/></button><RouterLink v-else :to="'/dang-bai/'+r.kind+'?edit='+r.id" class="icon-button manage-edit" aria-label="Chỉnh sửa" title="Chỉnh sửa"><Icon name="edit" :size="17"/></RouterLink><button class="icon-button manage-delete" @click="deleting=r" :aria-label="'Xóa bài '+r.title"><Icon name="trash" :size="18"/></button></div></article></div><div class="center section-action" v-if="list.length>3"><button class="button secondary" @click="more=!more">{{more?'Thu gọn':'Xem thêm'}}<Icon name="down" :size="18"/></button></div></template><div v-else class="empty-state"><span class="empty-icon"><Icon :name="saved?'heart':'grid'" :size="38"/></span><h2>{{saved?'Bạn chưa lưu phòng nào':'Chưa có bài đăng'}}</h2><p>{{saved?'Lưu lại những căn phòng bạn muốn xem thêm.':'Bắt đầu bằng một bài đăng giới thiệu không gian của bạn.'}}</p><RouterLink :to="saved?'/tim-tro':'/dang-bai/'+(state.user.role==='landlord'?'rental':'roommate')" class="button primary">{{saved?'Tìm phòng trọ':'Tạo bài đăng'}}</RouterLink></div><RentalPostEditor v-if="editingPost" :post="editingPost" :save-error="postEditError" @close="editingPost=null" @save="saveRental"/><Teleport to="body"><div v-if="deleting" class="modal-backdrop" @click.self="deleting=null" @keydown.esc="deleting=null"><section class="modal delete-confirm-modal" v-dialog-focus role="dialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Xác nhận xóa</h2><p>{{deleting.name||deleting.title}}</p><p class="muted">{{houses?'Bài đăng gắn với nhà trọ cũng sẽ được ẩn.':'Bài đăng sẽ được gỡ khỏi danh sách trên thiết bị này.'}}</p><div class="form-actions"><button class="button secondary" @click="deleting=null">Hủy</button><button class="button danger" @click="remove">Xác nhận xóa</button></div></section></div><div v-if="modal==='house'" class="modal-backdrop" @click.self="modal=''" @keydown.esc="modal=''"><section class="modal large" v-dialog-focus role="dialog" aria-modal="true" aria-labelledby="house-title"><div class="section-heading"><h2 id="house-title">{{editingId?'Chỉnh sửa nhà trọ':'Tạo nhà trọ'}}</h2><button class="icon-button" @click="modal=''" aria-label="Đóng"><Icon name="close"/></button></div><form @submit.prevent="save"><label class="field"><span>Tên nhà trọ *</span><input v-model="form.name" placeholder="Ví dụ: Nhà trọ Minh An" :aria-invalid="!!errors.name"><small class="error">{{errors.name}}</small></label><label class="field"><span>Địa chỉ *</span><input v-model="form.address" placeholder="Số nhà, đường, phường, Cần Thơ" :aria-invalid="!!errors.address"><small class="error">{{errors.address}}</small></label><label class="field"><span>Số phòng *</span><input type="number" min="1" v-model.number="form.rooms"><small class="error">{{errors.rooms}}</small></label><label class="field"><span>Mô tả nhà trọ</span><textarea v-model="form.desc" rows="3" placeholder="Không gian, an ninh, tiện nghi…"></textarea></label><div class="form-actions"><button type="button" class="button secondary" @click="modal=''">Hủy</button><button class="button primary">Lưu nhà trọ</button></div></form></section></div></Teleport></div></template>

<style scoped>
.delete-confirm-modal{width:min(440px,100%);padding:32px;text-align:center}
.delete-confirm-modal h2{font-size:26px;margin-bottom:24px}
.delete-confirm-modal h2::after{content:"";display:block;width:180px;max-width:75%;height:1px;background:var(--line);margin:12px auto 0}
.delete-confirm-modal p{overflow-wrap:anywhere}
.delete-confirm-modal .form-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:24px;padding-top:24px}
.delete-confirm-modal .form-actions .button{width:100%;min-width:0;padding-inline:12px;white-space:normal}
@media(max-width:480px){.delete-confirm-modal{padding:24px 20px}.delete-confirm-modal h2{font-size:23px}.delete-confirm-modal .form-actions{gap:12px}}
.table-header,.house-row{grid-template-columns:minmax(0,1.6fr) minmax(0,1.4fr) 100px 100px;gap:20px}
.table-header{margin-bottom:12px}
.house-row{padding:18px;border:1px solid var(--line);border-radius:12px;background:#fff;margin-bottom:16px}
.house-summary{display:flex;align-items:center;gap:14px;min-width:0}
.house-summary>img{width:92px;height:72px;object-fit:cover;border:1px solid var(--line);border-radius:6px;flex-shrink:0}
.house-summary>div{min-width:0}
.house-summary h3{font-size:16px;overflow-wrap:anywhere}
.house-summary p{font-size:11px;line-height:1.5}
.house-row .house-address,.house-room-count{display:flex;align-items:center;gap:7px;line-height:1.6;margin:0}
.house-address{overflow-wrap:anywhere}
.house-actions{justify-content:flex-end}
.house-actions .icon-button,.manage-post-actions .icon-button{width:40px;height:40px;min-width:40px;border-radius:7px}
.manage-edit{border:1px solid #59646b;background:#f4f5f6;color:#25313b}
.manage-edit:hover{background:#e8ecee}
.manage-delete{background:#c93636;color:#fff;border:1px solid #c93636}
.manage-delete:hover{background:#ad2929;border-color:#ad2929}
@media(pointer:coarse){.house-actions .icon-button,.manage-post-actions .icon-button{width:44px;height:44px;min-width:44px}}
@media(max-width:800px){
  .house-row{grid-template-columns:minmax(0,1fr) auto;gap:14px;padding:16px}
  .house-summary,.house-row .house-address{grid-column:1 / -1}
  .house-row>.house-room-count{grid-column:1;grid-row:auto}
  .house-row>.house-actions{grid-column:2;grid-row:auto}
  .house-summary>img{width:76px;height:64px}
}
.manage-post,.house-row{position:relative;transition:transform .4s ease-in-out,border-color .4s ease-in-out,box-shadow .4s ease-in-out}
.manage-post-detail::after,.house-detail-link::after{content:"";position:absolute;inset:0;border-radius:inherit;z-index:1}
.manage-post-detail:hover,.house-detail-link:hover{text-decoration:none}
.manage-post-detail:focus-visible::after,.house-detail-link:focus-visible::after{outline:3px solid #638d92;outline-offset:4px}
.manage-post-actions,.house-actions{position:relative;z-index:2}
.manage-post-actions{flex-direction:row}
@media(hover:hover) and (pointer:fine){
  .manage-post:hover,.house-row:hover{border-color:#638d92;box-shadow:0 0 0 1px #638d92,0 6px 18px #365f621a;transform:scale(1.01)}
}
@media(prefers-reduced-motion:reduce){
  .manage-post,.house-row{transition:none}
  .manage-post:hover,.house-row:hover{transform:none}
}
</style>
