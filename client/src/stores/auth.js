import { defineStore } from 'pinia'
import axios from 'axios'

const API = 'http://localhost:5005'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null,
        loading: false,
        error: null
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
    },
    actions: {
        async login(credentials) {
            this.loading = true
            this.error = null
            try {
                const res = await axios.post(`${API}/api/auth/login`, credentials)
                if (res.data.success) {
                    this.user = res.data.user
                    this.token = res.data.token
                    localStorage.setItem('user', JSON.stringify(this.user))
                    localStorage.setItem('token', this.token)
                    return res.data
                }
            } catch (err) {
                this.error = err.response?.data?.message || err.message
                throw err
            } finally {
                this.loading = false
            }
        },
        async signup(userData) {
            this.loading = true
            this.error = null
            try {
                const res = await axios.post(`${API}/api/auth/register`, userData)
                if (res.data.success) {
                    this.user = res.data.user
                    this.token = res.data.token
                    localStorage.setItem('user', JSON.stringify(this.user))
                    localStorage.setItem('token', this.token)
                    return res.data
                }
            } catch (err) {
                this.error = err.response?.data?.message || err.message
                throw err
            } finally {
                this.loading = false
            }
        },
        logout() {
            this.user = null
            this.token = null
            localStorage.removeItem('user')
            localStorage.removeItem('token')
        }
    }
})
