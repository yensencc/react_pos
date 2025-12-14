import { useState } from 'react'

export default function useAddons(defaults) {
  const [addons, setAddons] = useState(() => {
    try { const raw = localStorage.getItem('pos_addons'); return raw ? JSON.parse(raw) : (defaults || []) } catch(e) { return (defaults || []) }
  })

  async function saveAddons(arr) {
    setAddons(arr)
    try { localStorage.setItem('pos_addons', JSON.stringify(arr)) } catch(e){}
    try {
      const ADDONS_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/addons'
      const resp = await fetch(ADDONS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(arr) })
      const data = await resp.json()
      if (data && data.ok && data.addons) setAddons(data.addons)
    } catch (err) { console.debug('addons server not reachable', err) }
  }

  async function createAddon(payload) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/addon'
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await resp.json()
      if (data && data.ok && data.addon) {
        const next = (addons || []).slice(); next.push(data.addon)
        setAddons(next); try{ localStorage.setItem('pos_addons', JSON.stringify(next)) }catch(e){}
        return data.addon
      }
    } catch (err) { console.debug('create addon server not reachable', err) }
    const id = payload.id || ('a' + Date.now().toString(36))
    const obj = Object.assign({ id }, payload)
    const next = (addons || []).slice(); next.push(obj)
    setAddons(next); try{ localStorage.setItem('pos_addons', JSON.stringify(next)) }catch(e){}
    return obj
  }

  async function updateAddon(id, patch) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/addon/' + encodeURIComponent(id)
    try {
      const resp = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      const data = await resp.json()
      if (data && data.ok && data.addon) {
        const next = (addons || []).map(a => a.id === id ? data.addon : a)
        setAddons(next); try{ localStorage.setItem('pos_addons', JSON.stringify(next)) }catch(e){}
        return data.addon
      }
    } catch (err) { console.debug('update addon server not reachable', err) }
    const next = (addons || []).map(a => a.id === id ? Object.assign({}, a, patch, { id: a.id }) : a)
    setAddons(next); try{ localStorage.setItem('pos_addons', JSON.stringify(next)) }catch(e){}
    return next.find(a => a.id === id)
  }

  async function deleteAddon(id) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/addon/' + encodeURIComponent(id)
    try {
      const resp = await fetch(url, { method: 'DELETE' })
      const data = await resp.json()
      if (data && data.ok) {
        const next = (addons || []).filter(a => a.id !== id)
        setAddons(next); try{ localStorage.setItem('pos_addons', JSON.stringify(next)) }catch(e){}
        return data.removed
      }
    } catch (err) { console.debug('delete addon server not reachable', err) }
    const next = (addons || []).filter(a => a.id !== id)
    setAddons(next); try{ localStorage.setItem('pos_addons', JSON.stringify(next)) }catch(e){}
    return null
  }

  return { addons, setAddons, saveAddons, createAddon, updateAddon, deleteAddon }
}
