<script setup>
import {computed,ref,reactive} from 'vue'
import Icon from '../components/Icon.vue'
import {state,validateField,updateAccount} from '../store'
const editing=ref(false),confirm=ref(false),notice=ref(''),errors=reactive({}),form=reactive({...state.profile}),avatar=ref('')
const landlord=computed(()=>state.user?.role==='landlord')
const fields=computed(()=>landlord.value?[['name','Họ và tên'],['cccd','CCCD'],['taxCode','Mã số thuế'],['gender','Giới tính'],['birth','Ngày sinh','date'],['phone','Số điện thoại','tel'],['zalo','Số điện thoại Zalo','tel'],['email','Email','email'],['address','Địa chỉ']]:[['name','Họ và tên'],['studentId','Mã sinh viên'],['birth','Ngày sinh','date'],['gender','Giới tính'],['school','Trường đại học'],['major','Ngành học'],['phone','Số điện thoại','tel'],['zalo','Số điện thoại Zalo','tel'],['email','Email','email'],['address','Địa chỉ']])
const groups=computed(()=>[
 {id:'identity',icon:'user',title:'Thông tin cơ bản',description:'Thông tin cá nhân của bạn.',fields:fields.value.filter(([key])=>!['phone','zalo','email','address'].includes(key))},
 {id:'contact',icon:'phone',title:'Thông tin liên hệ',description:'Giúp mọi người kết nối với bạn.',fields:fields.value.filter(([key])=>['phone','zalo','email','address'].includes(key))}
])
function save(){Object.keys(errors).forEach(k=>delete errors[k]);for(const k of ['name','email','phone','zalo']){const e=validateField(k,form[k]);if(e)errors[k]=e}if(!Object.keys(errors).length)confirm.value=true}
async function commit(){try{await updateAccount(form);editing.value=false;confirm.value=false;notice.value='Đã lưu thông tin cá nhân.'}catch(error){confirm.value=false;notice.value=error.message;if(error.field)errors[error.field]=error.message}}
function upload(e){const f=e.target.files[0];if(!f)return;if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>10*1024*1024){notice.value='Chọn ảnh JPG, PNG, WEBP tối đa 10 MB.';return}if(avatar.value)URL.revokeObjectURL(avatar.value);avatar.value=URL.createObjectURL(f)}
</script>
<template><div v-if="!state.user" class="container empty-state"><span class="empty-icon"><Icon name="user" :size="40"/></span><h1>Không gian của riêng bạn</h1><p>Đăng nhập để xem hồ sơ và quản lý bài đăng.</p><RouterLink to="/dang-nhap?redirect=/ho-so" class="button primary">Đăng nhập <Icon name="arrow" :size="18"/></RouterLink></div><div v-else class="container page profile-page"><div class="section-heading"><div><span class="eyebrow">Tài khoản của bạn</span><h1>Thông tin cá nhân</h1></div><button v-if="!editing" class="button secondary" @click="editing=true;notice=''"><Icon name="edit" :size="17"/>Chỉnh sửa</button></div><p v-if="notice" class="notice" role="status">{{notice}}</p><div class="profile-layout"><aside class="profile-summary"><div class="profile-cover" aria-hidden="true"></div><div class="profile-avatar"><img v-if="avatar" :src="avatar" alt="Ảnh đại diện"><span v-else>{{state.profile.name.split(' ').map(s=>s[0]).slice(-2).join('')}}</span><label v-if="editing" class="avatar-edit"><Icon name="camera" :size="18"/><input type="file" accept="image/jpeg,image/png,image/webp" @change="upload" aria-label="Đổi ảnh đại diện"></label></div><h2>{{state.profile.name}}</h2><p class="muted">{{landlord?'Chủ trọ':'Sinh viên'}}<template v-if="!landlord"> · {{state.profile.school}}</template></p><nav class="profile-links" aria-label="Điều hướng hồ sơ"><RouterLink to="/ho-so"><Icon name="user" :size="18"/>Thông tin cá nhân</RouterLink><RouterLink to="/quan-ly/bai-dang"><Icon name="grid" :size="18"/>Quản lý bài đăng</RouterLink><RouterLink v-if="state.user.role==='landlord'" to="/quan-ly/nha-tro"><Icon name="building" :size="18"/>Quản lý nhà trọ</RouterLink></nav></aside><form class="form-panel profile-form" :class="{'is-editing':editing}" @submit.prevent="save"><section v-for="group in groups" :key="group.id" class="profile-section" :aria-labelledby="'profile-'+group.id"><div class="profile-section-heading"><span class="profile-section-icon"><Icon :name="group.icon" :size="20"/></span><div><h2 :id="'profile-'+group.id">{{group.title}}</h2><p>{{group.description}}</p></div></div><div class="form-grid"><label v-for="[key,label,type] in group.fields" :key="key" class="field" :class="{'span-two':['name','email','address'].includes(key)}"><span>{{label}}</span><select v-if="key==='gender'" v-model="form[key]" :disabled="!editing"><option>Nam</option><option>Nữ</option><option>Khác</option></select><input v-else v-model.trim="form[key]" :type="type||'text'" :placeholder="editing ? 'Nhập '+label.toLowerCase() : 'Chưa cập nhật'" :disabled="!editing" :aria-invalid="!!errors[key]"><small class="error" v-if="errors[key]">{{errors[key]}}</small></label></div></section><div v-if="!landlord" class="form-grid profile-bio"><label class="field span-two"><span>Giới thiệu bản thân</span><textarea v-model="form.bio" :disabled="!editing" rows="4" placeholder="Chia sẻ đôi chút về bạn và thói quen sống…"></textarea></label></div><div v-if="editing" class="form-actions"><button type="button" class="button secondary" @click="Object.assign(form,state.profile);editing=false">Hủy</button><button class="button primary">Lưu thay đổi <Icon name="check" :size="18"/></button></div></form></div><Teleport to="body"><div v-if="confirm" class="modal-backdrop" @click.self="confirm=false" @keydown.esc="confirm=false"><section class="modal" v-dialog-focus role="dialog" aria-modal="true" aria-labelledby="profile-confirm"><span class="empty-icon"><Icon name="check" :size="28"/></span><h2 id="profile-confirm">Lưu thay đổi?</h2><p>Thông tin cá nhân của bạn sẽ được cập nhật trên thiết bị này.</p><div class="form-actions"><button class="button secondary" @click="confirm=false">Quay lại</button><button class="button primary" @click="commit">Xác nhận lưu</button></div></section></div></Teleport></div></template>

<style scoped>
.profile-page { max-width: 1120px; }
.profile-page > .section-heading { margin-bottom: 28px; align-items: center; }
.profile-page > .section-heading h1 { font-size: clamp(26px, 3vw, 34px); margin-bottom: 0; }
.profile-layout { grid-template-columns: 270px minmax(0, 1fr); gap: 28px; align-items: start; }
.profile-summary { position: relative; padding: 0 18px 20px; border: 1px solid var(--line); border-radius: 18px; background: #fff; overflow: hidden; }
.profile-cover { height: 88px; margin: 0 -18px; background: var(--cream-deep); border-bottom: 1px solid var(--line); }
.profile-avatar { width: 96px; height: 96px; margin: -48px auto 16px; border: 5px solid #fff; box-shadow: 0 0 0 1px var(--line); font-size: 30px; }
.profile-summary h2 { font-size: 21px; line-height: 1.35; margin: 0 0 8px; overflow-wrap: anywhere; }
.profile-summary > p { margin: 0; font-size: 13px; }
.profile-links { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); gap: 6px; }
.profile-links > a { min-height: 44px; padding: 11px 12px; font-size: 13px; border: 0; transition: background-color .2s ease; }
.profile-links > a.router-link-exact-active { font-weight: 600; }
.profile-form { padding: 0 30px; border-radius: 18px; box-shadow: 0 2px 8px #13141404; min-width: 0; }
.profile-section { padding: 28px 0; }
.profile-section + .profile-section { border-top: 1px solid var(--line); }
.profile-section-heading { display: flex; gap: 12px; align-items: center; margin-bottom: 22px; }
.profile-section-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 42px; height: 42px; border-radius: 12px; background: var(--cream-deep); }
.profile-section-heading h2 { font-size: 18px; line-height: 1.4; margin: 0 0 3px; }
.profile-section-heading p { color: var(--muted); font-size: 13px; margin: 0; }
.profile-form .form-grid { gap: 20px; }
.profile-form .field { margin: 0; min-width: 0; font-size: 13px; gap: 7px; }
.profile-form :is(input, select, textarea) { min-width: 0; min-height: 46px; font-size: 14px; border-radius: 9px; transition: background-color .2s ease, border-color .2s ease; }
.profile-form :is(input, select, textarea):disabled { opacity: 1; color: var(--ink); -webkit-text-fill-color: var(--ink); background: var(--cream); border-color: transparent; cursor: default; }
.profile-form input:disabled::placeholder { color: var(--muted); -webkit-text-fill-color: var(--muted); }
.profile-bio { padding: 0 0 28px; }
.profile-form .form-actions { padding: 20px 0 24px; margin: 0; border-top: 1px solid var(--line); }
@media (max-width: 800px) {
  .profile-layout { grid-template-columns: 225px minmax(0, 1fr); gap: 20px; }
  .profile-form { padding-inline: 22px; }
}
@media (max-width: 600px) {
  .profile-layout { display: grid; grid-template-columns: minmax(0, 1fr); }
  .profile-page > .section-heading { gap: 12px; flex-wrap: wrap; }
  .profile-summary { padding-bottom: 16px; }
  .profile-links { grid-template-columns: minmax(0, 1fr); }
  .profile-form { padding-inline: 20px; }
  .profile-form .form-grid { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .profile-section { padding-block: 24px; }
  .profile-section-heading h2 { font-size: 17px; }
}
@media (prefers-reduced-motion: reduce) {
  .profile-links > a, .profile-form :is(input, select, textarea) { transition: none; }
}
</style>
