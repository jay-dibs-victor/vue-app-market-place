import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: JSON.parse(localStorage.getItem('cart')) || [],
  }),
  getters: {
    totalItems: (state) => state.items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: (state) => state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2),
  },
  actions: {
    persist() {
      localStorage.setItem('cart', JSON.stringify(this.items))
    },
    addToCart(product) {
      const existing = this.items.find(i => i.id === product.id)
      if (existing) {
        existing.quantity++
      } else {
        this.items.push({ ...product, quantity: 1 })
      }
      this.persist()
    },
    removeFromCart(productId) {
      this.items = this.items.filter(i => i.id !== productId)
      this.persist()
    },
    updateQuantity(productId, quantity) {
      const item = this.items.find(i => i.id === productId)
      if (item) {
        item.quantity = Math.max(1, quantity)
      }
      this.persist()
    },
    clearCart() {
      this.items = []
      this.persist()
    }
  }
})
