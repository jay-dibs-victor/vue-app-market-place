import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProductStore } from '../stores/products'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import axios from 'axios'

const mockProducts = [
  { id: 1, name: 'Shirt', price: 29.99, images: '[]', variants: '[]' },
  { id: 2, name: 'Jeans', price: 59.99, images: '[]', variants: '[]' },
]

const mockCategories = [
  { id: 1, name: 'Clothing', parent_id: null },
  { id: 2, name: 'Shirts', parent_id: 1 },
]

describe('Products Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state is empty', () => {
    const store = useProductStore()
    expect(store.products).toEqual([])
    expect(store.categories).toEqual([])
    expect(store.megaMenu).toEqual([])
    expect(store.loading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchProducts()', () => {
    it('populates products on success', async () => {
      axios.get.mockResolvedValueOnce({ data: mockProducts })
      const store = useProductStore()
      await store.fetchProducts()
      expect(store.products).toEqual(mockProducts)
      expect(store.loading).toBe(false)
    })

    it('passes query params to the API', async () => {
      axios.get.mockResolvedValueOnce({ data: [] })
      const store = useProductStore()
      await store.fetchProducts({ category: 'Clothing', featured: true })
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/products'),
        expect.objectContaining({ params: { category: 'Clothing', featured: true } })
      )
    })

    it('sets error on failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network error'))
      const store = useProductStore()
      await store.fetchProducts()
      expect(store.error).toBe('Network error')
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchCategories()', () => {
    it('populates categories on success', async () => {
      axios.get.mockResolvedValueOnce({ data: mockCategories })
      const store = useProductStore()
      await store.fetchCategories()
      expect(store.categories).toEqual(mockCategories)
    })
  })

  describe('fetchMegaMenu()', () => {
    it('populates megaMenu and categories on success', async () => {
      axios.get.mockResolvedValueOnce({ data: mockCategories })
      const store = useProductStore()
      await store.fetchMegaMenu()
      expect(store.megaMenu).toEqual(mockCategories)
      expect(store.categories).toEqual(mockCategories)
    })
  })
})
