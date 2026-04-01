import { defineStore } from 'pinia'
import axios from 'axios'

const API = 'http://localhost:5005'

export const useOrderStore = defineStore('orders', {
  state: () => ({
    orders: [],
    currentOrder: null,
    loading: false,
    error: null
  }),
  actions: {
    async placeOrder(orderData) {
      this.loading = true
      try {
        const res = await axios.post(`${API}/api/orders`, orderData)
        this.currentOrder = res.data
        return res.data
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },
    async fetchOrders(userId) {
      this.loading = true
      try {
        const res = await axios.get(`${API}/api/orders`, { params: { userId } })
        this.orders = res.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },
    async fetchOrderById(id) {
      this.loading = true
      try {
        const res = await axios.get(`${API}/api/orders/${id}`)
        this.currentOrder = res.data
        return res.data
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    }
  }
})
