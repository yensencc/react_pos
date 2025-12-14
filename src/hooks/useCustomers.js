import { useState } from 'react'

export default function useCustomers(defaults) {
  const [customers, setCustomers] = useState(() => {
    try { const raw = localStorage.getItem('pos_customers'); return raw ? JSON.parse(raw) : (defaults || []) } catch(e) { return (defaults || []) }
  })

  const [currentCustomer, setCurrentCustomer] = useState(() => {
    try { const raw = localStorage.getItem('pos_currentCustomer'); return raw ? JSON.parse(raw) : null } catch(e) { return null }
  })

  function saveCustomers(arr) { setCustomers(arr); try{ localStorage.setItem('pos_customers', JSON.stringify(arr)) }catch(e){} }

  function persistCustomersAndCurrent(arr) {
    saveCustomers(arr)
    if (currentCustomer) {
      const updated = arr.find(c => c.id === currentCustomer.id)
      if (updated) { setCurrentCustomer(updated); try{ localStorage.setItem('pos_currentCustomer', JSON.stringify(updated)) }catch(e){} }
    }
  }

  function findCustomerById(id) {
    return (customers || []).find(c => c && c.id === id)
  }

  function grantOrderToCustomer(customerId) {
    if (!customerId) return
    const next = (customers || []).slice()
    const idx = next.findIndex(c => c.id === customerId)
    if (idx === -1) return
    const cust = { ...(next[idx]) }
    cust.points = (cust.points || 0) + 1
    if (cust.points >= 10) {
      cust.points = 0
      cust.rewardAvailable = true
    }
    next[idx] = cust
    persistCustomersAndCurrent(next)
  }

  function consumeRewardForCustomer(customerId) {
    if (!customerId) return
    const next = (customers || []).slice()
    const idx = next.findIndex(c => c.id === customerId)
    if (idx === -1) return
    const cust = { ...(next[idx]) }
    cust.rewardAvailable = false
    cust.points = 0
    next[idx] = cust
    persistCustomersAndCurrent(next)
  }

  async function addCustomer(payload) {
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = serverBase + '/customers'
    const payloadCopy = { id: payload.id, name: payload.name, phone: payload.phone, city: payload.city, overwrite: !!payload.overwrite }
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payloadCopy) })
      const data = await resp.json()
      if (resp.status === 409) {
        return { ok: false, error: 'duplicate', existing: data && data.existing }
      }
      if (data && data.ok && data.customer) {
        const next = (customers || []).slice()
        const norm = (data.customer && data.customer.phone) ? String(data.customer.phone).replace(/\D/g,'') : ''
        const idx = next.findIndex(c => (String(c.phone || '').replace(/\D/g,'')) === norm)
        if (idx !== -1) next[idx] = data.customer; else next.push(data.customer)
        saveCustomers(next)
        return { ok: true, customer: data.customer }
      }
    } catch (err) {
      console.debug('customers server not reachable, saving locally', err)
    }

    const next = (customers || []).slice()
    const id = payload.id || ('c' + Date.now().toString(36))
    const customer = { id, name: payload.name || '', phone: payload.phone || '', city: payload.city || '' }
    const norm = String(customer.phone || '').replace(/\D/g, '')
    const idx = next.findIndex(c => String(c.phone || '').replace(/\D/g,'') === norm)
    if (idx !== -1 && payload.overwrite) {
      next[idx] = customer
    } else if (idx === -1) {
      next.push(customer)
    } else {
      return { ok: false, error: 'duplicate', existing: next[idx] }
    }
    saveCustomers(next)
    return { ok: true, customer }
  }

  return { customers, currentCustomer, setCurrentCustomer, saveCustomers, persistCustomersAndCurrent, findCustomerById, grantOrderToCustomer, consumeRewardForCustomer, addCustomer }
}
