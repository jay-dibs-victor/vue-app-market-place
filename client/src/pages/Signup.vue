<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Mail, Lock, Building, ArrowRight } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const useAuth = useAuthStore()

const form = ref({
  name: '',
  email: '',
  password: '',
  role: 'customer'
})
const errorMessage = ref('')

const handleSignup = async () => {
  errorMessage.value = ''
  try {
    await useAuth.signup(form.value)
    router.push('/')
  } catch (err) {
    errorMessage.value = useAuth.error || 'Signup failed'
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card glass">
      <div class="auth-header">
        <h1 class="gradient-text">Create Account</h1>
        <p>Join the global B2B network</p>
      </div>

      <form @submit.prevent="handleSignup" class="auth-form">
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
        <div class="input-group">
          <label>Full Name</label>
          <div class="input-wrapper">
            <User :size="20" />
            <input v-model="form.name" type="text" placeholder="John Doe" required>
          </div>
        </div>

        <div class="input-group">
          <label>Email Address</label>
          <div class="input-wrapper">
            <Mail :size="20" />
            <input v-model="form.email" type="email" placeholder="name@company.com" required>
          </div>
        </div>

        <div class="input-group">
          <label>Password</label>
          <div class="input-wrapper">
            <Lock :size="20" />
            <input v-model="form.password" type="password" placeholder="••••••••" required>
          </div>
        </div>

        <button type="submit" class="btn-primary auth-submit" :disabled="useAuth.loading">
          <span v-if="!useAuth.loading">Get Started <ArrowRight :size="18" /></span>
          <span v-else class="loader"></span>
        </button>
      </form>

      <div class="auth-footer">
        <p>Already have an account? <router-link to="/login">Sign In</router-link></p>
        <div class="divider"><span>FOR BUSINESS</span></div>
        <router-link to="/seller/signup" class="seller-cta">
          <Building :size="18" /> Become a Seller
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Same as Login.vue styling */
.auth-page { 
    height: 100vh; 
    display: flex;
     align-items: center; 
     justify-content: center; 
     background: radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.15), transparent); 
    }
.auth-card { 
    width: 100%; 
    max-width: 480px; 
    padding: 3rem; border-radius: var(--radius-lg); 
}
.auth-header { 
    text-align: center; margin-bottom: 2.5rem;
 }
.auth-header h1 { 
    font-size: 2.5rem;
     margin-bottom: 0.5rem;
     }
.auth-header p { color: var(--text-secondary); }

.error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--accent-danger);
  color: var(--accent-danger);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
  text-align: center;
}
.input-group { margin-bottom: 1.5rem; }
.input-group label { 
    display: block; 
    font-size: 0.9rem; 
    margin-bottom: 0.5rem; 
    color: var(--text-secondary); 
}
.input-wrapper { 
    background: rgba(255,255,255,0.05); 
    border: 1px solid var(--border-glass); 
    border-radius: var(--radius-sm); 
    padding: 0.75rem 1rem; 
    display: flex; align-items: center; 
    gap: 12px; 
}
.input-wrapper input { 
    background: none; border: none;
     color: var(--text-primary); 
     width: 100%; outline: none;
      transition: var(--transition-smooth); 
}
.auth-submit { 
    width: 100%; 
    height: 50px; 
    display: flex; align-items: center; 
    justify-content: center; gap: 10px; 
}
.auth-footer { 
    text-align: center; margin-top: 2rem; 
}
.divider { 
    margin: 2.5rem 0; 
    position: relative; 
    height: 1px; 
    background: var(--border-glass); 
}
.divider span { 
    position: absolute; 
    top: 50%; left: 50%; 
    transform: translate(-50%, -50%); 
    background: #131317; padding: 0 10px; 
    color: var(--text-secondary); 
    font-size: 0.75rem; 
    letter-spacing: 1px; 
}
.seller-cta { 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 10px; 
    padding: 0.75rem; 
    border: 1px solid var(--accent-secondary); 
    border-radius: var(--radius-sm); color: var(--accent-secondary) !important; 
    text-decoration: none; font-weight: 600; 
}
.loader { 
    width: 20px; 
    height: 20px; 
    border: 2px solid white; 
    border-bottom-color: transparent; border-radius: 50%; 
    animation: rotation 1s linear infinite; 
}
@keyframes rotation { 
    0% { 
        transform: rotate(0deg); 
        } 
        100% {
             transform: rotate(360deg); 
      } 
    }
</style>
