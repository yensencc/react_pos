import React, { useState } from 'react'
import ProductList from './components/ProductList'
import Receipt, { buildReceiptHtml } from './components/Receipt'
import { openPreviewWithEmbeddedLogo } from './lib/preview'
import useVirtualKeyboard from './hooks/useVirtualKeyboard'
import useCustomers from './hooks/useCustomers'
import useProducts from './hooks/useProducts'
import useAddons from './hooks/useAddons'
import useCategories from './hooks/useCategories'
import useOrders from './hooks/useOrders'
import useSettings from './hooks/useSettings'
import AddonsList from './components/AddonsList'
import Settings from './components/Settings'
import ImportExport from './components/ImportExport'
import DEFAULT_PRODUCTS from './data/products.json'
import DEFAULT_ADDONS from './data/addons.json'
import DEFAULT_SETTINGS from './data/settings.json'
import DEFAULT_CATEGORIES from './data/categories.json'
import DEFAULT_CUSTOMERS from './data/customers.json'
import DEFAULT_ORDERS from './data/orders.json'
import DEFAULT_FEATURES from './data/features.json'
import CategoryList from './components/CategoryList'
import OrdersList from './components/OrdersList'
import Features from './components/Features'
import VirtualKeyboard from './components/VirtualKeyboard'
import ProductManager from './components/ProductManager'


function genLineId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8)
}

export default function App() {
  const [cart, setCart] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedAddons, setSelectedAddons] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  // Settings are accessible only via the hidden route `#/settings`
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/')

  const { settings, setSettings, saveSettings } = useSettings(DEFAULT_SETTINGS)
  const { products, setProducts, saveProducts, createProduct, updateProduct, deleteProduct } = useProducts(DEFAULT_PRODUCTS)
  const { addons, setAddons, saveAddons, createAddon, updateAddon, deleteAddon } = useAddons(DEFAULT_ADDONS)
  const { categories, setCategories, saveCategories, createCategory, updateCategory, deleteCategory } = useCategories(DEFAULT_CATEGORIES)

  const { customers, currentCustomer, setCurrentCustomer, saveCustomers, persistCustomersAndCurrent, findCustomerById, grantOrderToCustomer, consumeRewardForCustomer, addCustomer } = useCustomers(DEFAULT_CUSTOMERS)

  const { orders, setOrders, saveOrders, genOrderId, placeOrder } = useOrders(DEFAULT_ORDERS)

  // Always use the file-based defaults for feature flags. Do not read
  // or write `pos_features` in localStorage so runtime overrides won't
  // change which features are available by default.
  const [features, setFeatures] = useState(DEFAULT_FEATURES)

  // Attempt to read/write features via the local server. If the server
  // isn't available, fall back to the file defaults in memory.
  const FEATURES_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/features'
  const SETTINGS_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/settings'
  const PRODUCTS_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/products'
  const ADDONS_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/addons'
  const CATEGORIES_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/categories'
  const PRODUCT_ITEM_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/product'
  const ADDON_ITEM_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/addon'
  const CATEGORY_ITEM_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/category'

  async function saveFeatures(obj) {
    try {
      const resp = await fetch(FEATURES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) })
      const data = await resp.json()
      if (data && data.ok && data.features) {
        setFeatures(data.features)
        return
      }
    } catch (err) {
      console.debug('features server not reachable, saving in-memory', err)
    }
    setFeatures(obj)
  }

  // Only allow known feature flags to be persisted. This prevents adding
  // a feature flag that would accidentally disable core functionality
  // such as receipt printing.
  function saveFeaturesSafe(obj) {
    const allowed = ['ordersView','sendToKitchen','serverSave','clientSearch','importExport','rewards','manageProducts']
    const filtered = {}
    for (const k of allowed) filtered[k] = !!obj[k]
    // persist via server when possible, otherwise keep in-memory
    saveFeatures(filtered)
  }

  // Load features from server on startup (fall back to defaults)
  React.useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const resp = await fetch(FEATURES_URL)
        const data = await resp.json()
        if (!cancelled && data && data.ok && data.features) setFeatures(data.features)
      } catch (err) {
        console.debug('Could not fetch features from server, using defaults', err)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  

  

  

  const [clientSearch, setClientSearch] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerCity, setNewCustomerCity] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [duplicateCustomer, setDuplicateCustomer] = useState(null)

  // Virtual keyboard hook provides attach/detach and key handlers plus phone utils
  const { keyboardTarget, attachKeyboard, detachKeyboard, vk_onKey, vk_backspace, vk_enter, normalizePhone, formatPhoneForInput } = useVirtualKeyboard()


  React.useEffect(() => {
    const onHash = () => {
      console.debug('hashchange ->', window.location.hash)
      setRoute(window.location.hash.slice(1) || '/')
    }

    const onDocClick = (e) => {
      try {
        const t = e.target
        const desc = t && (t.innerText || t.alt || t.title || t.tagName)
        console.debug('document click ->', { tag: t.tagName, desc, id: t.id, className: t.className })
      } catch (err) {
        console.debug('document click log failed', err)
      }
    }

    window.addEventListener('hashchange', onHash)
    document.addEventListener('click', onDocClick, true)
    return () => {
      window.removeEventListener('hashchange', onHash)
      document.removeEventListener('click', onDocClick, true)
    }
  }, [])

  function addItem(product) {
    setCart(curr => {
      // try to merge with existing item that has same id and no addons
      const existing = curr.find(i => i.id === product.id && (!i.addons || i.addons.length === 0))
      if (existing) {
        return curr.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...curr, { lineId: genLineId(), id: product.id, name: product.name, price: product.price, qty: 1, addons: [] }]
    })
  }

  function addStandaloneAddon(addonId) {
    const addon = addons.find(a => a.id === addonId)
    if (!addon) return
    setCart(curr => {
      const existing = curr.find(i => i.id === addonId && i.isAddonStandalone)
      if (existing) return curr.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i)
      return [...curr, { lineId: genLineId(), id: addon.id, name: addon.name, price: addon.price, qty: 1, addons: [], isAddonStandalone: true }]
    })
  }

  function removeItem(lineId) {
    setCart(curr => curr.filter(i => i.lineId !== lineId))
  }

  function clearCart() {
    setCart([])
  }

  function selectProductForAddons(product) {
    console.debug('selectProductForAddons', product && product.id)
    setSelectedProduct(product)
    setSelectedAddons([])
  }

  function cancelAddonSelection() {
    setSelectedProduct(null)
    setSelectedAddons([])
  }

  function toggleAddon(id) {
    setSelectedAddons(curr => curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id])
  }

  function doneAddonSelection() {
    if (!selectedProduct) return
    const chosenAddons = selectedAddons.map(id => addons.find(a => a.id === id)).filter(Boolean)
    setCart(curr => {
      // try merge on id + addon ids
      const keyFor = arr => JSON.stringify((arr||[]).map(a=>a.id).sort())
      const match = curr.find(i => i.id === selectedProduct.id && keyFor(i.addons) === keyFor(chosenAddons))
      if (match) {
        return curr.map(i => i === match ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...curr, { lineId: genLineId(), id: selectedProduct.id, name: selectedProduct.name, price: selectedProduct.price, qty: 1, addons: chosenAddons }]
    })
    setSelectedProduct(null)
    setSelectedAddons([])
  }

  function saveOrder(opts = {}) {
    if (!cart || cart.length === 0) {
      alert('No items to send')
      return
    }
    (async () => {
      try {
        const res = await placeOrder(cart, { settings, currentCustomer, products, paymentType: opts.paymentType })
        if (res && res.ok) {
          const order = res.order
          if (order && order.customer && order.customer.id) grantOrderToCustomer(order.customer.id)
          try { await openPreviewWithEmbeddedLogo(cart, settings, currentCustomer, products, opts.paymentType) } catch (e) { console.debug('preview failed', e) }
          setCart([])
          setSelectedProduct(null)
          setSelectedAddons([])
          setSelectedCategory(null)
          setClientSearch('')
          setCurrentCustomer(null)
          try { localStorage.removeItem('pos_currentCustomer') } catch (e) {}
          setNewCustomerName('')
          setNewCustomerCity('')
          setNewCustomerPhone('')
          setDuplicateCustomer(null)
          alert((res.server ? 'Order sent to kitchen (id: ' : 'Order saved locally (id: ') + (order && order.id) + ')')
        } else {
          alert('Failed to place order')
        }
      } catch (err) {
        console.debug('placeOrder failed', err)
        alert('Failed to place order')
      }
    })()
  }

  function applyRewardProduct(productId) {
    const p = products.find(x => x.id === productId)
    if (!p) return
    // add as free item (price 0) and mark as reward consumed
    setCart(curr => [...curr, { lineId: genLineId(), id: p.id, name: p.name + ' (Reward)', price: 0, qty: 1, addons: [], isReward: true }])
    if (currentCustomer && currentCustomer.id) consumeRewardForCustomer(currentCustomer.id)
  }
  const fullPage = route === '/manage' || route === '/settings'

  return (
    <div className="app">
      <nav className="menu-bar" style={{width:96,display:'flex',flexDirection:'column',gap:8,padding:8,boxSizing:'border-box',borderRight:'1px solid #eee'}}>
        <button type="button" className="product-btn" onClick={() => { window.location.hash = '/' }} style={{padding:'8px 10px',textAlign:'left'}}>Products</button>
        {features.ordersView && <button type="button" className="product-btn" onClick={()=>{ window.location.hash = '/orders' }} style={{padding:'8px 10px',textAlign:'left'}}>Orders</button>}
        {features.importExport && <button type="button" className="product-btn" onClick={()=>{ window.location.hash = '/import' }} style={{padding:'8px 10px',textAlign:'left'}}>Import/Export</button>}
        {features.manageProducts && <button type="button" className="product-btn" onClick={()=>{ window.location.hash = '/settings' }} style={{padding:'8px 10px',textAlign:'left'}}>Settings</button>}
        {features.manageProducts && <button type="button" className="product-btn" onClick={()=>{ window.location.hash = '/manage' }} style={{padding:'8px 10px',textAlign:'left'}}>Manage</button>}
      </nav>
      <aside className={"sidebar" + (fullPage ? ' full' : (route === '/manage' ? ' manage' : ''))}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Products</h2>
        </div>

            {route === '/settings' ? (
          <Settings settings={settings} features={features} onSave={(payload)=>{ if (payload && payload.settings) saveSettings(payload.settings); if (payload && payload.features) saveFeaturesSafe(payload.features); }} onCancel={()=>{ window.location.hash = '/' }} />

        ) : route === '/features' ? (
          <Features features={features} onSave={(payload) => { if (payload && payload.features) saveFeaturesSafe(payload.features); }} onCancel={()=>{ window.location.hash = '/' }} />

        ) : route === '/import' ? (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3>Import / Export</h3>
              <div>
                <button type="button" className="product-btn" onClick={()=>{ window.location.hash = '/' }}>Back</button>
              </div>
            </div>
            <ImportExport products={products} addons={addons} onSaveProducts={(arr)=>saveProducts(arr)} onSaveAddons={(arr)=>saveAddons(arr)} resetDefaults={()=>{ saveProducts(DEFAULT_PRODUCTS); saveAddons(DEFAULT_ADDONS); saveCategories(DEFAULT_CATEGORIES); }} />
          </div>
        ) : route === '/orders' ? (
          <div>
            <OrdersList orders={orders} settings={settings} onClose={()=>{ window.location.hash = '/' }} onPreviewOrder={openPreviewWithEmbeddedLogo} />
          </div>

        ) : route === '/manage' ? (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3>Product Manager</h3>
              <div>
                <button type="button" className="product-btn" onClick={()=>{ window.location.hash = '/' }}>Back</button>
              </div>
            </div>
            <ProductManager
              products={products}
              addons={addons}
              categories={categories}
              onSaveProducts={saveProducts}
              onSaveAddons={saveAddons}
              onSaveCategories={saveCategories}
              onCreateProduct={createProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onCreateAddon={createAddon}
              onUpdateAddon={updateAddon}
              onDeleteAddon={deleteAddon}
              onCreateCategory={createCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              settings={settings}
              features={features}
              onSaveSettings={(vals) => { if (vals) saveSettings(vals); }}
              onSaveFeatures={(f) => { if (f) saveFeaturesSafe(f); }}
              initialTab={route === '/settings' ? 'settings' : undefined}
            />
          </div>
        ) : selectedProduct ? (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>Customizing: {selectedProduct.name}</strong>
              <div>
                <button type="button" className="product-btn" onClick={cancelAddonSelection}>Cancel</button>
              </div>
            </div>
            <h4>Suggested Addons</h4>
            {
              (() => {
                const ids = Array.isArray(selectedProduct && selectedProduct.addonIds) ? selectedProduct.addonIds : []
                const suggested = Array.isArray(ids) ? ids.map(id => addons.find(a => a && a.id === id)).filter(Boolean) : []
                return <AddonsList addons={suggested} selected={selectedAddons} onToggle={toggleAddon} />
              })()
            }
            <div style={{marginTop:8,display:'flex',gap:8}}>
              <button type="button" className="clear" onClick={doneAddonSelection} disabled={false}>Done</button>
            </div>
          </div>

        ) : selectedCategory ? (
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <strong>{selectedCategory.name}</strong>
              <div>
                <button type="button" className="product-btn" onClick={()=>setSelectedCategory(null)}>Back</button>
              </div>
            </div>
            <ProductList products={products.filter(p=>p.categoryId===selectedCategory.id)} onAdd={addItem} onSelect={selectProductForAddons} />
          </>

        ) : (
          <>
            <CategoryList categories={categories} onSelect={(c)=>setSelectedCategory(c)} />
          </>
        )}
        
      </aside>
      {!fullPage && (
        <main className="receipt-area">
        <h2>Receipt</h2>
        <div style={{marginBottom:12}}>
          {features.clientSearch ? (
            <>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <label style={{fontWeight:600}}>Customer (phone)</label>
                <input
                  placeholder="Search phone..."
                  value={clientSearch}
                  onChange={e=>setClientSearch(e.target.value)}
                  onFocus={(e) => attachKeyboard('search', e.target, v => setClientSearch(v), 'numeric')}
                  style={{padding:'6px 8px',flex:1}}
                />
                <button type="button" className="product-btn" onClick={()=>{ setClientSearch('') }}>Clear</button>
              </div>
              {clientSearch && (
                <div style={{marginTop:8,maxHeight:260,overflow:'auto',border:'1px solid #eee',padding:8}}>
                  {customers.filter(c => (c.phone||'').includes(clientSearch)).length === 0 ? (
                    <div>
                      <div style={{color:'#666'}}>No customers found for "{clientSearch}"</div>
                      <div style={{marginTop:8,padding:10,background:'#fafafa',borderRadius:6}}>
                        <div style={{fontWeight:700,marginBottom:6}}>Add new customer</div>
                        <div style={{display:'flex',gap:8,flexDirection:'column'}}>
                          <input placeholder="Phone" value={newCustomerPhone || formatPhoneForInput(clientSearch)} onChange={e=>setNewCustomerPhone(formatPhoneForInput(e.target.value))} onFocus={(e) => attachKeyboard('phone', e.target, v => setNewCustomerPhone(v), 'numeric')} style={{padding:'6px 8px'}} />
                          <input placeholder="Name" value={newCustomerName} onChange={e=>setNewCustomerName(e.target.value)} onFocus={(e) => attachKeyboard('name', e.target, v => setNewCustomerName(v), 'text')} style={{padding:'6px 8px'}} />
                          <input placeholder="City (optional)" value={newCustomerCity} onChange={e=>setNewCustomerCity(e.target.value)} onFocus={(e) => attachKeyboard('city', e.target, v => setNewCustomerCity(v), 'text')} style={{padding:'6px 8px'}} />
                          {duplicateCustomer && (
                            <div style={{padding:8,background:'#fff4f4',border:'1px solid #f5c2c2',borderRadius:6}}>
                              <div style={{fontWeight:700,color:'#a00'}}>Duplicate phone found</div>
                              <div style={{marginTop:6}}>{duplicateCustomer.name} — {duplicateCustomer.phone}{duplicateCustomer.city ? ' — ' + duplicateCustomer.city : ''}</div>
                              <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:8}}>
                                <button type="button" className="product-btn" onClick={() => { setCurrentCustomer(duplicateCustomer); try{ localStorage.setItem('pos_currentCustomer', JSON.stringify(duplicateCustomer)) }catch(e){} setDuplicateCustomer(null); setClientSearch('') }}>Select</button>
                                <button type="button" className="product-btn" onClick={async () => {
                                  const phoneToUse = newCustomerPhone || clientSearch
                                  const res = await addCustomer({ name: newCustomerName || ('Customer ' + Date.now()), phone: phoneToUse, city: newCustomerCity, overwrite: true })
                                  if (res && res.ok) {
                                    setCurrentCustomer(res.customer)
                                    try{ localStorage.setItem('pos_currentCustomer', JSON.stringify(res.customer)) }catch(e){}
                                    setNewCustomerName('')
                                    setNewCustomerCity('')
                                    setNewCustomerPhone('')
                                    setDuplicateCustomer(null)
                                    setClientSearch('')
                                  } else {
                                    alert('Failed to overwrite customer')
                                  }
                                }} style={{background:'#e03'}}>Overwrite</button>
                              </div>
                            </div>
                          )}
                          <div style={{display:'flex',justifyContent:'flex-end',marginTop:8}}>
                            <button type="button" className="product-btn" onClick={() => { setNewCustomerName(''); setNewCustomerCity(''); setNewCustomerPhone(''); setClientSearch('') }} style={{marginRight:8}}>Clear</button>
                            <button type="button" className="product-btn" onClick={async () => {
                              const phoneToUse = newCustomerPhone || clientSearch
                              const normalized = normalizePhone(phoneToUse)
                              if (!normalized) { alert('Please enter a phone number'); return }
                              const existing = (customers || []).find(c => normalizePhone(c.phone) === normalized)
                              if (existing) { setDuplicateCustomer(existing); return }
                              const result = await addCustomer({ name: newCustomerName || ('Customer ' + Date.now()), phone: phoneToUse, city: newCustomerCity })
                              if (result && result.ok) {
                                setCurrentCustomer(result.customer)
                                try{ localStorage.setItem('pos_currentCustomer', JSON.stringify(result.customer)) }catch(e){}
                                setNewCustomerName('')
                                setNewCustomerCity('')
                                setNewCustomerPhone('')
                                setClientSearch('')
                              } else if (result && result.error === 'duplicate' && result.existing) {
                                setDuplicateCustomer(result.existing)
                              } else {
                                alert('Failed to save customer')
                              }
                            }}>Save Customer</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    customers.filter(c => (c.phone||'').includes(clientSearch)).map(c => (
                      <div key={c.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 4px',borderBottom:'1px solid #f6f6f6'}}>
                        <div style={{fontSize:14}}>{c.name} — {c.phone}{c.city ? ' — ' + c.city : ''}</div>
                        <button type="button" className="product-btn" onClick={() =>{
                          setCurrentCustomer(c)
                          try{ localStorage.setItem('pos_currentCustomer', JSON.stringify(c)) }catch(e){}
                          setClientSearch('')
                        }}>Select</button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <div style={{fontSize:13,color:'#666'}}>
              {currentCustomer ? (<span>Customer: <strong>{currentCustomer.name}</strong> — {currentCustomer.phone}</span>) : (<span>Customer search disabled</span>)}
            </div>
          )}
          {currentCustomer && (
            <div style={{marginTop:8,fontSize:13,color:'#333'}}>Selected: <strong>{currentCustomer.name}</strong> — {currentCustomer.phone}{currentCustomer.city ? ' — ' + currentCustomer.city : ''} <button type="button" className="product-btn" onClick={()=>{ setCurrentCustomer(null); try{ localStorage.removeItem('pos_currentCustomer') }catch(e){} }} style={{marginLeft:8}}>Clear</button></div>
          )}
        </div>
        <Receipt items={cart} onRemove={removeItem} onClear={clearCart} settings={settings} customer={currentCustomer} onSend={features.sendToKitchen ? saveOrder : undefined} products={products} onApplyReward={applyRewardProduct} features={features} />
          {keyboardTarget && (
            <VirtualKeyboard mode={keyboardTarget.mode || 'text'} onKey={vk_onKey} onBackspace={vk_backspace} onEnter={vk_enter} onClose={detachKeyboard} />
          )}
        </main>
      )}
    </div>
  )
}
