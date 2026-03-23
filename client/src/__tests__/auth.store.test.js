import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../stores/auth'

// Mock axios so no real HTTP requests are made
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
}))

import axios from 'axios'

const mockUser = { id: 1, email: 'test@example.com', role: 'customer' }
const mockToken = 'mock.jwt.token'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('initial state – not authenticated when localStorage is empty', () => {
    const auth = useAuthStore()
    expect(auth.user).toBeNull()
    expect(auth.token).toBeNull()
    expect(auth.isAuthenticated).toBe(false)
    expect(auth.loading).toBe(false)
    expect(auth.error).toBeNull()
  })

  it('isAuthenticated – true when token is set', () => {
    localStorage.setItem('token', mockToken)
    localStorage.setItem('user', JSON.stringify(mockUser))
    // Re-create store so it hydrates from localStorage
    setActivePinia(createPinia())
    const auth = useAuthStore()
    expect(auth.isAuthenticated).toBe(true)
  })

  describe('login()', () => {
    it('sets user and token on successful login', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true, user: mockUser, token: mockToken }
      })

      const auth = useAuthStore()
      const result = await auth.login({ email: mockUser.email, password: 'secret' })

      expect(auth.user).toEqual(mockUser)
      expect(auth.token).toBe(mockToken)
      expect(auth.loading).toBe(false)
      expect(result.success).toBe(true)
    })

    it('persists user and token to localStorage on login', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true, user: mockUser, token: mockToken }
      })
      const auth = useAuthStore()
      await auth.login({ email: mockUser.email, password: 'secret' })

      expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUser)
      expect(localStorage.getItem('token')).toBe(mockToken)
    })

    it('sets error and throws on failed login', async () => {
      const err = { response: { data: { message: 'Invalid credentials' } } }
      axios.post.mockRejectedValueOnce(err)

      const auth = useAuthStore()
      await expect(auth.login({ email: 'x@x.com', password: 'wrong' })).rejects.toBeTruthy()
      expect(auth.error).toBe('Invalid credentials')
      expect(auth.loading).toBe(false)
    })
  })

  describe('signup()', () => {
    it('sets user and token on successful signup', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true, user: mockUser, token: mockToken }
      })
      const auth = useAuthStore()
      await auth.signup({ email: mockUser.email, password: 'secret', role: 'customer' })

      expect(auth.user).toEqual(mockUser)
      expect(auth.token).toBe(mockToken)
    })

    it('handles signup failure', async () => {
      axios.post.mockRejectedValueOnce({ message: 'Email taken' })
      const auth = useAuthStore()
      await expect(auth.signup({ email: 'a@a.com', password: 'p' })).rejects.toBeTruthy()
      expect(auth.error).toBeTruthy()
    })
  })

  describe('logout()', () => {
    it('clears user and token from state and localStorage', async () => {
      axios.post.mockResolvedValueOnce({
        data: { success: true, user: mockUser, token: mockToken }
      })
      const auth = useAuthStore()
      await auth.login({ email: mockUser.email, password: 'secret' })

      auth.logout()

      expect(auth.user).toBeNull()
      expect(auth.token).toBeNull()
      expect(localStorage.getItem('user')).toBeNull()
      expect(localStorage.getItem('token')).toBeNull()
    })
  })
})
