const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDb, seedDb, all, run } = require('./db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

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

app.get('/api/categories/mega', async (req, res) => {
  try {
    const parents = await all("SELECT * FROM categories WHERE parent_id IS NULL ORDER BY id");
    const result = await Promise.all(parents.map(async (cat) => {
      const subs = await all("SELECT * FROM categories WHERE parent_id = ? ORDER BY id", [cat.id]);
      const slides = await all("SELECT * FROM category_slides WHERE category_id = ? ORDER BY sort_order", [cat.id]);
      return { ...cat, subcategories: subs, slides };
    }));
    res.json(result);
  } catch (err) {
    console.error('Mega menu error:', err);
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/products', async (req, res) => {
  try {
    const { category, search, layout, featured, new_arrival, top_seller, discount, limit } = req.query;
    let query = "SELECT * FROM products WHERE status = 'approved'";
    const params = [];
    if (category) { query += " AND category_id = ?"; params.push(category); }
    if (search) { query += " AND name LIKE ?"; params.push(`%${search}%`); }
    if (layout) { query += " AND grid_layout = ?"; params.push(layout); }
    if (featured) { query += " AND featured = 1"; }
    if (new_arrival) { query += " AND new_arrival = 1"; }
    if (top_seller) { query += " AND top_seller = 1"; }
    if (discount) { query += " AND discount = 1"; }
    if (limit) { query += ` LIMIT ${parseInt(limit)}`; }

    const products = await all(query, params);
    res.json(products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      variants: JSON.parse(p.variants || '[]')
    })));
  } catch (err) {
    console.error('Products error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const categories = await all("SELECT * FROM categories ORDER BY id");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sellers', async (req, res) => {
  try {
    const sellers = await all("SELECT s.*, u.email FROM sellers s JOIN users u ON s.user_id = u.id");
    res.json(sellers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sellers/:id/products', async (req, res) => {
  try {
    const products = await all("SELECT * FROM products WHERE seller_id = ?", [req.params.id]);
    res.json(products.map(p => ({
      ...p,
      images: JSON.parse(p.images || '[]'),
      variants: JSON.parse(p.variants || '[]')
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = (await all("SELECT * FROM users WHERE email = ?", [email]))[0];
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
    const result = await run("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, hashedPassword, role || 'customer']);
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
    await run("UPDATE sellers SET verification_status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id/verify', async (req, res) => {
  const { status } = req.body;
  try {
    await run("UPDATE products SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { userId, total, items, shipping, shippingMethod, shippingCost, tax, paymentMethod } = req.body;
  try {
    const result = await run(
      `INSERT INTO orders (user_id, total_amount, shipping_method, shipping_cost, tax, shipping_details, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, total, shippingMethod, shippingCost, tax, JSON.stringify(shipping), paymentMethod]
    );
    const orderId = result.lastID;

    for (const item of items) {
      await run(
        "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [orderId, item.productId, item.quantity, item.price]
      );
    }

    res.json({ success: true, orderId });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders', async (req, res) => {
  const { userId } = req.query;
  try {
    const orders = await all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC", [userId]);
    res.json(orders.map(o => ({
      ...o,
      shipping_details: JSON.parse(o.shipping_details || '{}')
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = (await all("SELECT * FROM orders WHERE id = ?", [req.params.id]))[0];
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const items = await all(
      `SELECT oi.*, p.name, p.images 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE oi.order_id = ?`,
      [req.params.id]
    );

    res.json({
      ...order,
      shipping_details: JSON.parse(order.shipping_details || '{}'),
      items: items.map(i => ({
        ...i,
        images: JSON.parse(i.images || '[]')
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const start = async () => {
  try {
    console.log('Initializing database...');
    await initDb();
    console.log('Seeding database...');
    await seedDb();
    console.log('Database ready.');
    const server = app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is occupied. Please kill the process using it or change the port in .env`);
        process.exit(1);
      } else {
        console.error('Server error:', err);
      }
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
};

start();
