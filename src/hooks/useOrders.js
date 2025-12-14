import { useState } from 'react'

export default function useOrders(defaults) {
  const [orders, setOrders] = useState(() => {
    try { const raw = localStorage.getItem('pos_orders'); return raw ? JSON.parse(raw) : (defaults || []) } catch(e) { return (defaults || []) }
  })

  function saveOrders(arr) { setOrders(arr); try{ localStorage.setItem('pos_orders', JSON.stringify(arr)) }catch(e){} }

  function genOrderId() { return 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2,6) }

  async function placeOrder(cart, { settings, currentCustomer, products, paymentType } = {}) {
    if (!cart || cart.length === 0) throw new Error('empty_cart')
    const taxRate = settings && settings.taxRate != null ? settings.taxRate : 8
    const subtotal = cart.reduce((s, it) => s + (it.price + ((it.addons||[]).reduce((a,x)=>a+(x.price||0),0))) * it.qty, 0)
    const tax = subtotal * (taxRate/100)
    const total = subtotal + tax

    // Payment fee calculation (configurable via settings.paymentFees)
    const feeConfig = (settings && settings.paymentFees) || {}
    let feePercent = 0
    if (paymentType === 'credit') feePercent = Number(feeConfig.creditPercent || 0)
    else if (paymentType === 'debit') feePercent = Number(feeConfig.debitPercent || 0)
    const paymentFee = Math.round((total * (feePercent/100)) * 100) / 100
    const totalWithFee = Math.round((total + paymentFee) * 100) / 100

    const order = {
      id: genOrderId(),
      createdAt: new Date().toISOString(),
      customer: currentCustomer || null,
      items: cart,
      subtotal,
      taxRate,
      tax,
      total,
      paymentType: paymentType || 'cash',
      paymentFeePercent: feePercent,
      paymentFee,
      totalWithFee,
      status: 'sent'
    }

    const url = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/orders'
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) })
      const data = await resp.json()
      // always persist locally as single source of truth
      const next = [...(orders || []), order]
      saveOrders(next)
      return { ok: true, server: !!(data && data.ok), order }
    } catch (err) {
      // fallback: persist locally
      const next = [...(orders || []), order]
      saveOrders(next)
      return { ok: true, server: false, order }
    }
  }

  return { orders, setOrders, saveOrders, genOrderId, placeOrder }
}
