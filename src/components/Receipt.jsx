import React, { useState } from 'react'

function currency(v) { return `$${v.toFixed(2)}` }

export function buildReceiptHtml(items, settings = {}, customer = null, products = [], paymentType) {
  try {
    const taxRate = settings.taxRate != null ? settings.taxRate : 8
    const subtotal = items.reduce((s, it) => {
      const addonsTotal = (it.addons || []).reduce((a, x) => a + (x.price || 0), 0)
      return s + (it.price + addonsTotal) * it.qty
    }, 0)
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax

    // compute payment fee if applicable
    const feeCfg = (settings && settings.paymentFees) || {}
    let feePercent = 0
    if (paymentType === 'credit') feePercent = Number(feeCfg.creditPercent || 0)
    else if (paymentType === 'debit') feePercent = Number(feeCfg.debitPercent || 0)
    const paymentFee = Math.round((total * (feePercent/100)) * 100) / 100
    const grandTotal = Math.round((total + paymentFee) * 100) / 100

    const rows = items.map(i => {
      const addonsText = (i.addons || []).map(a => `${a.name} (${currency(a.price)})`).join('<br/>')
      const lineTotal = ((i.price || 0) + (i.addons || []).reduce((s,a)=>s+(a.price||0),0)) * i.qty
      return `<div style="margin-bottom:8px"><div style="font-weight:600">${i.name} x${i.qty} — ${currency(lineTotal)}</div>${addonsText ? `<div style="margin-left:8px;font-size:13px;color:#444">${addonsText}</div>` : ''}</div>`
    }).join('')

    const businessHtml = `<div style="margin-bottom:12px"><div style="font-weight:700;font-size:18px">${settings.businessName || ''}</div><div style="font-size:13px;color:#444">${settings.address || ''}</div>${settings.phone ? `<div style="font-size:13px;color:#444">Phone: ${settings.phone}</div>` : ''}</div>`

    const customerHtml = customer ? `<div style="margin-bottom:8px"><strong>Customer: ${customer.name}</strong><div style="font-size:13px;color:#444">${customer.phone || ''}${customer.city ? ' — ' + customer.city : ''}</div><div style="margin-top:6px;color:#f5a623">${'★'.repeat(Math.max(0, customer.points || 0))} (${customer.points || 0}/10)</div></div>` : ''

    const footerHtml = settings.footerNote ? `<div style="margin-top:12px;font-size:13px;color:#666">${settings.footerNote}</div>` : ''

    let logoSrc = settings.logo ? ('' + settings.logo).trim() : ''
    if (logoSrc.startsWith('public/')) logoSrc = '/' + logoSrc.slice('public/'.length)
    else if (logoSrc && !/^https?:\/\//i.test(logoSrc) && !logoSrc.startsWith('/') && !logoSrc.startsWith('data:') && !logoSrc.startsWith('blob:')) logoSrc = '/' + logoSrc
    const logoHtml = logoSrc ? `<div style="margin-bottom:4px;text-align:center"><img src="${logoSrc}" alt="Logo" style="max-width:72mm;max-height:20mm;width:auto;height:auto;margin-bottom:2px;display:block;margin-left:auto;margin-right:auto;object-fit:contain" /></div>` : ''

    const feeLine = feePercent ? `<div style="display:flex;justify-content:space-between"><strong>Payment Fee (${feePercent}%)</strong><span>${currency(paymentFee)}</span></div>` : ''
    const grandLine = feePercent ? `<div style="display:flex;justify-content:space-between"><strong>Grand Total</strong><span>${currency(grandTotal)}</span></div>` : ''

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt Preview</title><style>
      /* Print / page sizing for 80mm thermal receipt printers */
      @page { size: 80mm auto; margin: 4mm; }
      body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:8px;box-sizing:border-box;color:#111;width:80mm}
      h2{margin-top:2mm;margin-bottom:4px}
      .totals{margin-top:12px;border-top:1px solid #ddd;padding-top:8px}
      .print-btn{display:inline-block;margin-bottom:12px;padding:6px 10px;border-radius:6px;background:#0b74de;color:#fff;border:none;cursor:pointer}
      /* hide preview controls when actually printing */
      @media print { .print-btn{display:none} body{margin:0;padding:0} }
      </style></head><body><button class="print-btn" onclick="window.print()">Print</button>${logoHtml}<h2 style="margin-top:6px">Receipt</h2>${businessHtml}${customerHtml}${rows}<div class="totals"><div style="display:flex;justify-content:space-between"><strong>Subtotal</strong><span>${currency(subtotal)}</span></div><div style="display:flex;justify-content:space-between"><strong>Tax (${taxRate}%)</strong><span>${currency(tax)}</span></div><div style="display:flex;justify-content:space-between"><strong>Total</strong><span>${currency(total)}</span></div>${feeLine}${grandLine}</div>${footerHtml}</body></html>`
    return html
  } catch (err) {
    console.error('buildReceiptHtml failed', err)
    return null
  }
}

export default function Receipt({ items, onRemove, onClear, settings = {}, customer = null, onSend, products = [], onApplyReward, features = {} }) {
  const taxRate = settings.taxRate != null ? settings.taxRate : 8
  const subtotal = items.reduce((s, it) => {
    const addonsTotal = (it.addons || []).reduce((a, x) => a + (x.price || 0), 0)
    return s + (it.price + addonsTotal) * it.qty
  }, 0)
  const tax = subtotal * (taxRate/100)
  const total = subtotal + tax

  const [paymentType, setPaymentType] = useState('cash')

  // Cash payment modal state
  const [showCash, setShowCash] = useState(false)
  const [paidAmount, setPaidAmount] = useState('')
  const [changeBreakdown, setChangeBreakdown] = useState(null)
  const [showRewardModal, setShowRewardModal] = useState(false)

  function cents(v) { return Math.round(v * 100) }
  function fromCents(c) { return (c/100).toFixed(2) }

  const DENOMS = [
    { c: 10000, label: '$100' },
    { c: 5000, label: '$50' },
    { c: 2000, label: '$20' },
    { c: 1000, label: '$10' },
    { c: 500, label: '$5' },
    { c: 200, label: '$2' },
    { c: 100, label: '$1' },
    { c: 100, label: '$1 coin' },
    { c: 50, label: '50¢' },
    { c: 25, label: '25¢' },
    { c: 10, label: '10¢' },
    { c: 5, label: '5¢' },
    { c: 1, label: '1¢' }
  ]

  function computeChangeBreakdown(change) {
    // change in dollars (number) -> breakdown
    let remaining = Math.round(change * 100)
    const result = []
    for (const d of DENOMS) {
      const cnt = Math.floor(remaining / d.c)
      result.push({ label: d.label, count: cnt, value: d.c })
      remaining = remaining - cnt * d.c
    }
    return { totalChangeCents: Math.round(change * 100), parts: result }
  }

  function handlePrint() {
    const html = buildReceiptHtml(items, settings, customer, products, paymentType)
    if (!html) return
    const w = window.open('', '_blank', 'width=340,height=600')
    w.document.write(html)
    w.document.close()
  }

  return (
    <div className="receipt">
      {items.length === 0 ? (
        <div className="empty">No items yet — add products on the left.</div>
      ) : (
        <div className="items">
          {items.map(i => (
            <div className="receipt-item" key={i.lineId}>
              <div className="left">
                <div className="name">{i.name} x{i.qty}</div>
                <div className="price">{currency(((i.price || 0) + ((i.addons||[]).reduce((a,x)=>a+(x.price||0),0))) * i.qty)}</div>
                {(i.addons || []).length > 0 && (
                  <div style={{marginTop:6}}>
                    {(i.addons || []).map(a => (
                      <div key={a.id} style={{fontSize:13,color:'#555'}}>- {a.name} {currency(a.price)}</div>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="remove" onClick={() => { if (confirm('Remove this item from the cart?')) onRemove(i.lineId) }}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {customer && features.rewards && (
        <div style={{marginTop:10,fontSize:13,color:'#444'}}>
          <div style={{fontWeight:700}}>Loyalty</div>
          <div style={{marginTop:6}}>
            <span style={{marginRight:8}}>Stars:</span>
            <span style={{color:'#f5a623'}}>{'★'.repeat(Math.max(0, customer.points || 0))}</span>
            <span style={{marginLeft:8,color:'#666'}}>({customer.points || 0}/10)</span>
          </div>
          {customer.rewardAvailable && (
            <div style={{marginTop:8}}>
              <button className="product-btn" onClick={() => setShowRewardModal(true)}>Redeem Reward</button>
            </div>
          )}
        </div>
      )}

      <div className="totals">
        <div className="row"><span>Subtotal</span><span>{currency(subtotal)}</span></div>
        <div className="row"><span>Tax ({taxRate}%)</span><span>{currency(tax)}</span></div>
        <div className="row"><span>Total</span><span>{currency(total)}</span></div>
        {(() => {
          const feeCfg = (settings && settings.paymentFees) || {}
          let feePercent = 0
          if (paymentType === 'credit') feePercent = Number(feeCfg.creditPercent || 0)
          else if (paymentType === 'debit') feePercent = Number(feeCfg.debitPercent || 0)
          if (!feePercent) return null
          const paymentFee = Math.round((total * (feePercent/100)) * 100) / 100
          const grandTotal = Math.round((total + paymentFee) * 100) / 100
          return (<>
            <div className="row"><span>Payment Fee ({feePercent}%)</span><span>{currency(paymentFee)}</span></div>
            <div className="row total"><span>Grand Total</span><span>{currency(grandTotal)}</span></div>
          </>)
        })()}
      </div>

      <div style={{marginBottom:8}}>
        <label style={{fontWeight:600,marginRight:8}}>Payment</label>
        <select value={paymentType} onChange={e=>setPaymentType(e.target.value)} style={{padding:6}}>
          <option value="cash">Cash</option>
          <option value="debit">Card (Debit)</option>
          <option value="credit">Card (Credit)</option>
        </select>
      </div>

      {/* Separated controls section below the receipt */}
      <div className="receipt-controls" style={{width:'100%',display:'flex',justifyContent:'center',marginTop:12}}>
        <div style={{maxWidth:320,display:'flex',justifyContent:'flex-end',gap:8}}>
          <button type="button" className="clear" onClick={handlePrint} disabled={items.length===0} style={{marginRight:8}}>Preview / Print</button>
          <button type="button" className="clear" onClick={() => setShowCash(true)} disabled={items.length===0} style={{marginRight:8}}>Cash</button>
          <button
            type="button"
            className="clear"
            onClick={() => {
              try {
                console.debug('Send button clicked', { itemsLength: items.length, hasOnSend: !!onSend })
                if (onSend) return onSend({ paymentType })
                alert('Send to Kitchen is disabled in Settings. Enable it in Settings -> Feature Toggles.')
              } catch (err) {
                console.error('Send handler failed', err)
                alert('Send failed: ' + (err && err.message ? err.message : err))
              }
            }}
            disabled={items.length===0 || !onSend}
            style={{marginRight:8}}
          >Send to Kitchen</button>
          <button type="button" className="clear" onClick={() => { if (items.length === 0) return; if (confirm('Clear the cart?')) onClear() }} disabled={items.length===0}>Clear</button>
        </div>
      </div>

      {showCash && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',padding:16,borderRadius:8,width:420,maxWidth:'90%'}}>
            <h3>Cash Payment</h3>
            <div style={{marginBottom:8}}>Total due: <strong>{currency(total)}</strong></div>
            <div style={{display:'flex',gap:8,marginBottom:8}}>
              <input type="number" step="0.01" min="0" placeholder="Amount paid" value={paidAmount} onChange={e=>setPaidAmount(e.target.value)} style={{flex:1,padding:8}} />
              <button type="button" className="product-btn" onClick={() => {
                const paid = parseFloat(paidAmount)
                if (isNaN(paid) || paid <= 0) { alert('Enter valid paid amount') ; return }
                const change = paid - total
                if (change < 0) { alert('Paid amount less than total. Remaining: ' + currency(Math.abs(change))) ; return }
                const breakdown = computeChangeBreakdown(change)
                setChangeBreakdown(breakdown)
              }}>Calc</button>
            </div>

            {changeBreakdown ? (
              <div>
                <div style={{marginBottom:8}}>Change to return: <strong>${(changeBreakdown.totalChangeCents/100).toFixed(2)}</strong></div>
                <div style={{maxHeight:220,overflow:'auto',borderTop:'1px solid #eee',paddingTop:8}}>
                  <table style={{width:'100%',borderCollapse:'collapse'}}>
                    <thead><tr><th style={{textAlign:'left'}}>Denomination</th><th style={{textAlign:'right'}}>Count</th></tr></thead>
                    <tbody>
                      {changeBreakdown.parts.map((p,idx)=> (
                        <tr key={idx}><td style={{padding:'6px 4px'}}>{p.label}</td><td style={{padding:'6px 4px',textAlign:'right'}}>{p.count}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                  <button type="button" className="product-btn" onClick={() => { setShowCash(false); setChangeBreakdown(null); setPaidAmount('') }}>Close</button>
                  <button type="button" className="product-btn" onClick={() => { handlePrint(); setShowCash(false) }}>Print Receipt</button>
                </div>
              </div>
            ) : (
              <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
                <button type="button" className="product-btn" onClick={() => { setShowCash(false); setChangeBreakdown(null); setPaidAmount('') }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showRewardModal && (
        <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
          <div style={{background:'#fff',padding:16,borderRadius:8,width:520,maxWidth:'95%'}}>
            <h3>Redeem Reward</h3>
            <div style={{marginBottom:8}}>Choose a free item to redeem from eligible products.</div>
            <div style={{maxHeight:300,overflow:'auto',borderTop:'1px solid #eee',paddingTop:8}}>
              {products.filter(p => p.rewardEligible).length === 0 ? (
                <div style={{color:'#666'}}>No reward-eligible products are configured.</div>
              ) : (
                products.filter(p => p.rewardEligible).map(p => (
                  <div key={p.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 4px',borderBottom:'1px solid #f6f6f6'}}>
                    <div><strong>{p.name}</strong><div style={{fontSize:13,color:'#666'}}>{currency(p.price)}</div></div>
                    <div>
                      <button className="product-btn" onClick={() => { onApplyReward && onApplyReward(p.id); setShowRewardModal(false) }}>Redeem</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
              <button className="product-btn" onClick={() => setShowRewardModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}