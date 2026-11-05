import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import Home from "./views/Home.vue";
import Detail from "./views/Detail.vue";
import HouseDetail from "./views/HouseDetail.vue";
import Match from "./views/Match.vue";
import Auth from "./views/Auth.vue";
import Profile from "./views/Profile.vue";
import Manage from "./views/Manage.vue";
import PostForm from "./views/PostForm.vue";
import Guide from "./views/Guide.vue";
import References from "./views/References.vue";
import "./style.css";
import { restoreSession, state } from "./store";
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: (to, from, saved) => {
    if (saved) return saved;
    if (to.path === "/" && from.path === "/" && to.query.page !== from.query.page) return { el: "#home-listings", top: 24 };
    return { top: 0 };
  },
  routes: [
    { path: "/", component: Home },
    { path: "/tim-tro", redirect: to => ({ path: "/", query: { ...to.query, search: "1" } }) },
    { path: "/phong/:id", component: Detail },
    { path: "/nha-tro/:id", component: HouseDetail, meta: { landlordOnly: true } },
    { path: "/ghep-tro", component: Match },
    { path: "/dang-nhap", component: Auth },
    { path: "/dang-ky", component: Auth },
    { path: "/xac-thuc", redirect: to => ({ path: "/dang-ky", query: to.query }) },
    { path: "/ho-so", component: Profile },
    { path: "/quan-ly/:kind", component: Manage },
    { path: "/dang-bai/:kind", component: PostForm },
    { path: "/huong-dan", component: Guide },
    { path: "/wireframes", component: References },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
router.beforeEach(to => {
  if (to.meta.landlordOnly && !state.user) return { path: '/dang-nhap', query: { redirect: to.fullPath } };
  if (to.meta.landlordOnly && state.user?.role !== 'landlord') return '/ho-so';
  if (state.user?.role === 'landlord' && (to.path === '/' || to.path === '/ghep-tro')) return '/quan-ly/bai-dang';
});
const app = createApp(App);
app.directive("dialog-focus", {
  mounted(el) {
    const previous = document.activeElement;
    const focusable = () =>
      [
        ...el.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]'),
      ].filter((n) => !n.disabled && n.getClientRects().length);
    const handle = (e) => {
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0],
        last = items.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first || !el.contains(document.activeElement))
      ) {
        e.preventDefault();
        last.focus();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || !el.contains(document.activeElement))
      ) {
        e.preventDefault();
        first.focus();
      }
    };
    el.__cleanup = () => {
      document.removeEventListener("keydown", handle);
      previous?.focus?.();
    };
    document.addEventListener("keydown", handle);
    requestAnimationFrame(() => focusable()[0]?.focus());
  },
  unmounted(el) {
    el.__cleanup?.();
  },
});
restoreSession().finally(() => app.use(router).mount("#app"));
