import { useState } from 'react'

export default function useCategories(defaults) {
  const [categories, setCategories] = useState(() => {
    try { const raw = localStorage.getItem('pos_categories'); return raw ? JSON.parse(raw) : (defaults || []) } catch(e) { return (defaults || []) }
  })

  async function saveCategories(arr) {
    setCategories(arr)
    try { localStorage.setItem('pos_categories', JSON.stringify(arr)) } catch(e){}
    try {
      const CATEGORIES_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/categories'
      const resp = await fetch(CATEGORIES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) })
      const data = await resp.json()
      if (data && data.ok && data.categories) setCategories(data.categories)
    } catch (err) { console.debug('categories server not reachable', err) }
  }

  async function createCategory(payload) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/category'
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await resp.json()
      if (data && data.ok && data.category) {
        const next = (categories || []).slice(); next.push(data.category)
        setCategories(next); try{ localStorage.setItem('pos_categories', JSON.stringify(next)) }catch(e){}
        return data.category
      }
    } catch (err) { console.debug('create category server not reachable', err) }
    const id = payload.id || ('c' + Date.now().toString(36))
    const obj = Object.assign({ id }, payload)
    const next = (categories || []).slice(); next.push(obj)
    setCategories(next); try{ localStorage.setItem('pos_categories', JSON.stringify(next)) }catch(e){}
    return obj
  }

  async function updateCategory(id, patch) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/category/' + encodeURIComponent(id)
    try {
      const resp = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const data = await resp.json()
      if (data && data.ok && data.category) {
        const next = (categories || []).map(c => c.id === id ? data.category : c)
        setCategories(next); try{ localStorage.setItem('pos_categories', JSON.stringify(next)) }catch(e){}
        return data.category
      }
    } catch (err) { console.debug('update category server not reachable', err) }
    const next = (categories || []).map(c => c.id === id ? Object.assign({}, c, patch, { id: c.id }) : c)
    setCategories(next); try{ localStorage.setItem('pos_categories', JSON.stringify(next)) }catch(e){}
    return next.find(c => c.id === id)
  }

  async function deleteCategory(id) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/category/' + encodeURIComponent(id)
    try {
      const resp = await fetch(url, { method: 'DELETE' })
      const data = await resp.json()
      if (data && data.ok) {
        const next = (categories || []).filter(c => c.id !== id)
        setCategories(next); try{ localStorage.setItem('pos_categories', JSON.stringify(next)) }catch(e){}
        return data.removed
      }
    } catch (err) { console.debug('delete category server not reachable', err) }
    const next = (categories || []).filter(c => c.id !== id)
    setCategories(next); try{ localStorage.setItem('pos_categories', JSON.stringify(next)) }catch(e){}
    return null
  }

  return { categories, setCategories, saveCategories, createCategory, updateCategory, deleteCategory }
}
