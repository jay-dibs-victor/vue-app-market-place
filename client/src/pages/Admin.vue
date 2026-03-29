<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { Shield, CheckCircle, XCircle, Users, Package, AlertTriangle } from 'lucide-vue-next'

const pendingSellers = ref([])
const pendingProducts = ref([])
const stats = ref({ sellers: 0, products: 0, revenue: 0 })

const fetchData = async () => {
    try {
        const sellersRes = await axios.get('http://localhost:5005/api/admin/pending-sellers')
        pendingSellers.value = sellersRes.data
        
        const productsRes = await axios.get('http://localhost:5005/api/admin/pending-products')
        pendingProducts.value = productsRes.data

        const allSellers = await axios.get('http://localhost:5005/api/sellers')
        const allProds = await axios.get('http://localhost:5005/api/products')
        stats.value.sellers = allSellers.data.length
        stats.value.products = allProds.data.length
        stats.value.revenue = 1250000 
    } catch (err) {
        console.error('Admin fetch error:', err)
    }
}

onMounted(fetchData)

const verifySeller = async (id, status) => {
    try {
        await axios.put(`http://localhost:5005/api/admin/sellers/${id}/verify`, { status })
        await fetchData()
    } catch (err) {
        alert('Verification failed')
    }
}

const verifyProduct = async (id, status) => {
    try {
        await axios.put(`http://localhost:5005/api/admin/products/${id}/verify`, { status })
        await fetchData()
    } catch (err) {
        alert('Product moderation failed')
    }
}
</script>

<template>
  <div class="admin-page">
    <div class="container admin-layout">
      <header class="admin-header">
        <h1><Shield class="gradient-text" /> Dashboard</h1>
        <div class="admin-stats">
          <div class="stat glass"><span>Sellers</span> {{ stats.sellers }}</div>
          <div class="stat glass"><span>Products</span> {{ stats.products }}</div>
          <div class="stat glass"><span>Revenue</span> ${{ (stats.revenue / 1000000).toFixed(1) }}M</div>
        </div>
      </header>

      <div class="admin-grid">
        <!-- Seller Verification -->
        <section class="admin-card glass">
          <div class="card-header">
            <h3><Users :size="20" /> Seller Verifications</h3>
            <span class="badge">{{ pendingSellers.length }} Pending</span>
          </div>
          <div class="list-container">
            <div v-for="seller in pendingSellers" :key="seller.id" class="list-item">
              <div class="item-info">
                <h4>{{ seller.name }}</h4>
                <p>{{ seller.email }} • Applied for verification</p>
              </div>
              <div class="actions">
                <button @click="verifySeller(seller.id, 'verified')" class="btn-icon approve"><CheckCircle :size="20" /></button>
                <button @click="verifySeller(seller.id, 'rejected')" class="btn-icon reject"><XCircle :size="20" /></button>
              </div>
            </div>
            <div v-if="pendingSellers.length === 0" class="empty-state">No pending verifications.</div>
          </div>
        </section>

        <!-- Product Approval -->
        <section class="admin-card glass">
          <div class="card-header">
            <h3><Package :size="20" /> Product Moderation</h3>
            <span class="badge">{{ pendingProducts.length }} New</span>
          </div>
          <div class="list-container">
            <div v-for="prod in pendingProducts" :key="prod.id" class="list-item">
              <div class="item-info">
                <h4>{{ prod.name }}</h4>
                <p>{{ prod.seller }} • ${{ prod.price }} • Approval Requested</p>
              </div>
              <div class="actions">
                <button @click="verifyProduct(prod.id, 'approved')" class="btn-icon approve"><CheckCircle :size="20" /></button>
                <button @click="verifyProduct(prod.id, 'rejected')" class="btn-icon reject"><XCircle :size="20" /></button>
              </div>
            </div>
            <div v-if="pendingProducts.length === 0" class="empty-state">No products awaiting approval.</div>
          </div>
        </section>

        <!-- System Alerts -->
        <section class="admin-card glass full-width">
          <div class="card-header">
            <h3><AlertTriangle :size="20" /> System Alerts</h3>
          </div>
          <div class="alert-info">
            <p>Database backup completed successfully 2 hours ago.</p>
            <p class="warning">3 failed login attempts detected from IP 192.168.1.45</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-page { padding-top: 120px; }

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4rem;
}

.admin-header h1 { display: flex; align-items: center; gap: 1rem; font-size: 2.5rem; }

.admin-stats { display: flex; gap: 1.5rem; }
.stat { padding: 0.75rem 1.5rem; border-radius: 12px; display: flex; flex-direction: column; }
.stat span { font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; }

.admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
}

.full-width { grid-column: span 2; }

.admin-card { padding: 2rem; border-radius: var(--radius-md); }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.card-header h3 { display: flex; align-items: center; gap: 10px; }

.badge {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-primary);
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 0;
  border-bottom: 1px solid var(--border-glass);
}

.item-info h4 { margin-bottom: 0.25rem; }
.item-info p { color: var(--text-secondary); font-size: 0.9rem; }

.actions { display: flex; gap: 1rem; }
.btn-icon { background: none; border: none; cursor: pointer; transition: var(--transition-smooth); }
.btn-icon:hover { transform: scale(1.2); }
.approve { color: var(--accent-secondary); }
.reject { color: #ef4444; }

.alert-info p { margin-bottom: 1rem; color: var(--text-secondary); }
.warning { color: #f97316 !important; }

@media (max-width: 1024px) {
  .admin-grid { grid-template-columns: 1fr; }
  .full-width { grid-column: span 1; }
}
</style>
