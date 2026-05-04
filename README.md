# B2B Nexus | Premium Industrial Marketplace (Pinia Edition)

A full-stack B2B e-commerce platform built with Vue 3, Pinia, and Node.js (SQLite) — featuring dual payment integration (Paystack + Stripe), role-based access control, seller storefronts, and a full order management system.

---

## Project Overview

B2B Nexus (Pinia Edition) is a production-grade marketplace application for industrial and wholesale commerce. It implements a three-tier role system — Customer, Seller, and Admin — each with dedicated views and access scopes. This variant upgrades from Vuex to Pinia for leaner, more modular state management, and adds dual payment support — customers can pay via either Paystack or Stripe at checkout.

Compared to the Vuex edition, this project also expands the seller flow with a dedicated Storefront view and an enriched order detail experience.

---

## Setup

1. **Server**: `cd server && npm install && node index.js`
2. **Client**: `cd client && npm install && npm run dev`

> Create a `.env` file in both `client/` and `server/` directories. See Environment Variables below.

---

## Default Credentials

All accounts use the password: `password123`

| Role | Email |
| :--- | :--- |
| Admin | `user1@example.com`, `user2@example.com`, `user3@example.com` |
| Seller | `user6@example.com`, `user7@example.com`, `user8@example.com` |
| Customer | `user16@example.com`, `user17@example.com`, `user18@example.com` |

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Vue 3, Vite, Pinia |
| Styling | Custom CSS |
| Backend | Node.js, Express |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT + BcryptJS |
| Payments | Paystack + Stripe |

---

## Architecture

```
vue-app-market-place/
├── client/                  # Vue 3 SPA (Vite + Pinia)
│   └── src/
│       ├── pages/           # Home, Products, Cart, Checkout, Dashboard,
│       │                    # Storefront, OrderDetail, Admin, AddProduct,
│       │                    # Login, Signup, SellerSignup, AdminLogin
│       ├── components/      # Shared UI components
│       └── stores/          # Pinia stores (auth, cart, products, orders)
└── server/                  # Express REST API
    ├── index.js             # Entry point and route registration
    ├── db.js                # SQLite schema, seed, and query helpers
    └── seed.js              # Database seeding script
```

---

## Key Features

### 1. Dual Payment Integration
- Paystack and Stripe are both available at checkout — the customer selects their preferred provider.
- Server-side verification endpoints confirm payment authenticity for both providers before order fulfilment.
- Stripe uses Payment Intents; Paystack uses the inline popup with reference-based callback verification.
- Graceful handling of cancelled or failed payments with user-facing feedback and cart preservation.

### 2. Role-Based Access Control
- Customers, Sellers, and Admins each have fully scoped dashboards with role-gated navigation.
- Vue Router guards enforce frontend access control based on Pinia auth store state.
- Backend Express middleware validates JWT claims and role on every protected route independently.
- Dedicated seller signup flow: new sellers enter a pending state until an admin explicitly approves them.

### 3. Seller Storefronts
- Each seller has a public-facing storefront page aggregating all their active listings with contact details.
- Sellers manage their product inventory (add, edit, delist) through a private dashboard view.
- Storefront pages are dynamically routed by seller ID and cached for fast public browsing.

### 4. Admin Control Center
- Pending seller approval queue with one-click approve/reject actions and status feedback.
- Product moderation tools for reviewing and removing non-compliant or flagged listings.
- Platform-wide user management: view all accounts, roles, registration dates, and account statuses.

### 5. Full Order Lifecycle
- Seamless flow: cart assembly → payment provider selection → checkout → confirmation → order detail view.
- Order status updates (Pending, Processing, Shipped, Delivered) visible in real time for customers.
- Sellers receive a live order feed with per-item fulfilment controls and order history.

---

## Environment Variables

**Server** (`server/.env`):
```env
PORT=5000
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=sk_test_...
PAYSTACK_SECRET_KEY=sk_test_...
```

**Client** (`client/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_PAYSTACK_PUBLIC_KEY=pk_test_...
```

---

Developed as part of the FixNuewYearBug project portfolio. Last updated May 2026.

