<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const slides = [
  {
    title: "Global B2B Solutions",
    subtitle: "Scale your business with verified suppliers",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=2000",
    color: "#3b82f6"
  },
  {
    title: "Industrial Innovation",
    subtitle: "Next-gen machinery and raw materials",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000",
    color: "#10b981"
  },
  {
    title: "Smart Logistics",
    subtitle: "End-to-end supply chain transparency",
    image: "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&q=80&w=2000",
    color: "#8b5cf6"
  }
]

const currentIndex = ref(0)
let timer = null

const nextSlide = () => {
  currentIndex.value = (currentIndex.value + 1) % slides.length
}

onMounted(() => {
  timer = setInterval(nextSlide, 6000)
})

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <div class="hero-slider">
    <div 
      v-for="(slide, index) in slides" 
      :key="index"
      class="slide"
      :class="{ active: currentIndex === index }"
    >
      <div class="slide-bg" :style="{ backgroundImage: `url(${slide.image})` }"></div>
      <div class="container slide-content">
        <div class="text-group">
          <p class="subtitle animate-down">{{ slide.subtitle }}</p>
          <h1 class="title animate-up">{{ slide.title }}</h1>
          <div class="cta-group animate-fade">
            <button class="btn-primary">Explore Catalog</button>
            <button class="btn-outline">Watch Demo</button>
          </div>
        </div>
      </div>
    </div>

    <div class="slider-dots">
      <div 
        v-for="(_, index) in slides" 
        :key="index"
        class="dot"
        :class="{ active: currentIndex === index }"
        @click="currentIndex = index"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.hero-slider {
  height: 85vh;
  width: 100%;
  margin-top:-80px;
  position: relative;
  overflow: hidden;
  background: #fafafa;
}

.slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 1.2s ease-in-out;
  display: flex;
  align-items: center;
  color:#fff;
}

.slide.active {
  opacity: 1;
  z-index: 10;
}

.slide-bg {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  transform: scale(1.1);
  transition: transform 6s linear;
}

.slide.active .slide-bg {
  transform: scale(1);
}

.slide-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(75,123,255,0.8) 0%, rgba(62,99,123,0.2) 100%);
}

.slide-content {
  position: relative;
  z-index: 20;
  width: 100%;
}

.text-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin: 0 auto;
}

.title {
  font-size: 5rem;
  font-weight: 800;
  line-height: 1;
  margin: 1rem auto 2.5rem;
  max-width: 800px;
}

.subtitle {
  font-size: 1.25rem;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 4px;
  font-weight: 600;
}

.cta-group {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.btn-outline {
  background: transparent;
  color: white;
  padding: 0.75rem 2rem;
  border-radius: var(--radius-sm);
  border: 1px solid white;
  cursor: pointer;
  font-weight: 600;
  transition: var(--transition-smooth);
}

.btn-outline:hover {
  background: white;
  color: black;
}

/* Dots */
.slider-dots {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 1rem;
  z-index: 30;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3);
  cursor: pointer;
  transition: var(--transition-smooth);
}

.dot.active {
  background: var(--accent-primary);
  border-color: var(--accent-primary);
  width: 30px;
  border-radius: 10px;
}

/* Animations */
.animate-up { opacity: 0; transform: translateY(50px); }
.animate-down { opacity: 0; transform: translateY(-30px); }
.animate-fade { opacity: 0; }

.active .animate-up { animation: fadeInUp 0.8s 0.3s forwards; }
.active .animate-down { animation: fadeInDown 0.8s 0.3s forwards; }
.active .animate-fade { animation: fadeIn 0.8s 0.6s forwards; }

@keyframes fadeInUp {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInDown {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .title { font-size: 3rem; }
}
</style>
