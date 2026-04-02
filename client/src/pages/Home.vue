<script setup>
import { ref, onMounted, computed } from 'vue'
import { useProductStore } from '../stores/products'
import ProductCard from '../components/ProductCard.vue'
import HeroSlider from '../components/HeroSlider.vue'
import MasonryGrid from '../components/MasonryGrid.vue'

const productStore = useProductStore()

onMounted(() => {
  productStore.fetchProducts()
})

const featuredProducts = computed(() => productStore.products.filter(p => p.featured))
const newArrivals = computed(() => productStore.products.filter(p => p.new_arrival))
const topSales = computed(() => productStore.products.filter(p => p.top_seller))
</script>

<template>
  <div class="home-page">
    <HeroSlider />

    <section class="container mt-10">
      <div class="section-header underline-animate">
        <h2>New Arrivals</h2>
        <router-link to="/products" class="view-all">View All</router-link>
      </div>
      <MasonryGrid :products="newArrivals.slice(0, 8)" />
    </section>

    <section class="promo-banner glass">
      <div class="container banner-grid">
        <div class="banner-text animate-fade-in">
          <h1 class="gradient-text">Arrival</h1>
          <p>Connect with verified global manufacturers with ease.</p>
          <button class="btn-primary">Become a Seller</button>
        </div>
        <div class="banner-image">
          <img src="https://picsum.photos/seed/b2b/800/400" alt="B2B Banner">
        </div>
      </div>
    </section>

    <section class="container">
      <div class="section-header">
        <h2>Top Sales</h2>
      </div>
      <MasonryGrid :products="topSales.slice(0, 6)" />
    </section>
  </div>
</template>

<style scoped>
.home-page {
  padding-top: 80px;
}
.mt-10{
    margin-top:10px
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3rem;
}

.section-header h2 {
  font-size: 2.5rem;
  font-weight: 800;
  position: relative;
}

.view-all {
  color: var(--accent-primary);
  text-decoration: none;
  font-weight: 600;
}

.promo-banner {
  margin: 4rem 0;
  padding: 4rem 0;
  border-left: none;
  border-right: none;
}

.banner-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 4rem;
}

.banner-text h1 {
  font-size: 3.5rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.banner-text p {
  color: var(--text-secondary);
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.banner-image img {
  width: 100%;
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
}

@media (max-width: 768px) {
  .banner-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
}
</style>
