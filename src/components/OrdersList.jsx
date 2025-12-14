import React, { useState, useEffect, useMemo } from 'react'

export default function OrdersList({ orders = [], onClose, onUpdate, settings = {}, onPreviewOrder }) {
  const [openId, setOpenId] = useState(null)
  const [serverOrders, setServerOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchOrders() {
    setLoading(true)
    setError(null)
    try {
      const url = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/orders'
      const res = await fetch(url)
      const data = await res.json()
      if (data && data.ok && Array.isArray(data.orders)) {
        setServerOrders(data.orders)
      } else if (Array.isArray(data)) {
        setServerOrders(data)
      } else {
        setError(data && data.error ? data.error : 'Unexpected response')
      }
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const display = serverOrders && serverOrders.length ? serverOrders : orders

  const [showReport, setShowReport] = useState(false)
  const [reportData, setReportData] = useState(null)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReasonInput, setCancelReasonInput] = useState('')

  function computeReport(ordArr) {
    const list = (ordArr || []).slice()
    const salesCount = list.length
    const totalSales = list.reduce((s,o)=>s + (o.total||0), 0)
    const dates = list.map(o => new Date(o.createdAt)).filter(d => !isNaN(d.getTime())).sort((a,b)=>a-b)
    const startDate = dates.length ? dates[0] : null
    const endDate = dates.length ? dates[dates.length-1] : null
    const productMap = {}
    for (const o of list) {
      for (const it of (o.items||[])) {
        const name = it.name || 'Unknown'
        const qty = it.qty || 0
        const revenue = ((it.price||0) + ((it.addons||[]).reduce((s,a)=>s+(a.price||0),0))) * qty
        if (!productMap[name]) productMap[name] = { qty: 0, revenue: 0 }
        productMap[name].qty += qty
        productMap[name].revenue += revenue
      }
    }
    const products = Object.keys(productMap).map(k=>({ name: k, qty: productMap[k].qty, revenue: productMap[k].revenue }))
    products.sort((a,b)=>b.qty - a.qty)
    return { salesCount, totalSales, startDate, endDate, products }
  }

  function openReportPreview() {
    const rpt = computeReport(display)
    setReportData(rpt)
    setShowReport(true)
  }

  function buildReportHtml(rpt) {
    const rows = rpt.products.map(p => `<tr><td>${p.name}</td><td style="text-align:right">${p.qty}</td><td style="text-align:right">$${p.revenue.toFixed(2)}</td></tr>`).join('')
    const start = rpt.startDate ? new Date(rpt.startDate).toLocaleString() : 'N/A'
    const end = rpt.endDate ? new Date(rpt.endDate).toLocaleString() : 'N/A'
    const chartSvg = (() => {
      const total = rpt.products.reduce((s,p)=>s+p.qty,0) || 1
      let angle = -90
      const w = 300, h = 300, cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 10
      const slices = rpt.products.map((p,idx)=>{
        const frac = p.qty/total
        const start = angle
        const end = angle + frac*360
        angle = end
        const large = end - start > 180 ? 1 : 0
        const startRad = (Math.PI/180) * start
        const endRad = (Math.PI/180) * end
        const x1 = cx + r * Math.cos(startRad)
        const y1 = cy + r * Math.sin(startRad)
        const x2 = cx + r * Math.cos(endRad)
        const y2 = cy + r * Math.sin(endRad)
        const color = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'][idx % 10]
        return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z" fill="${color}" stroke="#fff" stroke-width="1" />`
      }).join('')
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">${slices}</svg>`
    })()

    return `<!doctype html><html><head><meta charset="utf-8"><title>Sales Report</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #eee}</style></head><body><h2>Sales Report</h2><div>Total sales: <strong>$${rpt.totalSales.toFixed(2)}</strong></div><div>Number of orders: <strong>${rpt.salesCount}</strong></div><div>Date range: <strong>${start} — ${end}</strong></div><h3 style="margin-top:12px">Product breakdown</h3><div style="display:flex;gap:20px;align-items:flex-start"><div style="flex:1"><table><thead><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${rows}</tbody></table></div><div style="width:320px">${chartSvg}</div></div><div style="margin-top:12px"><button onclick="window.print()">Print</button></div></body></html>`
  }

  function openReportInWindow() {
    const rpt = reportData || computeReport(display)
    const html = buildReportHtml(rpt)
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (!w) {
      const w2 = window.open('', '_blank', 'noopener,noreferrer')
      if (!w2) { alert('Unable to open report: popup blocked') ; URL.revokeObjectURL(url); return }
      w2.document.write(html)
      w2.document.close()
      w2.focus()
      return
    }
    w.addEventListener('load', () => { try { URL.revokeObjectURL(url) } catch(e){} })
    w.focus()
  }

  function buildReceiptHtmlFromOrder(o) {
    try {
      const rows = (o.items || []).map(i => {
        const addonsText = (i.addons || []).map(a => `${a.name} (${(a.price||0).toFixed(2)})`).join('<br/>')
        const lineTotal = ((i.price || 0) + (i.addons || []).reduce((s,a)=>s+(a.price||0),0)) * i.qty
        return `<div style="margin-bottom:8px"><div style="font-weight:600">${i.name} x${i.qty} — $${lineTotal.toFixed(2)}</div>${addonsText ? `<div style="margin-left:8px;font-size:13px;color:#444">${addonsText}</div>` : ''}</div>`
      }).join('')
      const customerHtml = o.customer ? `<div style="margin-bottom:8px"><strong>Customer: ${o.customer.name}</strong><div style="font-size:13px;color:#444">${o.customer.phone || ''}${o.customer.city ? ' — ' + o.customer.city : ''}</div></div>` : ''

      const businessHtml = `<div style="margin-bottom:12px"><div style="font-weight:700;font-size:18px">${settings.businessName || ''}</div><div style="font-size:13px;color:#444">${settings.address || ''}</div>${settings.phone ? `<div style="font-size:13px;color:#444">Phone: ${settings.phone}</div>` : ''}</div>`

      const footerHtml = settings.footerNote ? `<div style="margin-top:12px;font-size:13px;color:#666">${settings.footerNote}</div>` : ''

      // include logo from settings when available (constrain height to avoid large gaps)
      let logoSrc = settings && settings.logo ? ('' + settings.logo).trim() : ''
      if (logoSrc.startsWith('public/')) logoSrc = '/' + logoSrc.slice('public/'.length)
      else if (logoSrc && !/^https?:\/\//i.test(logoSrc) && !logoSrc.startsWith('/') && !logoSrc.startsWith('data:') && !logoSrc.startsWith('blob:')) logoSrc = '/' + logoSrc
      const logoHtml = logoSrc ? `<div style="margin-bottom:4px;text-align:center"><img src="${logoSrc}" alt="Logo" style="max-width:72mm;max-height:20mm;width:auto;height:auto;margin-bottom:2px;display:block;margin-left:auto;margin-right:auto;object-fit:contain" /></div>` : ''

      const taxRate = o.taxRate != null ? o.taxRate : (settings.taxRate != null ? settings.taxRate : 8)

      const feeLine = (o && o.paymentFee) ? `<div style="display:flex;justify-content:space-between"><strong>Card Fee (${(o.paymentFeePercent||0)}%)</strong><span>$${(o.paymentFee||0).toFixed(2)}</span></div>` : ''
      const grandLine = (o && o.totalWithFee) ? `<div style="display:flex;justify-content:space-between"><strong>Grand Total</strong><span>$${(o.totalWithFee||0).toFixed(2)}</span></div>` : ''

      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h2{margin-top:2mm;margin-bottom:4px}.totals{margin-top:12px;border-top:1px solid #ddd;padding-top:8px}.print-btn{display:inline-block;margin-bottom:12px;padding:8px 12px;border-radius:6px;background:#0b74de;color:#fff;border:none;cursor:pointer}</style></head><body><button class="print-btn" onclick="window.print()">Print</button>${logoHtml}${businessHtml}${customerHtml}<h2>Receipt</h2>${rows}<div class="totals"><div style="display:flex;justify-content:space-between"><strong>Subtotal</strong><span>$${(o.subtotal||0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between"><strong>Tax (${taxRate}%)</strong><span>$${(o.tax||0).toFixed(2)}</span></div><div style="display:flex;justify-content:space-between"><strong>Total</strong><span>$${(o.total||0).toFixed(2)}</span></div>${feeLine}${grandLine}</div>${footerHtml}</body></html>`

      return html
    } catch (err) {
      console.error('buildReceiptHtmlFromOrder failed', err)
      return null
    }
  }

  function previewOrderReceipt(o) {
    // Prefer the shared preview helper when provided by the parent App
    try {
      if (typeof onPreviewOrder === 'function') {
        try {
          const res = onPreviewOrder(o.items || [], settings || {}, o.customer || null, [], o.paymentType)
          if (res && typeof res.catch === 'function') res.catch(err => console.debug('onPreviewOrder helper failed', err))
        } catch (err) {
          // If helper throws synchronously, fall back to local preview
          console.debug('onPreviewOrder helper failed, falling back to local preview', err)
        }
        return
      }
    } catch (e) {}

    const html = buildReceiptHtmlFromOrder(o)
    if (!html) { alert('Unable to build receipt preview') ; return }
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const w = window.open(url, '_blank')
    if (!w) {
      const w2 = window.open('', '_blank', 'noopener,noreferrer')
      if (!w2) { alert('Unable to open preview: popup blocked'); URL.revokeObjectURL(url); return }
      w2.document.write(html)
      w2.document.close()
      w2.focus()
      return
    }
    w.addEventListener('load', () => { try { URL.revokeObjectURL(url) } catch(e){} })
    w.focus()
  }

  async function applyCancelToOrder(id, canceled, reason) {
    setLoading(true)
    setError(null)
    const serverBase = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000')
    const url = `${serverBase}/orders/${id}`
    const payload = { canceled: !!canceled, cancelReason: reason || '' }
    try {
      const resp = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await resp.json()
      if (data && data.ok && data.order) {
        const updated = data.order
        const next = (serverOrders && serverOrders.length ? serverOrders.slice() : (orders || []).slice()).map(o => String(o.id) === String(id) ? updated : o)
        setServerOrders(next)
        try { localStorage.setItem('pos_orders', JSON.stringify(next)) } catch (e) {}
        return
      }
      // if server returned non-ok, fallthrough to local update
    } catch (err) {
      // network error — we'll update local copy only
      console.debug('Could not patch order on server, updating locally', err)
    } finally {
      setLoading(false)
    }

    // Local-only update: modify either serverOrders state or the provided orders prop
    const base = (serverOrders && serverOrders.length) ? serverOrders.slice() : (orders || []).slice()
    const next = base.map(o => {
      if (String(o.id) !== String(id)) return o
      const copy = { ...(o || {}) }
      copy.canceled = !!canceled
      copy.cancelReason = reason || ''
      copy.updatedAt = new Date().toISOString()
      return copy
    })
    setServerOrders(next)
    try { localStorage.setItem('pos_orders', JSON.stringify(next)) } catch (e) {}
  }

  function renderPieSvg(rpt, size = 240) {
    const total = (rpt.products || []).reduce((s,p)=>s+p.qty,0) || 1
    let angle = -90
    const w = size, h = size, cx = w/2, cy = h/2, r = Math.min(w,h)/2 - 10
    const colors = ['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf']
    const paths = (rpt.products || []).map((p, idx) => {
      const frac = p.qty / total
      const start = angle
      const end = angle + frac*360
      angle = end
      const large = end - start > 180 ? 1 : 0
      const startRad = (Math.PI/180) * start
      const endRad = (Math.PI/180) * end
      const x1 = cx + r * Math.cos(startRad)
      const y1 = cy + r * Math.sin(startRad)
      const x2 = cx + r * Math.cos(endRad)
      const y2 = cy + r * Math.sin(endRad)
      const color = colors[idx % colors.length]
      return (<path key={idx} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} stroke="#fff" strokeWidth="1" />)
    })
    return (<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>{paths}</svg>)
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <h3>Orders</h3>
        <div>
          <button type="button" className="product-btn" onClick={onClose}>Back</button>
          <button type="button" className="product-btn" onClick={fetchOrders} style={{marginLeft:8}}>Refresh</button>
          <button type="button" className="product-btn" onClick={openReportPreview} style={{marginLeft:8}}>Generate Report</button>
        </div>
      </div>

      {loading && <div style={{color:'#666'}}>Loading orders...</div>}
      {error && <div style={{color:'crimson'}}>Error fetching orders: {error}</div>}

      {(!loading && display.length === 0) ? (
        <div style={{color:'#666'}}>No orders yet.</div>
      ) : (
        <div style={{display:'grid',gap:8}}>
          {display.slice().reverse().map(o => (
            <div key={o.id} style={{border:'1px solid #eee',padding:8,borderRadius:6}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>

                {showReport && reportData && (
                  <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
                    <div style={{background:'#fff',padding:16,borderRadius:8,width:'90%',maxWidth:900,maxHeight:'90%',overflow:'auto'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                        <h3>Sales Report Preview</h3>
                        <div>
                          <button type="button" className="product-btn" onClick={() => { setShowReport(false); setReportData(null) }} style={{marginRight:8}}>Close</button>
                          <button type="button" className="product-btn" onClick={openReportInWindow}>Open in New Tab / Print</button>
                        </div>
                      </div>

                      <div style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                        <div style={{flex:1}}>
                          <div><strong>Total sales:</strong> ${reportData.totalSales.toFixed(2)}</div>
                          <div><strong>Orders:</strong> {reportData.salesCount}</div>
                          <div><strong>Date range:</strong> {reportData.startDate ? new Date(reportData.startDate).toLocaleString() : 'N/A'} — {reportData.endDate ? new Date(reportData.endDate).toLocaleString() : 'N/A'}</div>

                          <h4 style={{marginTop:12}}>Product breakdown</h4>
                          <div style={{maxHeight:280,overflow:'auto'}}>
                            <table style={{width:'100%',borderCollapse:'collapse'}}>
                              <thead><tr><th style={{textAlign:'left'}}>Product</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Revenue</th></tr></thead>
                              <tbody>
                                {reportData.products.map((p, idx) => (
                                  <tr key={idx}><td style={{padding:'6px 4px'}}>{p.name}</td><td style={{padding:'6px 4px',textAlign:'right'}}>{p.qty}</td><td style={{padding:'6px 4px',textAlign:'right'}}>${p.revenue.toFixed(2)}</td></tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div style={{width:340,textAlign:'center'}}>
                          <h4>Product Volume</h4>
                          <div style={{display:'flex',justifyContent:'center',alignItems:'center'}}>
                            {renderPieSvg(reportData, 260)}
                          </div>
                          <div style={{marginTop:8,textAlign:'left'}}>
                            {reportData.products.map((p, idx) => (
                              <div key={idx} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                                <div style={{width:12,height:12,background:['#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd','#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf'][idx%10]}} />
                                <div style={{fontSize:13}}>{p.name} — {p.qty}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                  <div style={{fontWeight:700}}>{o.id}</div>
                  <div style={{fontSize:12,color:'#666'}}>{new Date(o.createdAt).toLocaleString()}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700}}>${(o.total||0).toFixed(2)}</div>
                  <div style={{fontSize:12,color:'#666'}}>{o.status}</div>
                </div>
              </div>

              <div style={{marginTop:8}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8}}>
                  <div style={{fontSize:13}}>{o.customer ? `${o.customer.name} — ${o.customer.phone}` : 'Walk-in'}</div>
                  <div>
                    <button type="button" className="product-btn" onClick={() => setOpenId(openId === o.id ? null : o.id)}>{openId === o.id ? 'Hide' : 'View'}</button>
                    <button type="button" className="product-btn" onClick={() => previewOrderReceipt(o)} style={{marginLeft:8}}>Preview Receipt</button>
                    {!o.canceled ? (
                      <button type="button" className="product-btn" onClick={() => { setCancelTarget(o); setCancelReasonInput(''); setCancelModalOpen(true) }} style={{marginLeft:8,background:'#e03'}}>Cancel</button>
                    ) : (
                      <span style={{marginLeft:8,display:'inline-flex',alignItems:'center',gap:8}}>
                        <span style={{color:'#a00',fontWeight:700}}>Canceled</span>
                        <span style={{fontSize:12,color:'#444'}}>{o.cancelReason ? `— ${o.cancelReason}` : ''}</span>
                        <button type="button" className="product-btn" onClick={() => applyCancelToOrder(o.id, false, '')} style={{marginLeft:8}}>Undo</button>
                      </span>
                    )}
                    {onUpdate && <button type="button" className="product-btn" onClick={() => onUpdate(o)} style={{marginLeft:8}}>Update</button>}
                  </div>
                </div>
                {cancelModalOpen && cancelTarget && (
                  <div style={{position:'fixed',left:0,top:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}}>
                    <div style={{background:'#fff',padding:16,borderRadius:8,width:'90%',maxWidth:520}}>
                      <h3>Cancel Order {cancelTarget.id}</h3>
                      <div style={{marginTop:8}}>
                        <label style={{fontSize:13,fontWeight:600}}>Reason (optional)</label>
                        <textarea value={cancelReasonInput} onChange={e=>setCancelReasonInput(e.target.value)} style={{width:'100%',minHeight:80,marginTop:6}} />
                      </div>
                      <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:12}}>
                        <button type="button" className="product-btn" onClick={() => { setCancelModalOpen(false); setCancelTarget(null); setCancelReasonInput('') }}>Close</button>
                        <button type="button" className="product-btn" onClick={() => { applyCancelToOrder(cancelTarget.id, true, cancelReasonInput); setCancelModalOpen(false); setCancelTarget(null); setCancelReasonInput('') }} style={{background:'#e03'}}>Confirm Cancel</button>
                      </div>
                    </div>
                  </div>
                )}
                {openId === o.id && (
                  <div style={{marginTop:8}}>
                    {o.items.map(it => (
                      <div key={it.lineId} style={{fontSize:13,marginBottom:6}}>
                        <div style={{fontWeight:600}}>{it.name} x{it.qty} — ${( (it.price||0) + ((it.addons||[]).reduce((s,a)=>s+(a.price||0),0)) ) * it.qty}</div>
                        {(it.addons||[]).length > 0 && (
                          <div style={{fontSize:13,color:'#555',marginLeft:8}}>
                            {(it.addons||[]).map(a => (<div key={a.id}>- {a.name} (${(a.price||0).toFixed(2)})</div>))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{borderTop:'1px solid #eee',paddingTop:8,marginTop:6}}>
                      <div style={{display:'flex',justifyContent:'space-between'}}><strong>Subtotal</strong><span>${(o.subtotal||0).toFixed(2)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between'}}><strong>Tax</strong><span>${(o.tax||0).toFixed(2)}</span></div>
                      <div style={{display:'flex',justifyContent:'space-between'}}><strong>Total</strong><span>${(o.total||0).toFixed(2)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
