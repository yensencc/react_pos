const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

const ORDERS_PATH = path.join(__dirname, '..', 'src', 'data', 'orders.json')
const FEATURES_PATH = path.join(__dirname, '..', 'src', 'data', 'features.json')
const SETTINGS_PATH = path.join(__dirname, '..', 'src', 'data', 'settings.json')
const CUSTOMERS_PATH = path.join(__dirname, '..', 'src', 'data', 'customers.json')
const PRODUCTS_PATH = path.join(__dirname, '..', 'src', 'data', 'products.json')
const ADDONS_PATH = path.join(__dirname, '..', 'src', 'data', 'addons.json')
const CATEGORIES_PATH = path.join(__dirname, '..', 'src', 'data', 'categories.json')

function readOrders() {
  try {
    const raw = fs.readFileSync(ORDERS_PATH, 'utf8')
    return JSON.parse(raw || '[]')
  } catch (err) {
    return []
  }
}

function writeOrders(arr) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(arr, null, 2), 'utf8')
}

function readFeatures() {
  try {
    const raw = fs.readFileSync(FEATURES_PATH, 'utf8')
    return JSON.parse(raw || '{}')
  } catch (err) {
    return {}
  }
}

function writeFeatures(obj) {
  fs.writeFileSync(FEATURES_PATH, JSON.stringify(obj, null, 2), 'utf8')
}

function readSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, 'utf8')
    return JSON.parse(raw || '{}')
  } catch (err) {
    return {}
  }
}

function writeSettings(obj) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(obj, null, 2), 'utf8')
}

function readCustomers() {
  try {
    const raw = fs.readFileSync(CUSTOMERS_PATH, 'utf8')
    return JSON.parse(raw || '[]')
  } catch (err) {
    return []
  }
}

function writeCustomers(arr) {
  fs.writeFileSync(CUSTOMERS_PATH, JSON.stringify(arr, null, 2), 'utf8')
}

function readProducts() {
  try { const raw = fs.readFileSync(PRODUCTS_PATH, 'utf8'); return JSON.parse(raw || '[]') } catch(e){ return [] }
}

function writeProducts(arr) { fs.writeFileSync(PRODUCTS_PATH, JSON.stringify(arr, null, 2), 'utf8') }

function readAddons() { try { const raw = fs.readFileSync(ADDONS_PATH,'utf8'); return JSON.parse(raw||'[]') } catch(e){ return [] } }
function writeAddons(arr) { fs.writeFileSync(ADDONS_PATH, JSON.stringify(arr, null, 2), 'utf8') }

function readCategories() { try { const raw = fs.readFileSync(CATEGORIES_PATH,'utf8'); return JSON.parse(raw||'[]') } catch(e){ return [] } }
function writeCategories(arr) { fs.writeFileSync(CATEGORIES_PATH, JSON.stringify(arr, null, 2), 'utf8') }

app.get('/health', (req, res) => res.json({ ok: true }))

app.get('/orders', (req, res) => {
  try {
    const orders = readOrders()
    return res.json({ ok: true, orders })
  } catch (err) {
    console.error('read orders failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/features', (req, res) => {
  try {
    const features = readFeatures()
    return res.json({ ok: true, features })
  } catch (err) {
    console.error('read features failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/features', (req, res) => {
  try {
    const incoming = req.body || {}
    const allowed = ['ordersView','sendToKitchen','serverSave','clientSearch','importExport','rewards','manageProducts']
    const filtered = {}
    for (const k of allowed) filtered[k] = !!incoming[k]
    writeFeatures(filtered)
    return res.json({ ok: true, features: filtered })
  } catch (err) {
    console.error('write features failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/settings', (req, res) => {
  try {
    const settings = readSettings()
    return res.json({ ok: true, settings })
  } catch (err) {
    console.error('read settings failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/settings', (req, res) => {
  try {
    const incoming = req.body || {}
    // basic validation: ensure object
    if (typeof incoming !== 'object') return res.status(400).json({ ok: false, error: 'invalid payload' })
    writeSettings(incoming)
    return res.json({ ok: true, settings: incoming })
  } catch (err) {
    console.error('write settings failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/orders', (req, res) => {
  try {
    const order = req.body
    if (!order || !order.id) return res.status(400).json({ error: 'invalid order' })
    // ensure cancel-related defaults and timestamps
    order.canceled = !!order.canceled
    order.cancelReason = order.cancelReason || ''
    order.createdAt = order.createdAt || new Date().toISOString()
    const orders = readOrders()
    orders.push(order)
    writeOrders(orders)
    return res.json({ ok: true, id: order.id })
  } catch (err) {
    console.error('write failed', err)
    return res.status(500).json({ error: err.message })
  }
})

app.patch('/orders/:id', (req, res) => {
  try {
    const id = req.params.id
    const incoming = req.body || {}
    const orders = readOrders()
    const idx = orders.findIndex(o => String(o.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'order not found' })
    const order = orders[idx]
    // Only allow safe updates: canceled flag and cancelReason, and allow merging other lightweight fields
    if (typeof incoming.canceled !== 'undefined') order.canceled = !!incoming.canceled
    if (typeof incoming.cancelReason !== 'undefined') order.cancelReason = incoming.cancelReason || ''
    // merge any other provided top-level fields (non-nested) except id
    for (const k of Object.keys(incoming)) {
      if (k === 'id' || k === 'createdAt') continue
      if (k === 'canceled' || k === 'cancelReason') continue
      order[k] = incoming[k]
    }
    order.updatedAt = new Date().toISOString()
    orders[idx] = order
    writeOrders(orders)
    return res.json({ ok: true, order })
  } catch (err) {
    console.error('patch order failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/customers', (req, res) => {
  try {
    const customers = readCustomers()
    return res.json({ ok: true, customers })
  } catch (err) {
    console.error('read customers failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/customers', (req, res) => {
  try {
    const incoming = req.body || {}
    if (!incoming || !incoming.phone) return res.status(400).json({ ok: false, error: 'invalid payload' })
    const customers = readCustomers()
    // normalize phone for comparison (digits only)
    const normalize = (p) => (String(p||'').replace(/\D/g, ''))
    const normIncoming = normalize(incoming.phone)
    const existingIdx = customers.findIndex(c => normalize(c.phone) === normIncoming)
    if (existingIdx !== -1 && !incoming.overwrite) {
      return res.status(409).json({ ok: false, error: 'duplicate', existing: customers[existingIdx] })
    }
    const id = incoming.id || (existingIdx !== -1 ? customers[existingIdx].id : ('c' + Date.now().toString(36)))
    const customer = { id, name: incoming.name || '', phone: incoming.phone, city: incoming.city || '' }
    if (existingIdx !== -1) {
      customers[existingIdx] = customer
    } else {
      customers.push(customer)
    }
    writeCustomers(customers)
    return res.json({ ok: true, customer })
  } catch (err) {
    console.error('write customers failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/products', (req, res) => {
  try {
    const products = readProducts()
    return res.json({ ok: true, products })
  } catch (err) {
    console.error('read products failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/products', (req, res) => {
  try {
    const incoming = req.body || []
    if (!Array.isArray(incoming)) return res.status(400).json({ ok: false, error: 'payload should be array' })
    writeProducts(incoming)
    return res.json({ ok: true, products: incoming })
  } catch (err) {
    console.error('write products failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

// --- Per-item product CRUD ---
app.get('/product/:id', (req, res) => {
  try {
    const id = req.params.id
    const products = readProducts()
    const p = products.find(x => String(x.id) === String(id))
    if (!p) return res.status(404).json({ ok: false, error: 'product not found' })
    return res.json({ ok: true, product: p })
  } catch (err) {
    console.error('get product failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/product', (req, res) => {
  try {
    const incoming = req.body || {}
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ ok: false, error: 'invalid payload' })
    const products = readProducts()
    const id = incoming.id || ('p' + Date.now().toString(36))
    const product = Object.assign({ id }, incoming)
    products.push(product)
    writeProducts(products)
    return res.json({ ok: true, product })
  } catch (err) {
    console.error('create product failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.put('/product/:id', (req, res) => {
  try {
    const id = req.params.id
    const incoming = req.body || {}
    const products = readProducts()
    const idx = products.findIndex(p => String(p.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'product not found' })
    // merge fields (preserve id)
    const updated = Object.assign({}, products[idx], incoming, { id: products[idx].id })
    products[idx] = updated
    writeProducts(products)
    return res.json({ ok: true, product: updated })
  } catch (err) {
    console.error('update product failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.delete('/product/:id', (req, res) => {
  try {
    const id = req.params.id
    const products = readProducts()
    const idx = products.findIndex(p => String(p.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'product not found' })
    const removed = products.splice(idx, 1)[0]
    writeProducts(products)
    return res.json({ ok: true, removed })
  } catch (err) {
    console.error('delete product failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/addons', (req, res) => {
  try {
    const addons = readAddons()
    return res.json({ ok: true, addons })
  } catch (err) {
    console.error('read addons failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/addons', (req, res) => {
  try {
    const incoming = req.body || []
    if (!Array.isArray(incoming)) return res.status(400).json({ ok: false, error: 'payload should be array' })
    writeAddons(incoming)
    return res.json({ ok: true, addons: incoming })
  } catch (err) {
    console.error('write addons failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

// --- Per-item addon CRUD ---
app.get('/addon/:id', (req, res) => {
  try {
    const id = req.params.id
    const addons = readAddons()
    const a = addons.find(x => String(x.id) === String(id))
    if (!a) return res.status(404).json({ ok: false, error: 'addon not found' })
    return res.json({ ok: true, addon: a })
  } catch (err) {
    console.error('get addon failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/addon', (req, res) => {
  try {
    const incoming = req.body || {}
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ ok: false, error: 'invalid payload' })
    const addons = readAddons()
    const id = incoming.id || ('a' + Date.now().toString(36))
    const addon = Object.assign({ id }, incoming)
    addons.push(addon)
    writeAddons(addons)
    return res.json({ ok: true, addon })
  } catch (err) {
    console.error('create addon failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.put('/addon/:id', (req, res) => {
  try {
    const id = req.params.id
    const incoming = req.body || {}
    const addons = readAddons()
    const idx = addons.findIndex(a => String(a.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'addon not found' })
    const updated = Object.assign({}, addons[idx], incoming, { id: addons[idx].id })
    addons[idx] = updated
    writeAddons(addons)
    return res.json({ ok: true, addon: updated })
  } catch (err) {
    console.error('update addon failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.delete('/addon/:id', (req, res) => {
  try {
    const id = req.params.id
    const addons = readAddons()
    const idx = addons.findIndex(a => String(a.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'addon not found' })
    const removed = addons.splice(idx, 1)[0]
    writeAddons(addons)
    return res.json({ ok: true, removed })
  } catch (err) {
    console.error('delete addon failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.get('/categories', (req, res) => {
  try {
    const categories = readCategories()
    return res.json({ ok: true, categories })
  } catch (err) {
    console.error('read categories failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/categories', (req, res) => {
  try {
    const incoming = req.body || []
    if (!Array.isArray(incoming)) return res.status(400).json({ ok: false, error: 'payload should be array' })
    writeCategories(incoming)
    return res.json({ ok: true, categories: incoming })
  } catch (err) {
    console.error('write categories failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

// --- Per-item category CRUD ---
app.get('/category/:id', (req, res) => {
  try {
    const id = req.params.id
    const categories = readCategories()
    const c = categories.find(x => String(x.id) === String(id))
    if (!c) return res.status(404).json({ ok: false, error: 'category not found' })
    return res.json({ ok: true, category: c })
  } catch (err) {
    console.error('get category failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.post('/category', (req, res) => {
  try {
    const incoming = req.body || {}
    if (!incoming || typeof incoming !== 'object') return res.status(400).json({ ok: false, error: 'invalid payload' })
    const categories = readCategories()
    const id = incoming.id || ('c' + Date.now().toString(36))
    const category = Object.assign({ id }, incoming)
    categories.push(category)
    writeCategories(categories)
    return res.json({ ok: true, category })
  } catch (err) {
    console.error('create category failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.put('/category/:id', (req, res) => {
  try {
    const id = req.params.id
    const incoming = req.body || {}
    const categories = readCategories()
    const idx = categories.findIndex(c => String(c.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'category not found' })
    const updated = Object.assign({}, categories[idx], incoming, { id: categories[idx].id })
    categories[idx] = updated
    writeCategories(categories)
    return res.json({ ok: true, category: updated })
  } catch (err) {
    console.error('update category failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

app.delete('/category/:id', (req, res) => {
  try {
    const id = req.params.id
    const categories = readCategories()
    const idx = categories.findIndex(c => String(c.id) === String(id))
    if (idx === -1) return res.status(404).json({ ok: false, error: 'category not found' })
    const removed = categories.splice(idx, 1)[0]
    writeCategories(categories)
    return res.json({ ok: true, removed })
  } catch (err) {
    console.error('delete category failed', err)
    return res.status(500).json({ ok: false, error: err.message })
  }
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log('Orders server listening on', port))
