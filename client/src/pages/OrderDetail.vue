<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOrderStore } from '../stores/orders'
import { CheckCircle, Package, Truck, MapPin, Copy, ArrowRight } from 'lucide-vue-next'

const route  = useRoute()
const router = useRouter()
const orderStore = useOrderStore()
const order = ref(null)
const isNew = computed(() => route.query.new === '1')
const copied = ref(false)

onMounted(async () => {
  order.value = await orderStore.fetchOrderById(route.params.id)
})

const statusSteps = ['placed', 'confirmed', 'shipped', 'delivered']
const statusLabel = { placed: 'Order Placed', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered' }
const statusDesc  = {
  placed:    'Your order has been received and is awaiting confirmation.',
  confirmed: 'Your order has been confirmed and is being prepared.',
  shipped:   'Your order is on the way.',
  delivered: 'Your order has been delivered.'
}

const activeStep = computed(() => {
  if (!order.value) return 0
  return statusSteps.indexOf(order.value.status)
})

const copyOrderId = () => {
  navigator.clipboard.writeText(route.params.id)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>

<template>
  <div class="order-page">
    <div class="container order-layout">

      <!-- ── Order Confirmation Banner ── -->
      <div v-if="isNew" class="confirm-banner animate-fade-in-up">
        <div class="banner-icon">
          <CheckCircle :size="40" color="white" />
        </div>
        <div class="banner-text">
          <h1>Order Confirmed!</h1>
          <p>Thank you for your order. You'll receive a confirmation email shortly.</p>
        </div>
      </div>

      <div v-if="!order" class="loading-state">
        <div class="skeleton" style="height:200px; border-radius:14px;"></div>
      </div>

      <template v-else>
        <!-- ── Order Header ── -->
        <div class="order-header card">
          <div class="order-id-row">
            <div>
              <span class="oid-label">Order ID</span>
              <div class="oid-value">
                #{{ order.id }}
                <button class="copy-btn" @click="copyOrderId" :title="copied ? 'Copied!' : 'Copy'">
                  <CheckCircle v-if="copied" :size="15" color="var(--accent-secondary)" />
                  <Copy v-else :size="15" />
                </button>
              </div>
            </div>
            <div class="order-date">
              <span class="oid-label">Date</span>
              <span>{{ new Date(order.created_at).toLocaleDateString('en-US', {day:'numeric',month:'long',year:'numeric'}) }}</span>
            </div>
            <div>
              <span class="oid-label">Payment</span>
              <span class="capitalize">{{ order.payment_method || 'Card' }}</span>
            </div>
            <div>
              <span class="oid-label">Total</span>
              <span class="order-total">${{ order.total_amount }}</span>
            </div>
            <span class="status-pill" :class="order.status">{{ order.status }}</span>
          </div>
        </div>

        <!-- ── Progress Tracker ── -->
        <div class="tracker card animate-fade-in-up">
          <h3>Shipment Status</h3>
          <div class="progress-track">
            <div class="track-line">
              <div class="track-fill" :style="{ width: (activeStep / (statusSteps.length - 1) * 100) + '%' }"></div>
            </div>
            <div v-for="(s, i) in statusSteps" :key="s" class="track-node" :class="{ done: i <= activeStep, active: i === activeStep }">
              <div class="node-dot">
                <CheckCircle v-if="i < activeStep" :size="18" color="white" />
                <Package v-else-if="s === 'placed'" :size="16" />
                <Truck    v-else-if="s === 'shipped'" :size="16" />
                <MapPin   v-else-if="s === 'delivered'" :size="16" />
                <span v-else>✓</span>
              </div>
              <span class="node-label">{{ statusLabel[s] }}</span>
            </div>
          </div>
          <p class="status-desc">{{ statusDesc[order.status] || 'Processing your order.' }}</p>
        </div>

        <!-- ── Shipping + Items ── -->
        <div class="order-detail-grid">
          <!-- Shipping address -->
          <div class="detail-card card">
            <h4><MapPin :size="16" /> Shipping Address</h4>
            <p>{{ order.shipping_details.firstName }} {{ order.shipping_details.lastName }}</p>
            <p>{{ order.shipping_details.company }}</p>
            <p>{{ order.shipping_details.address }}</p>
            <p>{{ order.shipping_details.city }}, {{ order.shipping_details.state }} {{ order.shipping_details.zip }}</p>
            <p>{{ order.shipping_details.country }}</p>
            <p class="ship-email">{{ order.shipping_details.email }}</p>
          </div>

          <!-- Shipping method -->
          <div class="detail-card card">
            <h4><Truck :size="16" /> Shipping Method</h4>
            <p class="ship-method">{{ order.shipping_method || 'Standard Freight' }}</p>
            <p class="ship-cost">Cost: ${{ order.shipping_cost }}</p>
            <p class="ship-note">Estimated: 7–14 business days</p>
          </div>
        </div>

        <!-- Order items -->
        <div class="items-card card animate-fade-in-up">
          <h3>Items Ordered</h3>
          <div v-for="item in (order.items || [])" :key="item.id" class="order-item">
            <img :src="item.images[0] || 'https://picsum.photos/seed/ord/80'" :alt="item.name" />
            <div class="item-details">
              <p class="item-name">{{ item.name }}</p>
              <p class="item-meta">Qty: {{ item.quantity }} × ${{ item.price }}</p>
            </div>
            <span class="item-subtotal">${{ (item.quantity * item.price).toFixed(2) }}</span>
          </div>

          <div class="order-totals">
            <div class="ot-row"><span>Subtotal</span><span>${{ (order.total_amount - order.shipping_cost - (order.tax || 0)).toFixed(2) }}</span></div>
            <div class="ot-row"><span>Shipping</span><span>${{ order.shipping_cost }}</span></div>
            <div class="ot-row"><span>Tax</span><span>${{ order.tax }}</span></div>
            <div class="ot-row grand"><span>Total</span><span>${{ order.total_amount }}</span></div>
          </div>
        </div>

        <div class="order-actions">
          <router-link to="/products" class="btn-primary">Continue Shopping <ArrowRight :size="16" /></router-link>
          <router-link to="/dashboard" class="btn-outline">View All Orders</router-link>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.order-page { 
    padding: 2rem 0 6rem; 
    min-height: 100vh; 
    background: var(--bg-main); 
}
.order-layout { 
    max-width: 900px; 
    display: flex; 
    flex-direction: column; 
    gap: 1.75rem; 
}

.confirm-banner {
  background: linear-gradient(135deg, var(--accent-secondary), #059669);
  border-radius: 16px; 
  padding: 2rem 2.5rem;
  display: flex; 
  gap: 1.5rem; 
  align-items: center; 
  color: white;
}
.banner-icon {
  width: 72px; 
  height: 72px; 
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  display: flex; 
  align-items: center; 
  justify-content: center; flex-shrink: 0;
}
.banner-text h1 { 
    font-size: 1.75rem; 
    font-weight: 800; 
    margin-bottom: 0.4rem; 
}
.banner-text p  { opacity: 0.9; font-size: 1rem; }

.card { 
    background: white; 
    border: 1px solid var(--border); 
    border-radius: 14px; padding: 1.75rem; 
}

.order-id-row {
  display: flex; 
  align-items: center; 
  flex-wrap: wrap; 
  gap: 2rem;
}
.oid-label { 
    display: block; 
    font-size: 0.72rem; 
    text-transform: uppercase; 
    letter-spacing: 0.08em;
     color: var(--text-muted); 
     margin-bottom: 0.2rem;
    
}
.oid-value { 
    font-size: 1.1rem; 
    font-weight: 800; 
    display: flex; 
    align-items: center; 
    gap: 0.5rem; 
}
.copy-btn { 
    background: none; 
    border: none; 
    cursor: pointer; 
    color: var(--text-muted); display: flex; 
}
.order-total { 
    font-size: 1.1rem; 
    font-weight: 800; 
    color: var(--accent-primary); 
}
.status-pill {
  padding: 0.3rem 1rem; 
  border-radius: 100px; 
  font-size: 0.78rem; 
  font-weight: 700;
  text-transform: capitalize; 
  margin-left: auto;
}
.status-pill.placed    { 
    background: #fffbeb; 
    color: var(--accent-warning); 
}
.status-pill.confirmed { 
    background: var(--accent-primary-light); 
    color: var(--accent-primary); 
}
.status-pill.shipped   { 
    background: #f3efff; 
    color: var(--accent-tertiary); 
}
.status-pill.delivered { 
    background: var(--accent-secondary-light); 
    color: var(--accent-secondary); 
}

.tracker h3 { 
    margin-bottom: 2rem; 
    font-size: 1rem; 
    font-weight: 700; 
}
.progress-track { 
    position: relative; 
    display: flex; 
    justify-content: space-between; 
    margin-bottom: 1.5rem; 
}
.track-line {
  position: absolute; 
  top: 16px; left: 0; 
  right: 0; height: 3px;
  background: var(--border); 
  border-radius: 4px; z-index: 0;
}
.track-fill {
  height: 100%; 
  background: var(--accent-secondary);
  border-radius: 4px; 
  transition: width 1s ease;
}
.track-node { 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    gap: 0.5rem; 
    position: relative; 
    z-index: 1; 
}
.node-dot {
  width: 34px; 
  height: 34px; 
  border-radius: 50%;
  background: var(--bg-surface); 
  border: 2px solid var(--border-strong);
  display: flex; 
  align-items: center; 
  justify-content: center;
  color: var(--text-muted); 
  font-size: 0.75rem;
  transition: all 0.4s;
}
.track-node.done .node-dot   { 
    background: var(--accent-secondary); 
    border-color: var(--accent-secondary); 
    color: white; 
}
.track-node.active .node-dot { 
    background: var(--accent-primary); 
    border-color: var(--accent-primary); 
    color: white; 
    box-shadow: 0 0 0 4px rgba(79,110,247,0.2); 
}
.node-label { 
    font-size: 0.72rem; 
    font-weight: 600; 
    color: var(--text-muted); white-space: nowrap; 
}
.track-node.done .node-label   { color: var(--accent-secondary); }
.track-node.active .node-label { color: var(--accent-primary); }
.status-desc { 
    font-size: 0.88rem;
     color: var(--text-secondary); 
     text-align: center; 
     margin-top: 0.5rem; 
}

.order-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.detail-card h4 { 
    display: flex; 
    align-items: center; 
    gap: 0.4rem; 
    font-size: 0.85rem; 
    font-weight: 700; 
    color: var(--text-muted); 
    text-transform: uppercase; 
    letter-spacing: 0.07em; 
    margin-bottom: 1rem; }
.detail-card p { font-size: 0.9rem; color: var(--text-secondary); line-height: 1.7; }
.ship-email { color: var(--accent-primary); }
.ship-method { 
    font-weight: 700; 
    color: var(--text-primary); 
    font-size: 1rem; }
.ship-cost   { 
    color: var(--accent-primary); font-weight: 600; }
.ship-note   { 
    color: var(--text-muted); font-size: 0.82rem; }

.items-card h3 { margin-bottom: 1.5rem; font-size: 1rem; font-weight: 700; }
.order-item {
  display: flex; align-items: center; gap: 1.25rem;
  padding: 1rem 0; border-bottom: 1px solid var(--border);
}
.order-item img { 
    width: 64px; 
    height: 64px; 
    object-fit: cover; 
    border-radius: 10px; 
    border: 1px solid var(--border); 
}
.item-name  { font-weight: 600; font-size: 0.95rem; }
.item-meta  { color: var(--text-muted); font-size: 0.8rem; }
.item-subtotal { 
    margin-left: auto; 
    font-weight: 800; 
    color: var(--accent-primary); }

.order-totals { 
    margin-top: 1.25rem; 
    display: flex; 
    flex-direction:
     column; gap: 0.6rem; }
.ot-row { 
    display: flex;
     justify-content: space-between; 
     font-size: 0.9rem; 
     color: var(--text-secondary); }
.ot-row.grand { 
    font-size: 1.1rem; 
    font-weight: 800; 
    color: var(--text-primary); 
    padding-top: 0.75rem; 
    border-top: 2px solid var(--text-primary); }

.order-actions { 
    display: flex; 
    gap: 1rem; 
    flex-wrap: wrap; }
.order-actions a { 
    flex: 1; 
    justify-content: center; 
    min-width: 160px; }

@media (max-width: 640px) {
  .order-detail-grid { grid-template-columns: 1fr; }
  .progress-track { overflow-x: auto; gap: 1rem; }
}
</style>
