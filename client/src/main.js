import { createApp, markRaw } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import './index.css'
import App from './App.vue'
import { useAuthStore } from './stores/auth'


const routes = [
  { path: '/', component: () => import('./pages/Home.vue') },
  { path: '/login', component: () => import('./pages/Login.vue') },
  { path: '/signup', component: () => import('./pages/Signup.vue') },
  { path: '/admin-login', component: () => import('./pages/AdminLogin.vue') },
  { path: '/products', component: () => import('./pages/Products.vue') },
  { path: '/cart', component: () => import('./pages/Cart.vue'), meta: { requiresAuth: true } },
  { path: '/checkout', component: () => import('./pages/Checkout.vue'), meta: { requiresAuth: true } },
  { path: '/orders/:id', component: () => import('./pages/OrderDetail.vue'), meta: { requiresAuth: true } },
  { path: '/dashboard', component: () => import('./pages/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/orders', component: () => import('./pages/Dashboard.vue'), meta: { requiresAuth: true } }, 

  { path: '/seller/signup', component: () => import('./pages/SellerSignup.vue') },
  { path: '/seller/setup', component: () => import('./pages/SellerSignup.vue'), meta: { requiresAuth: true, role: 'seller' } },
  { path: '/seller/add-product', component: () => import('./pages/AddProduct.vue'), meta: { requiresAuth: true, role: 'seller' } },

  { path: '/store/:id', component: () => import('./pages/Storefront.vue') },
  { path: '/admin', component: () => import('./pages/Admin.vue'), meta: { requiresAuth: true, role: 'admin' } },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    next('/')
  } else {
    next()
  }
})

const app = createApp(App)
const pinia = createPinia()
pinia.use(({ store }) => { store.router = markRaw(router) })
app.use(pinia)
app.use(router)
app.mount('#app')
