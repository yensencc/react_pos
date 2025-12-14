import { useState } from 'react'

export default function useProducts(defaults) {
  const isValidProduct = (p) => {
    if (!p || typeof p !== 'object') return false
    if (!('id' in p)) return false
    if (!('name' in p) || typeof p.name !== 'string') return false
    if (!('price' in p) || typeof p.price !== 'number') return false
    return true
  }

  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem('pos_products')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every(isValidProduct)) return parsed
        // invalid localStorage content -> fall back to file defaults
      }
      return (defaults || [])
    } catch (e) {
      return (defaults || [])
    }
  })

  async function saveProducts(arr) {
    setProducts(arr)
    try { localStorage.setItem('pos_products', JSON.stringify(arr)) } catch(e){}
    try {
      const PRODUCTS_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/products'
      const resp = await fetch(PRODUCTS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) })
      const data = await resp.json()
      if (data && data.ok && data.products) setProducts(data.products)
    } catch (err) { console.debug('products server not reachable', err) }
  }

  async function createProduct(payload) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/product'
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await resp.json()
      if (data && data.ok && data.product) {
        const next = (products || []).slice(); next.push(data.product)
        setProducts(next); try{ localStorage.setItem('pos_products', JSON.stringify(next)) }catch(e){}
        return data.product
      }
    } catch (err) {
      console.debug('create product server not reachable', err)
    }
    const id = payload.id || ('p' + Date.now().toString(36))
    const prod = Object.assign({ id }, payload)
    const next = (products || []).slice(); next.push(prod)
    setProducts(next); try{ localStorage.setItem('pos_products', JSON.stringify(next)) }catch(e){}
    return prod
  }

  async function updateProduct(id, patch) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/product/' + encodeURIComponent(id)
    try {
      const resp = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const data = await resp.json()
      if (data && data.ok && data.product) {
        const next = (products || []).map(p => p.id === id ? data.product : p)
        setProducts(next); try{ localStorage.setItem('pos_products', JSON.stringify(next)) }catch(e){}
        return data.product
      }
    } catch (err) {
      console.debug('update product server not reachable', err)
    }
    const next = (products || []).map(p => p.id === id ? Object.assign({}, p, patch, { id: p.id }) : p)
    setProducts(next); try{ localStorage.setItem('pos_products', JSON.stringify(next)) }catch(e){}
    return next.find(p => p.id === id)
  }

  async function deleteProduct(id) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/product/' + encodeURIComponent(id)
    try {
      const resp = await fetch(url, { method: 'DELETE' })
      const data = await resp.json()
      if (data && data.ok) {
        const next = (products || []).filter(p => p.id !== id)
        setProducts(next); try{ localStorage.setItem('pos_products', JSON.stringify(next)) }catch(e){}
        return data.removed
      }
    } catch (err) {
      console.debug('delete product server not reachable', err)
    }
    const next = (products || []).filter(p => p.id !== id)
    setProducts(next); try{ localStorage.setItem('pos_products', JSON.stringify(next)) }catch(e){}
    return null
  }

  function resetToDefaults() {
    const arr = (defaults || [])
    setProducts(arr)
    try { localStorage.setItem('pos_products', JSON.stringify(arr)) } catch (e) {}
  }

  return { products, setProducts, saveProducts, createProduct, updateProduct, deleteProduct, resetToDefaults }
}
