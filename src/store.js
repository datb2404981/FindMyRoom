import { reactive, watch } from 'vue'
import { rooms } from './data'
const key='findmyroom-demo-v1'
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
export const state=reactive({user:null,profile:{name:'Phạm Hoàng Hiếu',studentId:'B224097',birth:'2005-11-23',gender:'Nam',school:'Đại học Cần Thơ',major:'Kỹ thuật phần mềm',phone:'0903030911',zalo:'0903030911',email:'phamhoanghieu@example.com',address:'Cần Thơ',bio:''},favorites:[],likes:[],passed:[],houses:[{id:'minh-an',name:'Nhà trọ Minh An',address:'Nguyễn Văn Cừ, An Bình, Ninh Kiều, Cần Thơ',rooms:36,status:'Đang hoạt động',desc:'Trọ sạch sẽ, thoáng mát, an ninh tốt'}],posts:rooms.slice(0,3).map(r=>({...r,kind:'rental'})),drafts:{roommate:{},rental:{}},...saved})
watch(state,()=>{try{const {user,...persist}=state; localStorage.setItem(key,JSON.stringify(persist))}catch{}},{deep:true})
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
