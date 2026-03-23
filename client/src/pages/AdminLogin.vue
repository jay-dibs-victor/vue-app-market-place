<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { Shield, Lock, ArrowRight } from 'lucide-vue-next'

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const useAuth = useAuthStore()
const router = useRouter()

const handleLogin = async () => {
    errorMessage.value = ''
    try {
        const res = await useAuth.login({ email: email.value, password: password.value })
        if (res.user.role === 'admin') {
            router.push('/admin')
        } else {
            errorMessage.value = 'Access Denied: This portal is for administrators only.'
            useAuth.logout()
        }
    } catch (err) {
        errorMessage.value = useAuth.error || 'Login failed'
    }
}
</script>

<template>
  <div class="admin-login-page">
    <div class="auth-card glass animate-up">
      <div class="auth-header">
        <Shield :size="48" class="gradient-text" />
        <h1 class="gradient-text">Admin Portal</h1>
        <p>System control terminal</p>
      </div>

      <form @submit.prevent="handleLogin" class="auth-form">
        <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>
        
        <div class="input-group">
          <label>Admin ID (Email)</label>
          <input v-model="email" type="email" placeholder="admin@nexus.com" required>
        </div>

        <div class="input-group">
          <label>Access Key (Password)</label>
          <input v-model="password" type="password" placeholder="••••••••" required>
        </div>

        <button type="submit" class="btn-primary auth-btn" :disabled="useAuth.loading">
           {{ useAuth.loading ? 'Authenticating...' : 'Authorize Access' }} <ArrowRight :size="18" />
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.admin-login-page { height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: white; }
.auth-card { padding: 4rem; border-radius: 20px; width: 100%; max-width: 450px; text-align: center; }
.auth-header { margin-bottom: 3rem; }
.auth-header h1 { font-size: 2.2rem; margin: 1rem 0 0.5rem; }
.input-group { text-align: left; margin-bottom: 2rem; }
.input-group label { display: block; font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.5rem; text-transform: uppercase; letter-spacing: 1px; }
.input-group input { width: 100%; padding: 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; outline: none; }
.error-banner { background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; color: #ef4444; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
.auth-btn { width: 100%; height: 50px; display: flex; align-items: center; justify-content: center; gap: 10px; }
</style>
