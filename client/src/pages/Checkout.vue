<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'
import { useCartStore } from '../stores/cart'
import { useOrderStore } from '../stores/orders'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'
import { CreditCard, Truck, Shield, ChevronRight, Check, Lock, Globe } from 'lucide-vue-next'

const cartStore = useCartStore()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const router = useRouter()

const step = ref(1) // 1=Shipping, 2=Payment, 3=Review
const paymentGateway = ref('paystack')

const shipping = ref({
  firstName: authStore.user?.name?.split(' ')[0] || '', 
  lastName: authStore.user?.name?.split(' ')[1] || '',
  company: '', email: authStore.user?.email || '',
  phone: '', address: '',
  city: '', state: '',
  zip: '', country: 'US'
})

const payment = ref({
  method: 'card',
  cardNumber: '', cardName: '',
  expiry: '', cvv: ''
})

const shippingMethod = ref('standard')
const placing = ref(false)
const errors = ref({})

const shippingRates = {
  standard: { label: 'Standard B2B Freight', time: '7–14 business days', price: 45 },
  express:  { label: 'Express Freight',       time: '3–5 business days',  price: 120 },
  overnight:{ label: 'Overnight Courier',     time: '1–2 business days',  price: 260 }
}

const selectedRate = computed(() => shippingRates[shippingMethod.value])
const subtotal = computed(() => parseFloat(cartStore.totalPrice))
const tax      = computed(() => +(subtotal.value * 0.08).toFixed(2))
const total    = computed(() => +(subtotal.value + selectedRate.value.price + tax.value).toFixed(2))

const formatCard = (v) => {
  payment.value.cardNumber = v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim()
}
const formatExpiry = (v) => {
  payment.value.expiry = v.replace(/\D/g,'').slice(0,4).replace(/(\d{2})(\d)/, '$1/$2')
}

const validateShipping = () => {
  errors.value = {}
  const r = shipping.value
  if (!r.firstName)  errors.value.firstName = 'Required'
  if (!r.lastName)   errors.value.lastName  = 'Required'
  if (!r.email)      errors.value.email     = 'Required'
  if (!r.address)    errors.value.address   = 'Required'
  if (!r.city)       errors.value.city      = 'Required'
  if (!r.zip)        errors.value.zip       = 'Required'
  return Object.keys(errors.value).length === 0
}

const nextStep = () => {
  if (step.value === 1 && !validateShipping()) return
  step.value++
}

const payWithStripe = async () => {
  placing.value = true
  try {
    if (!window.Stripe) {
      alert('Stripe.js failed to load. Please check your internet connection and refresh.')
      placing.value = false
      return
    }
    const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY
    if (!stripeKey || stripeKey.includes('your_')) {
      alert('Stripe public key is not configured. Please set VITE_STRIPE_PUBLIC_KEY in client/.env')
      placing.value = false
      return
    }
    const stripe = window.Stripe(stripeKey)
    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/create-checkout-session`, {
      items: cartStore.items,
      email: shipping.value.email
    })
    if (res.data.error) throw new Error(res.data.error)

    // Create pre-payment order record
    await orderStore.placeOrder({
      userId: authStore.user?.id || 1,
      items: cartStore.items.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price, name: i.name })),
      shipping: shipping.value,
      shippingMethod: shippingMethod.value,
      shippingCost: selectedRate.value.price,
      tax: tax.value,
      total: total.value,
      paymentMethod: 'STRIPE',
      paymentReference: res.data.id
    })
    cartStore.clearCart()

    const result = await stripe.redirectToCheckout({ sessionId: res.data.id })
    if (result.error) alert(result.error.message)
  } catch (err) {
    console.error('Stripe error:', err)
    const msg = err?.response?.data?.error || err?.message || 'Unknown error'
    alert(`Stripe payment failed: ${msg}`)
  } finally {
    placing.value = false
  }
}

const payWithPaystack = async () => {
  placing.value = true

  if (payment.value.method !== 'card') {
    await placeOrder()
    return
  }

  if (!window.PaystackPop) {
    alert('Paystack failed to load. Please check your internet connection and refresh.')
    placing.value = false
    return
  }

  const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
  if (!paystackKey || paystackKey.includes('your_')) {
    alert('Paystack public key is not configured. Please set VITE_PAYSTACK_PUBLIC_KEY in client/.env')
    placing.value = false
    return
  }

  const handler = window.PaystackPop.setup({
    key: paystackKey,
    email: shipping.value.email,
    // Paystack amounts are in the smallest currency unit (kobo for NGN)
    // Test mode only supports NGN, GHS, ZAR, KES — not USD
    amount: Math.round(total.value * 100),
    currency: 'NGN',
    ref: 'PAY_' + Date.now() + '_' + Math.floor(Math.random() * 1e6),
    callback: (response) => {
      placeOrder(response.reference)
    },
    onClose: () => {
      placing.value = false
      alert('Payment window closed. Please try again to complete your order.')
    }
  })

  handler.openIframe()
}

const placeOrder = async (paymentRef = null) => {
  placing.value = true
  try {
    const order = await orderStore.placeOrder({
      userId: authStore.user?.id || 1,
      items: cartStore.items.map(i => ({ productId: i.id, quantity: i.quantity, price: i.price, name: i.name })),
      shipping: shipping.value,
      shippingMethod: shippingMethod.value,
      shippingCost: selectedRate.value.price,
      tax: tax.value,
      total: total.value,
      paymentMethod: paymentGateway.value.toUpperCase(),
      paymentReference: paymentRef
    })
    cartStore.clearCart()
    router.push(`/orders/${order.orderId}?new=1`)
  } catch(e) {
    placing.value = false
    alert('Failed to place order. Please try again.')
  }
}
</script>

<template>
  <div class="checkout-page">
    <div class="container checkout-layout">

    
      <div class="checkout-main">
        <!-- Progress -->
        <div class="progress-steps">
          <div v-for="(label, i) in ['Shipping', 'Payment', 'Review']" :key="i"
               class="step-item" :class="{ done: step > i+1, active: step === i+1 }">
            <div class="step-circle">
              <Check v-if="step > i+1" :size="14" />
              <span v-else>{{ i+1 }}</span>
            </div>
            <span class="step-label">{{ label }}</span>
            <ChevronRight v-if="i < 2" :size="14" class="step-arrow" />
          </div>
        </div>

       
        <section v-if="step === 1" class="form-section animate-fade-in-up">
          <div class="section-title-row">
            <Truck :size="20" />
            <h2>Shipping Information</h2>
          </div>

          <div class="form-grid">
            <div class="field" :class="{ error: errors.firstName }">
              <label>First Name *</label>
              <input v-model="shipping.firstName" class="input-field" placeholder="John" />
              <span v-if="errors.firstName" class="err-msg">{{ errors.firstName }}</span>
            </div>
            <div class="field" :class="{ error: errors.lastName }">
              <label>Last Name *</label>
              <input v-model="shipping.lastName" class="input-field" placeholder="Doe" />
            </div>
            <div class="field full">
              <label>Company Name</label>
              <input v-model="shipping.company" class="input-field" placeholder="Apex Industrial Ltd." />
            </div>
            <div class="field" :class="{ error: errors.email }">
              <label>Business Email *</label>
              <input v-model="shipping.email" type="email" class="input-field" placeholder="name@company.com" />
            </div>
            <div class="field">
              <label>Phone</label>
              <input v-model="shipping.phone" class="input-field" placeholder="+1 (555) 000-0000" />
            </div>
            <div class="field full" :class="{ error: errors.address }">
              <label>Street Address *</label>
              <input v-model="shipping.address" class="input-field" placeholder="123 Industrial Park Ave" />
            </div>
            <div class="field" :class="{ error: errors.city }">
              <label>City *</label>
              <input v-model="shipping.city" class="input-field" placeholder="Chicago" />
            </div>
            <div class="field">
              <label>State / Province</label>
              <input v-model="shipping.state" class="input-field" placeholder="IL" />
            </div>
            <div class="field" :class="{ error: errors.zip }">
              <label>ZIP / Postal *</label>
              <input v-model="shipping.zip" class="input-field" placeholder="60601" />
            </div>
            <div class="field">
              <label>Country</label>
              <select v-model="shipping.country" class="input-field">
                <option value="US">United States</option>
                <option value="DE">Germany</option>
                <option value="CN">China</option>
                <option value="IN">India</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
              </select>
            </div>
          </div>

          <!-- Shipping method -->
          <div class="shipping-methods">
            <h3>Shipping Method</h3>
            <div
              v-for="(rate, key) in shippingRates" :key="key"
              class="rate-card" :class="{ selected: shippingMethod === key }"
              @click="shippingMethod = key"
            >
              <div class="rate-radio">
                <div class="radio-inner" v-if="shippingMethod === key"></div>
              </div>
              <div class="rate-info">
                <span class="rate-name">{{ rate.label }}</span>
                <span class="rate-time">{{ rate.time }}</span>
              </div>
              <span class="rate-price">${{ rate.price }}</span>
            </div>
          </div>

          <button class="btn-primary next-btn" @click="nextStep">
            Continue to Payment <ChevronRight :size="18" />
          </button>
        </section>

        
        <section v-if="step === 2" class="form-section animate-fade-in-up">
          <div class="section-title-row">
            <CreditCard :size="20" />
            <h2>Payment Details</h2>
          </div>

          <div class="pay-methods">
            <label v-for="m in [{id:'card',label:'Credit / Debit Card'},{id:'wire',label:'Bank Wire Transfer'},{id:'po',label:'Purchase Order'}]"
                   :key="m.id" class="pay-method" :class="{ selected: payment.method === m.id }">
              <input type="radio" :value="m.id" v-model="payment.method" />
              {{ m.label }}
            </label>
          </div>

          <!-- Payment Gateway Selection -->
          <div v-if="payment.method === 'card'" class="gateway-selection">
            <h3>Select Payment Gateway</h3>
            <div class="gateway-grid">
              <div class="gateway-card" :class="{ active: paymentGateway === 'paystack' }" @click="paymentGateway = 'paystack'">
                <CreditCard :size="24" />
                <span>Paystack</span>
              </div>
              <div class="gateway-card" :class="{ active: paymentGateway === 'stripe' }" @click="paymentGateway = 'stripe'">
                <Globe :size="24" />
                <span>Stripe</span>
              </div>
            </div>
          </div>

          <div v-if="payment.method === 'card'" class="form-grid">
            <div class="field full">
              <label>Card Number</label>
              <input :value="payment.cardNumber" @input="e => formatCard(e.target.value)"
                     class="input-field" placeholder="0000 0000 0000 0000" maxlength="19" />
            </div>
            <div class="field full">
              <label>Cardholder Name</label>
              <input v-model="payment.cardName" class="input-field" placeholder="JOHN DOE" />
            </div>
            <div class="field">
              <label>Expiry (MM/YY)</label>
              <input :value="payment.expiry" @input="e => formatExpiry(e.target.value)"
                     class="input-field" placeholder="12/28" maxlength="5" />
            </div>
            <div class="field">
              <label>CVV</label>
              <input v-model="payment.cvv" class="input-field" placeholder="•••" maxlength="4" />
            </div>
          </div>

          <div v-if="payment.method === 'wire'" class="info-box">
            <p>Bank details will be emailed after order confirmation.</p>
            <p>Reference your <strong>Order ID</strong> in the wire transfer description.</p>
          </div>

          <div v-if="payment.method === 'po'" class="info-box">
            <p>Upload your Purchase Order document after checkout.</p>
            <p>Net 30 terms available for verified business accounts.</p>
          </div>

          <div class="btn-row">
            <button class="btn-ghost" @click="step = 1">← Back</button>
            <button class="btn-primary next-btn" @click="nextStep">
              Review Order <ChevronRight :size="18" />
            </button>
          </div>
        </section>

       
        <section v-if="step === 3" class="form-section animate-fade-in-up">
          <div class="section-title-row">
            <Shield :size="20" />
            <h2>Review & Confirm</h2>
          </div>

          <div class="review-block">
            <h4>Shipping To</h4>
            <p>{{ shipping.firstName }} {{ shipping.lastName }} — {{ shipping.company }}</p>
            <p>{{ shipping.address }}, {{ shipping.city }}, {{ shipping.state }} {{ shipping.zip }}</p>
            <p>{{ shipping.email }}</p>
          </div>

          <div class="review-block">
            <h4>Shipping Method</h4>
            <p>{{ selectedRate.label }} — {{ selectedRate.time }}</p>
          </div>

          <div class="review-block">
            <h4>Payment</h4>
            <p>{{ payment.method === 'card' ? 'Card ending ' + (payment.cardNumber.slice(-4) || '****') : payment.method === 'wire' ? 'Bank Wire Transfer' : 'Purchase Order' }}</p>
          </div>

          <div class="review-items">
            <h4>Items ({{ cartStore.totalItems }})</h4>
            <div v-for="item in cartStore.items" :key="item.id" class="review-item">
              <img :src="item.images[0]" :alt="item.name" />
              <div>
                <p class="ri-name">{{ item.name }}</p>
                <p class="ri-qty">Qty: {{ item.quantity }}</p>
              </div>
              <span class="ri-price">${{ (item.price * item.quantity).toFixed(2) }}</span>
            </div>
          </div>

          <div class="btn-row">
            <button class="btn-ghost" @click="step = 2">← Back</button>
            <button class="btn-primary place-btn" @click="paymentGateway === 'stripe' ? payWithStripe() : payWithPaystack()" :disabled="placing">
              <Lock :size="16" v-if="!placing" />
              <span v-if="!placing">Pay with {{ paymentGateway === 'stripe' ? 'Stripe' : 'Paystack' }} · ${{ total }}</span>
              <span v-else class="loader-sm">Processing...</span>
            </button>
          </div>
        </section>
      </div>

   
      <aside class="order-summary">
        <h3>Order Summary</h3>

        <div class="summary-items">
          <div v-for="item in cartStore.items" :key="item.id" class="sum-item">
            <div class="sum-img-wrap">
              <img :src="item.images[0]" :alt="item.name" />
              <span class="sum-qty">{{ item.quantity }}</span>
            </div>
            <span class="sum-name">{{ item.name }}</span>
            <span class="sum-price">${{ (item.price * item.quantity).toFixed(2) }}</span>
          </div>
        </div>

        <div class="summary-divider"></div>

        <div class="summary-lines">
          <div class="sum-line"><span>Subtotal</span><span>${{ subtotal.toFixed(2) }}</span></div>
          <div class="sum-line"><span>Shipping</span><span>${{ selectedRate.price }}</span></div>
          <div class="sum-line"><span>Tax (8%)</span><span>${{ tax }}</span></div>
        </div>

        <div class="summary-divider"></div>

        <div class="sum-line total-line">
          <span>Total</span>
          <span>${{ total }}</span>
        </div>

        <div class="trust-badges">
          <div class="trust-item"><Shield :size="15" /> Secure Checkout</div>
          <div class="trust-item"><Truck :size="15" /> Tracked Shipping</div>
          <div class="trust-item"><Check :size="15" /> B2B Verified</div>
        </div>
      </aside>

    </div>
  </div>
</template>

<style scoped>
.checkout-page { 
    padding: 3rem 0 6rem; 
    min-height: 100vh; 
    background: var(--bg-main); 
}

.checkout-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 3rem;
  align-items: start;
}


.progress-steps {
  display: flex; 
  align-items: center; 
  gap: 0.25rem;
  margin-bottom: 2.5rem; 
  flex-wrap: wrap;
}
.step-item { 
    display: flex; 
    align-items: center; 
    gap: 0.5rem; 
}
.step-circle {
  width: 28px; height: 28px; 
  border-radius: 50%;
  background: var(--bg-surface); 
  border: 2px solid var(--border-strong);
  display: flex; 
  align-items: center; justify-content: center;
  font-size: 0.75rem; 
  font-weight: 700; 
  color: var(--text-muted);
  transition: all 0.3s;
}
.step-item.active .step-circle { 
    background: var(--accent-primary); 
    border-color: var(--accent-primary); 
    color: white; 
}
.step-item.done   .step-circle { 
    background: var(--accent-secondary); 
    border-color: var(--accent-secondary);
    color: white; 
}
.step-label { 
    font-size: 0.82rem; 
    font-weight: 600; 
    color: var(--text-muted); 
}
.step-item.active .step-label { color: var(--accent-primary); }
.step-item.done   .step-label { color: var(--accent-secondary); }
.step-arrow { color: var(--border-strong); margin: 0 0.5rem; }

.form-section { 
    background: #fff; 
    border: 1px solid var(--border); 
    border-radius: 14px; padding: 2rem; 
}
.section-title-row { 
    display: flex; 
    align-items: center; 
    gap: 0.75rem; margin-bottom: 1.75rem; 
    color: var(--accent-primary); 
}
.section-title-row h2 { font-size: 1.25rem; font-weight: 700; color: var(--text-primary); }

.gateway-selection { margin-bottom: 2.5rem; }
.gateway-selection h3 { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
.gateway-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.gateway-card { 
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;
  padding: 1.25rem; border: 2px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.2s ease;
  background: var(--bg-surface);
}
.gateway-card:hover { border-color: var(--accent-primary); background: rgba(59, 130, 246, 0.02); }
.gateway-card.active { border-color: var(--accent-primary); background: rgba(59, 130, 246, 0.05); color: var(--accent-primary); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1); }
.gateway-card span { font-weight: 700; font-size: 0.85rem; }

.form-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 1.25rem; margin-bottom: 1.75rem; 
}
.field.full { grid-column: span 2; }
.field label { 
    display: block; 
    font-size: 0.8rem; 
    font-weight: 600; 
    color: var(--text-secondary); margin-bottom: 0.4rem;
 }
.field.error .input-field { border-color: var(--accent-danger); }
.err-msg { font-size: 0.72rem; 
    color: var(--accent-danger); 
    margin-top: 0.2rem; 
    display: block; 
}

.shipping-methods h3 { 
    font-size: 0.95rem; 
    font-weight: 700; 
    margin-bottom: 1rem; 
    color: var(--text-primary); 
}
.rate-card {
  display: flex; 
  align-items: center; gap: 1rem;
  padding: 1rem 1.25rem; 
  border: 1.5px solid var(--border);
  border-radius: 10px; 
  cursor: pointer; 
  margin-bottom: 0.75rem;
  transition: all 0.2s;
}
.rate-card:hover { 
    border-color: var(--accent-primary); 
    background: var(--accent-primary-light); 
}
.rate-card.selected { 
    border-color: var(--accent-primary); 
    background: var(--accent-primary-light); 
}
.rate-radio {
  width: 18px; 
  height: 18px; border-radius: 50%;
  border: 2px solid var(--accent-primary);
  display: flex; 
  align-items: center; 
  justify-content: center; flex-shrink: 0;
}
.radio-inner { 
    width: 9px; height: 9px; 
    border-radius: 50%; 
    background: var(--accent-primary); 
}
.rate-info { flex: 1; }
.rate-name { 
    display: block; 
    font-weight: 600; 
    font-size: 0.9rem; 
}
.rate-time { 
    font-size: 0.78rem; 
    color: var(--text-muted); 
}
.rate-price { 
    font-weight: 800; 
    color: var(--accent-primary); 
}

.pay-methods { display: flex; gap: 0.75rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
.pay-method {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.65rem 1.1rem; border: 1.5px solid var(--border);
  border-radius: 8px; cursor: pointer; font-size: 0.85rem;
  font-weight: 500; transition: all 0.2s;
}
.pay-method input { 
    accent-color: var(--accent-primary); 
}
.pay-method.selected { 
    border-color: var(--accent-primary); 
    background: var(--accent-primary-light); 
}

.info-box {
  background: var(--bg-surface); 
  border: 1px solid var(--border);
  border-radius: 10px; 
  padding: 1.25rem; 
  margin-bottom: 1.5rem;
  font-size: 0.9rem; 
  color: var(--text-secondary); line-height: 1.7;
}
.review-block {
  padding: 1rem 0; 
  border-bottom: 1px solid var(--border);
  margin-bottom: 0.5rem;
}
.review-block h4 { 
    font-size: 0.78rem; 
    text-transform: uppercase; 
    letter-spacing: 0.07em; 
    color: var(--text-muted); margin-bottom: 0.4rem; 
}
.review-block p { 
    font-size: 0.9rem; color: var(--text-primary); 
}

.review-items { margin: 1.25rem 0; }
.review-items h4 { 
    font-size: 0.78rem; 
    text-transform: uppercase; 
    letter-spacing: 0.07em; 
    color: var(--text-muted); 
    margin-bottom: 0.75rem; 
}
.review-item {
  display: flex; 
  align-items: center;
   gap: 1rem;
  padding: 0.75rem 0; 
  border-bottom: 1px solid var(--border);
}
.review-item img { 
    width: 50px; 
    height: 50px; 
    object-fit: cover; 
    border-radius: 8px; 
}
.ri-name { 
    font-size: 0.88rem; 
    font-weight: 600; 
}
.ri-qty  { 
    font-size: 0.78rem; 
    color: var(--text-muted); 
}
.ri-price { 
    margin-left: auto; 
    font-weight: 700; 
    font-size: 0.9rem; 
    color: var(--accent-primary); 
}

.next-btn, .place-btn { 
    margin-top: 2rem; 
    width: 100%; 
    justify-content: center; 
    height: 50px; font-size: 1rem; 
}
.place-btn { 
    
    background: var(--accent-secondary); 
    box-shadow: 0 4px 12px rgba(16,185,129,0.35); 
}
.place-btn:hover { background: #059669; }

.btn-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-top: 2rem; 
}

.order-summary {
  background: #fff; border: 1px solid var(--border);
  border-radius: 14px; padding: 1.75rem;
  position: sticky; top: 160px;
}
.order-summary h3 { 
    font-size: 1.1rem; 
    font-weight: 700; 
    margin-bottom: 1.25rem; 
}

.summary-items { 
    display: flex; 
    flex-direction: column; 
    gap: 0.75rem; margin-bottom: 1rem; 
}
.sum-item { 
    display: flex; 
    align-items: center; 
    gap: 0.85rem; 
}
.sum-img-wrap { 
    position: relative; flex-shrink: 0; 
}
.sum-img-wrap img { 
    width: 48px; 
    height: 48px; 
    object-fit: cover; 
    border-radius: 8px; 
    border: 1px solid var(--border); 
}
.sum-qty {
  position: absolute; 
  top: -6px; right: -6px;
  background: var(--text-primary); 
  color: white;
  font-size: 0.6rem; 
  font-weight: 700;
  min-width: 16px; 
  height: 16px; 
  border-radius: 100px;
  display: flex; 
  align-items: center; 
  justify-content: center; padding: 0 3px;
}
.sum-name { 
    flex: 1; 
    font-size: 0.82rem; 
    font-weight: 500; 
    color: var(--text-primary); 
    line-height: 1.3; 
}
.sum-price { 
    font-weight: 700; 
    font-size: 0.85rem; 
    color: var(--accent-primary); 
    flex-shrink: 0; 
}

.summary-divider { 
    height: 1px; 
    background: var(--border); 
    margin: 1rem 0; 
}
.summary-lines { 
    display: flex; 
    flex-direction: column; 
    gap: 0.6rem; 
}
.sum-line { 
    display: flex; 
    justify-content: space-between; 
    font-size: 0.88rem; 
    color: var(--text-secondary); 
}
.total-line { 
    font-size: 1.05rem; 
    font-weight: 800; 
    color: var(--text-primary);
     margin-top: 0.25rem; 
}

.trust-badges { 
    margin-top: 1.5rem; 
    display: flex; 
    flex-direction: column; 
    gap: 0.5rem; 
}
.trust-item { 
    display: flex; 
    align-items: center; 
    gap: 0.5rem; font-size: 0.78rem; 
    color: var(--text-muted); 
}

.loader-sm {
  width: 20px; height: 20px; border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white; border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1024px) {
  .checkout-layout { grid-template-columns: 1fr; }
  .order-summary { position: static; }
}
@media (max-width: 600px) {
  .form-grid { grid-template-columns: 1fr; }
  .field.full { grid-column: span 1; }
}
</style>
