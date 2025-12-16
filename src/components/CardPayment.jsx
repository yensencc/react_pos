import React, { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

function InnerForm({ amountCents, publishableKey, onSuccess, onCancel, currentCustomerId }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [saveCard, setSaveCard] = useState(false)
  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    try {
      const endpoint = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/stripe/create_payment_intent_web'
      const resp = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents })
      })
      let data
      try {
        if (!resp.ok) {
          const t = await resp.text()
          throw new Error('Create payment intent failed: ' + resp.status + ' ' + (t || resp.statusText))
        }
        data = await resp.json()
      } catch (err) {
        setLoading(false)
        alert('Create payment intent failed: ' + (err && err.message ? err.message : String(err)))
        return
      }
      if (!data.ok) { alert('Create payment intent failed: ' + (data.error || '')); setLoading(false); return }
      const result = await stripe.confirmCardPayment(data.client_secret, {
        payment_method: { card: elements.getElement(CardElement) }
      })
      setLoading(false)
      if (result.error) { alert('Payment failed: ' + result.error.message); return }
      if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
        // Attempt to save card if requested and we have a local customer id
        if (saveCard && currentCustomerId) {
          (async () => {
            try {
              const saveResp = await fetch((window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/stripe/save_payment_method', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ payment_intent: result.paymentIntent.id, customerId: currentCustomerId })
              })
              const saveData = await saveResp.json()
              if (!saveData.ok) {
                console.warn('Saving payment method failed', saveData)
                alert('Payment succeeded but saving card failed: ' + (saveData.error || ''))
              } else {
                alert('Card saved to customer')
              }
            } catch (err) {
              console.warn('Saving payment method error', err)
              alert('Payment succeeded but saving card failed: ' + (err && err.message ? err.message : String(err)))
            }
          })()
        }
        onSuccess(result.paymentIntent)
      }
    } catch (err) {
      setLoading(false)
      alert('Payment flow error: ' + (err && err.message ? err.message : String(err)))
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{padding:12}}>
      <div style={{marginBottom:8}}><CardElement /></div>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <label style={{display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={saveCard} onChange={e=>setSaveCard(e.target.checked)} disabled={!currentCustomerId} title={currentCustomerId ? '' : 'Select a customer to enable saving card'} /> Save card to customer</label>
        <div style={{fontSize:12,color:'#666'}}>Use this to save card for quick reuse (requires selected customer).</div>
      </div>
      <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
        <button type="button" className="product-btn" onClick={onCancel}>Cancel</button>
        <button type="submit" className="product-btn" disabled={loading}>{loading ? 'Processing...' : `Pay $${(amountCents/100).toFixed(2)}`}</button>
      </div>
    </form>
  )
}

export default function CardPayment({ publishableKey, amountCents, onSuccess, onCancel, currentCustomerId = null }) {
  if (!publishableKey || !String(publishableKey).trim()) {
    return (
      <div style={{padding:8,border:'1px solid #eee',borderRadius:6,background:'#fff'}}>
        <h4>Card Payment</h4>
        <div style={{color:'#a00',marginBottom:8}}>Stripe publishable key is not configured. Set it in Settings to enable card payments.</div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <button type="button" className="product-btn" onClick={onCancel}>Close</button>
        </div>
      </div>
    )
  }
  const stripePromise = loadStripe(publishableKey)
  return (
    <div style={{padding:8,border:'1px solid #eee',borderRadius:6,background:'#fff'}}>
      <h4>Card Payment</h4>
      <Elements stripe={stripePromise}>
        <InnerForm amountCents={amountCents} publishableKey={publishableKey} onSuccess={onSuccess} onCancel={onCancel} currentCustomerId={currentCustomerId} />
      </Elements>
    </div>
  )
}
