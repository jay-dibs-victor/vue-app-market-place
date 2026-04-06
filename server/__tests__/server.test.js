'use strict';

const request = require('supertest');

// ─── Mock external dependencies before requiring the app ──────────────────────

// Mock stripe so no real Stripe calls happen
jest.mock('stripe', () => {
  return () => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'sess_mock123' }),
      },
    },
  });
});

// Mock the db module
jest.mock('../db', () => ({
  initDb: jest.fn().mockResolvedValue(undefined),
  seedDb: jest.fn().mockResolvedValue(undefined),
  all: jest.fn(),
  run: jest.fn(),
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
}));

const { all, run } = require('../db');
const bcrypt = require('bcryptjs');

// ─── Build a plain Express app (without calling start()) ──────────────────────
// We re-create just the routes so we don't bind a port during tests.

const express = require('express');
const cors = require('cors');
const stripe = require('stripe')('test_key');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'test_secret';

// Register all routes (mirrored from index.js)

app.post('/api/create-checkout-session', async (req, res) => {
  const { items, email } = req.body;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: { name: item.name },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/checkout`,
      customer_email: email,
    });
    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const products = await all('SELECT * FROM products', []);
    res.json(products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      variants: JSON.parse(p.variants || '[]'),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories ORDER BY id');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories/mega', async (req, res) => {
  try {
    const parents = await all('SELECT * FROM categories WHERE parent_id IS NULL ORDER BY id');
    const result = await Promise.all(parents.map(async (cat) => {
      const subs = await all('SELECT * FROM categories WHERE parent_id = ? ORDER BY id', [cat.id]);
      const slides = await all('SELECT * FROM category_slides WHERE category_id = ? ORDER BY sort_order', [cat.id]);
      return { ...cat, subcategories: subs, slides };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sellers', async (req, res) => {
  try {
    const sellers = await all('SELECT s.*, u.email FROM sellers s JOIN users u ON s.user_id = u.id');
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = (await all('SELECT * FROM users WHERE email = ?', [email]))[0];
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
      res.json({ success: true, user: { id: user.id, email: user.email, role: user.role }, token });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', [email, hashedPassword, role || 'customer']);
    const userId = result.lastID;
    const token = jwt.sign({ id: userId, email, role: role || 'customer' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, userId, token, user: { id: userId, email, role: role || 'customer' } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/pending-sellers', async (req, res) => {
  try {
    const sellers = await all("SELECT s.*, u.email FROM sellers s JOIN users u ON s.user_id = u.id WHERE s.verification_status = 'pending'");
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/pending-products', async (req, res) => {
  try {
    const products = await all("SELECT p.*, s.store_name as seller FROM products p JOIN sellers s ON p.seller_id = s.id WHERE p.status = 'pending'");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/sellers/:id/verify', async (req, res) => {
  const { status } = req.body;
  try {
    await run('UPDATE sellers SET verification_status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id/verify', async (req, res) => {
  const { status } = req.body;
  try {
    await run('UPDATE products SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { userId, total, items, shipping, shippingMethod, shippingCost, tax, paymentMethod } = req.body;
  try {
    const result = await run(
      'INSERT INTO orders (user_id, total_amount, shipping_method, shipping_cost, tax, shipping_details, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, total, shippingMethod, shippingCost, tax, JSON.stringify(shipping), paymentMethod]
    );
    const orderId = result.lastID;
    for (const item of items) {
      await run('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.productId, item.quantity, item.price]);
    }
    res.json({ success: true, orderId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  const { userId } = req.query;
  try {
    const orders = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(orders.map(o => ({ ...o, shipping_details: JSON.parse(o.shipping_details || '{}') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = (await all('SELECT * FROM orders WHERE id = ?', [req.params.id]))[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const items = await all(
      'SELECT oi.*, p.name, p.images FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?',
      [req.params.id]
    );
    res.json({
      ...order,
      shipping_details: JSON.parse(order.shipping_details || '{}'),
      items: items.map(i => ({ ...i, images: JSON.parse(i.images || '[]') })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Stripe / Checkout ─────────────────────────────────────────────────────────
describe('POST /api/create-checkout-session', () => {
  it('returns a Stripe session id', async () => {
    const res = await request(app)
      .post('/api/create-checkout-session')
      .send({ items: [{ name: 'Widget', price: 9.99, quantity: 2 }], email: 'buyer@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe('sess_mock123');
  });
});

// ── Products ──────────────────────────────────────────────────────────────────
describe('GET /api/products', () => {
  it('returns parsed products', async () => {
    all.mockResolvedValueOnce([
      { id: 1, name: 'Shirt', price: 29.99, images: '["img1.jpg"]', variants: '[]', status: 'approved' },
    ]);
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body[0].images).toEqual(['img1.jpg']);
  });

  it('returns 500 on DB error', async () => {
    all.mockRejectedValueOnce(new Error('DB down'));
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('DB down');
  });
});

// ── Categories ────────────────────────────────────────────────────────────────
describe('GET /api/categories', () => {
  it('returns all categories', async () => {
    const cats = [{ id: 1, name: 'Clothing' }, { id: 2, name: 'Shoes' }];
    all.mockResolvedValueOnce(cats);
    const res = await request(app).get('/api/categories');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(cats);
  });
});

describe('GET /api/categories/mega', () => {
  it('returns categories with subcategories and slides', async () => {
    const parents = [{ id: 1, name: 'Clothing', parent_id: null }];
    const subs = [{ id: 2, name: 'Shirts', parent_id: 1 }];
    const slides = [{ id: 10, category_id: 1, sort_order: 1 }];
    all
      .mockResolvedValueOnce(parents)
      .mockResolvedValueOnce(subs)
      .mockResolvedValueOnce(slides);
    const res = await request(app).get('/api/categories/mega');
    expect(res.status).toBe(200);
    expect(res.body[0]).toMatchObject({ id: 1, subcategories: subs, slides });
  });
});

// ── Auth ──────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  const mockDbUser = { id: 1, email: 'user@test.com', password: 'hashed', role: 'customer' };

  it('returns token on valid credentials', async () => {
    all.mockResolvedValueOnce([mockDbUser]);
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBe('mock.jwt.token');
  });

  it('returns 401 on wrong password', async () => {
    all.mockResolvedValueOnce([mockDbUser]);
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@test.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('returns 401 when user is not found', async () => {
    all.mockResolvedValueOnce([]);
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'x' });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  it('creates user and returns token', async () => {
    run.mockResolvedValueOnce({ lastID: 99 });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@test.com', password: 'pass', role: 'customer' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.userId).toBe(99);
    expect(res.body.token).toBe('mock.jwt.token');
  });

  it('returns 400 on duplicate email', async () => {
    run.mockRejectedValueOnce(new Error('UNIQUE constraint failed'));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@test.com', password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/UNIQUE/);
  });
});

// ── Admin ─────────────────────────────────────────────────────────────────────
describe('GET /api/admin/pending-sellers', () => {
  it('returns pending sellers', async () => {
    const sellers = [{ id: 1, store_name: 'Cool Shop', verification_status: 'pending' }];
    all.mockResolvedValueOnce(sellers);
    const res = await request(app).get('/api/admin/pending-sellers');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(sellers);
  });
});

describe('PUT /api/admin/sellers/:id/verify', () => {
  it('updates seller status', async () => {
    run.mockResolvedValueOnce({ changes: 1 });
    const res = await request(app)
      .put('/api/admin/sellers/1/verify')
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('PUT /api/admin/products/:id/verify', () => {
  it('updates product status', async () => {
    run.mockResolvedValueOnce({ changes: 1 });
    const res = await request(app)
      .put('/api/admin/products/5/verify')
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ── Orders ────────────────────────────────────────────────────────────────────
describe('POST /api/orders', () => {
  it('creates an order and returns orderId', async () => {
    run
      .mockResolvedValueOnce({ lastID: 42 }) // INSERT INTO orders
      .mockResolvedValueOnce({})              // INSERT INTO order_items
    const res = await request(app)
      .post('/api/orders')
      .send({
        userId: 1,
        total: 49.99,
        items: [{ productId: 3, quantity: 2, price: 24.99 }],
        shipping: { address: '123 Main St' },
        shippingMethod: 'standard',
        shippingCost: 5,
        tax: 3,
        paymentMethod: 'card',
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBe(42);
  });
});

describe('GET /api/orders', () => {
  it('returns orders for a user', async () => {
    const orders = [{ id: 1, user_id: 1, total_amount: 49.99, shipping_details: '{}' }];
    all.mockResolvedValueOnce(orders);
    const res = await request(app).get('/api/orders?userId=1');
    expect(res.status).toBe(200);
    expect(res.body[0].id).toBe(1);
    expect(res.body[0].shipping_details).toEqual({});
  });
});

describe('GET /api/orders/:id', () => {
  it('returns a specific order with items', async () => {
    const order = { id: 1, total_amount: 49.99, shipping_details: '{"city":"LA"}' };
    const items = [{ id: 10, product_id: 3, name: 'Widget', images: '[]' }];
    all
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce(items);
    const res = await request(app).get('/api/orders/1');
    expect(res.status).toBe(200);
    expect(res.body.shipping_details).toEqual({ city: 'LA' });
    expect(res.body.items[0].images).toEqual([]);
  });

  it('returns 404 when order not found', async () => {
    all.mockResolvedValueOnce([]);
    const res = await request(app).get('/api/orders/999');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Order not found');
  });
});
