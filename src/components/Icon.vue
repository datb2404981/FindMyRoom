<<<<<<< HEAD
<script setup>
import {House,Search,Users,UserRound,ArrowRight,ArrowLeft,ArrowUpRight,MapPin,SlidersHorizontal,Heart,X,Info,Plus,Check,ChevronLeft,ChevronRight,ChevronDown,Menu,ArrowUpFromLine,Trash2,Pencil,LogOut,Building2,ShieldCheck,Wifi,Square,Camera,Eye,Mail,Phone,Calendar,CheckCheck,Images,ExternalLink,Map,LayoutGrid,Bookmark,Star,RotateCcw,Wallet} from '@lucide/vue'
defineProps({name:String,size:{default:20}})
const icons={home:House,search:Search,users:Users,user:UserRound,arrow:ArrowRight,back:ArrowLeft,diagonal:ArrowUpRight,pin:MapPin,filter:SlidersHorizontal,heart:Heart,close:X,info:Info,plus:Plus,check:Check,left:ChevronLeft,right:ChevronRight,down:ChevronDown,menu:Menu,upload:ArrowUpFromLine,trash:Trash2,edit:Pencil,logout:LogOut,building:Building2,shield:ShieldCheck,wifi:Wifi,area:Square,camera:Camera,eye:Eye,mail:Mail,phone:Phone,calendar:Calendar,done:CheckCheck,images:Images,external:ExternalLink,map:Map,grid:LayoutGrid,bookmark:Bookmark,star:Star,reset:RotateCcw,wallet:Wallet}
=======
﻿<script setup>
import {House,CircleDollarSign,Search,Users,UserRound,ArrowRight,ArrowLeft,ArrowUpRight,MapPin,SlidersHorizontal,Heart,X,Info,Plus,Check,ChevronLeft,ChevronRight,ChevronDown,Menu,ArrowUpFromLine,Trash2,Pencil,LogOut,Building2,ShieldCheck,Wifi,Square,Camera,Eye,Mail,Phone,Calendar,CheckCheck,Images,ExternalLink,Map,LayoutGrid,Bookmark,Star} from '@lucide/vue'
defineProps({name:String,size:{default:20}})
const icons={home:House,dollar:CircleDollarSign,search:Search,users:Users,user:UserRound,arrow:ArrowRight,back:ArrowLeft,diagonal:ArrowUpRight,pin:MapPin,filter:SlidersHorizontal,heart:Heart,close:X,info:Info,plus:Plus,check:Check,left:ChevronLeft,right:ChevronRight,down:ChevronDown,menu:Menu,upload:ArrowUpFromLine,trash:Trash2,edit:Pencil,logout:LogOut,building:Building2,shield:ShieldCheck,wifi:Wifi,area:Square,camera:Camera,eye:Eye,mail:Mail,phone:Phone,calendar:Calendar,done:CheckCheck,images:Images,external:ExternalLink,map:Map,grid:LayoutGrid,bookmark:Bookmark,star:Star}
>>>>>>> origin/ThuLam
</script>
<template><component :is="icons[name]||icons.home" :size="size" :stroke-width="1.7" aria-hidden="true"/></template>
