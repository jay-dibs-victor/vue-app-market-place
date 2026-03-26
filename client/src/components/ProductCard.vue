<script setup>
import { ref } from 'vue'
import { ShoppingCart, Eye, Heart, Star } from 'lucide-vue-next'
import { useCartStore } from '../stores/cart'

const props = defineProps({
  product: Object
})

const cartStore = useCartStore()
const currentImageIndex = ref(0)
const isWishlisted = ref(false)

const setLeadImage = (index) => {
  currentImageIndex.value = index
}
</script>

<template>
  <div :class="['product-card', product.grid_layout]">
    <div class="card-image-wrapper">
      <img :src="product.images[currentImageIndex]" :alt="product.name" class="main-image" />

      <!-- Badges -->
      <div class="card-badges">
        <span v-if="product.new_arrival" class="badge-tag new">New</span>
        <span v-if="product.discount" class="badge-tag sale">Sale</span>
        <span v-if="product.top_seller" class="badge-tag hot">Top</span>
      </div>

      <!-- Thumbnail strip for carousel-lead -->
      <div v-if="product.grid_layout === 'carousel-lead'" class="thumbnails">
        <div
          v-for="(img, idx) in product.images"
          :key="idx"
          class="thumb"
          :class="{ active: currentImageIndex === idx }"
          @click.stop="setLeadImage(idx)"
        >
          <img :src="img" alt="thumb" />
        </div>
      </div>

      <!-- Hover Actions -->
      <div class="card-overlay">
        <button
          class="overlay-btn cart"
          @click.stop="cartStore.addToCart(product)"
          title="Add to Cart"
        >
          <ShoppingCart :size="17" />
          <span>Add to Cart</span>
        </button>
        <button
          class="overlay-btn icon-only"
          @click.stop="isWishlisted = !isWishlisted"
          title="Wishlist"
        >
          <Heart :size="17" :fill="isWishlisted ? '#ef4444' : 'none'" :color="isWishlisted ? '#ef4444' : 'currentColor'" />
        </button>
        <button class="overlay-btn icon-only" title="Quick View">
          <Eye :size="17" />
        </button>
      </div>
    </div>

    <div class="card-info">
      <div class="card-meta">
        <span class="moq">MOQ: 50 units</span>
        <div class="rating">
          <Star :size="12" fill="#f59e0b" color="#f59e0b" />
          <span>4.8</span>
        </div>
      </div>
      <h3 class="product-name">{{ product.name }}</h3>
      <div class="price-row">
        <span class="price">${{ product.price }}</span>
        <span v-if="product.discount" class="original-price">${{ (parseFloat(product.price) * 1.2).toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.product-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: var(--transition-smooth);
  cursor: pointer;
}

.product-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-4px);
  border-color: transparent;
}

/* ── Image ── */
.card-image-wrapper {
  position: relative;
  aspect-ratio: 1/1;
  overflow: hidden;
  background: var(--bg-surface);
}

.main-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.33, 1, 0.68, 1);
}

.product-card:hover .main-image {
  transform: scale(1.06);
}

/* ── Badges ── */
.card-badges {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.badge-tag {
  padding: 0.2rem 0.55rem;
  border-radius: 100px;
  font-size: 0.7rem;
  font-weight: 700;
}

.badge-tag.new     { background: var(--accent-primary-light); color: var(--accent-primary); }
.badge-tag.sale    { background: #fef2f2; color: var(--accent-danger); }
.badge-tag.hot     { background: #fffbeb; color: var(--accent-warning); }

/* ── Thumbnails ── */
.thumbnails {
  position: absolute;
  bottom: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  background: rgba(255,255,255,0.85);
  padding: 4px 8px;
  border-radius: 100px;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.6);
}

.thumb {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: var(--transition-smooth);
}

.thumb.active {
  border-color: var(--accent-primary);
  transform: scale(1.1);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Overlay ── */
.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.35));
  transform: translateY(100%);
  transition: var(--transition-smooth);
  align-items: center;
}

.product-card:hover .card-overlay {
  transform: translateY(0);
}

.overlay-btn {
  border: none;
  cursor: pointer;
  border-radius: var(--radius-xs);
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  font-size: 0.82rem;
  transition: var(--transition-bounce);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.overlay-btn.cart {
  flex: 1;
  background: var(--accent-primary);
  color: white;
  padding: 0.55rem 1rem;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(79,110,247,0.4);
}

.overlay-btn.cart:hover {
  background: #3d5af1;
  transform: scale(1.02);
}

.overlay-btn.icon-only {
  background: white;
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  justify-content: center;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
}

.overlay-btn.icon-only:hover {
  color: var(--accent-primary);
  transform: scale(1.1);
}

/* ── Info ── */
.card-info {
  padding: 1rem 1.1rem 1.25rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.moq {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}

.rating {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent-warning);
}

.product-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-top: 0.2rem;
}

.price {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--accent-primary);
}

.original-price {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-decoration: line-through;
}

/* ── Grid Layout Variants ── */
.wide { grid-column: span 2; }
.wide .card-image-wrapper { aspect-ratio: 16/7; }

.tall { grid-row: span 2; }
.tall .card-image-wrapper { aspect-ratio: unset; flex: 1; min-height: 500px; }

.carousel-lead .card-image-wrapper { aspect-ratio: 4/3; }
</style>
