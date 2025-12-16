import React, { useState, useEffect } from 'react'

export default function Settings({ settings, features = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    businessName: settings.businessName || '',
    address: settings.address || '',
    phone: settings.phone || '',
    taxRate: settings.taxRate != null ? settings.taxRate : 8,
    footerNote: settings.footerNote || '',
    logo: settings.logo || '',
    // optional stripe publishable key for other web flows (Elements). Terminal uses server connection tokens.
    stripePublishableKey: settings.stripePublishableKey || '',
    // optional stripe secret key to allow creating PaymentIntents from the local server.
    // WARNING: this will be persisted to src/data/settings.json. For production prefer setting STRIPE_SECRET_KEY env var.
    stripeSecretKey: settings.stripeSecretKey || ''
  })

  const buildFlags = (f = {}) => ({
    ordersView: f.ordersView === true,
    sendToKitchen: f.sendToKitchen === true,
    serverSave: f.serverSave === true,
    clientSearch: f.clientSearch === true,
    importExport: f.importExport === true,
    rewards: f.rewards === true,
    manageProducts: f.manageProducts === true
  })

  const [flags, setFlags] = useState(buildFlags(features))
  const [showTerminal, setShowTerminal] = useState(false)
  const [StripeComponent, setStripeComponent] = useState(null)
  const [stripeLoadError, setStripeLoadError] = useState(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  // local UI state to indicate a secret was saved (we don't echo it back from server for safety)
  const [secretSaved, setSecretSaved] = useState(false)

  useEffect(() => {
    setFlags(buildFlags(features))
  }, [features])

  useEffect(() => {
    let mounted = true
    async function lazyLoad() {
      if (!showTerminal || StripeComponent || stripeLoading) return
      setStripeLoading(true)
      try {
        const mod = await import('./StripeTerminal')
        if (!mounted) return
        setStripeComponent(() => mod && mod.default ? mod.default : null)
      } catch (err) {
        if (!mounted) return
        setStripeLoadError(err && err.message ? err.message : String(err))
      } finally {
        if (!mounted) return
        setStripeLoading(false)
      }
    }
    lazyLoad()
    return () => { mounted = false }
  }, [showTerminal, StripeComponent, stripeLoading])

  function update(k, v) { 
    setForm(f => ({ ...f, [k]: v }))
    if (k === 'stripeSecretKey') setSecretSaved(false)
  }

  function save() {
    const parsed = { ...form, taxRate: parseFloat(form.taxRate) || 0 }
    // Normalize logo path: accept 'public/...', 'assets/..', '/assets/..' or external URLs
    if (parsed.logo) {
      let logo = ('' + parsed.logo).trim()
      if (logo.startsWith('public/')) logo = '/' + logo.slice('public/'.length)
      else if (logo && !/^https?:\/\//i.test(logo) && !logo.startsWith('/')) logo = '/' + logo
      parsed.logo = logo
    }
    const mergedFeatures = { ...(features || {}), ...flags }
    if (onSave) onSave({ settings: parsed, features: mergedFeatures })
    // For security, clear the secret field from the local form and show a saved indicator
    if (parsed.stripeSecretKey) {
      setForm(f => ({ ...f, stripeSecretKey: '' }))
      setSecretSaved(true)
    }
  }

  function toggleFlag(k) { setFlags(f => ({ ...f, [k]: !f[k] })) }

  return (
    <div className="settings-panel">
      <h3>Business Settings</h3>
      <label>Business Name</label>
      <input value={form.businessName} onChange={e=>update('businessName', e.target.value)} />
      <label>Address</label>
      <input value={form.address} onChange={e=>update('address', e.target.value)} />
      <label>Phone</label>
      <input value={form.phone} onChange={e=>update('phone', e.target.value)} />
      <label>Logo URL / Local Path</label>
      <input placeholder="https://example.com/logo.png or /assets/logo.png" value={form.logo} onChange={e=>update('logo', e.target.value)} />
      <label>Tax Rate (%)</label>
      <input value={form.taxRate} onChange={e=>update('taxRate', e.target.value)} />
      <label>Footer Note</label>
      <input value={form.footerNote} onChange={e=>update('footerNote', e.target.value)} />

      <label>Stripe Publishable Key (pk_...)</label>
      <input placeholder="pk_test_..." value={form.stripePublishableKey} onChange={e=>update('stripePublishableKey', e.target.value)} />

      <label>Stripe Secret Key (sk_...) — stored in settings.json</label>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <input type="password" placeholder="sk_test_..." value={form.stripeSecretKey} onChange={e=>update('stripeSecretKey', e.target.value)} />
        {secretSaved && <div style={{color:'#0a8',fontSize:13}}>Saved</div>}
      </div>
      <div style={{marginTop:6,fontSize:12,color:'#666'}}>Storing secret keys here is convenient for local testing; for production prefer setting <code>STRIPE_SECRET_KEY</code> as an environment variable. The secret is not echoed back by the server for safety.</div>

      <div style={{marginTop:8,display:'flex',gap:8}}>
        <button type="button" className="product-btn" onClick={()=>setShowTerminal(s=>!s)}>{showTerminal ? 'Hide Terminal' : 'Open Terminal'}</button>
        <div style={{alignSelf:'center',fontSize:12,color:'#666'}}>Use publishable key to enable client-side web flows; Terminal uses server connection tokens.</div>
      </div>

      {showTerminal && (
        <div style={{marginTop:12}}>
          {stripeLoading && (<div>Loading Terminal UI...</div>)}
          {stripeLoadError && (
            <div style={{padding:8,background:'#fff4f4',border:'1px solid #f5c2c2',borderRadius:6}}>
              <div style={{fontWeight:700,color:'#a00'}}>Failed to load Stripe Terminal</div>
              <div style={{marginTop:6}}>Error: {stripeLoadError}</div>
              <div style={{marginTop:8}}>If you see a version-related error, ensure `@stripe/terminal-js` is installed (see README).</div>
            </div>
          )}
          {(!stripeLoading && !stripeLoadError && StripeComponent) && (
            <div><StripeComponent /></div>
          )}
        </div>
      )}

      <h4 style={{marginTop:12}}>Feature Toggles</h4>
      <div style={{display:'grid',gap:6}}>
        <label><input type="checkbox" checked={flags.ordersView} onChange={()=>toggleFlag('ordersView')} /> Show Orders view</label>
        <label><input type="checkbox" checked={flags.sendToKitchen} onChange={()=>toggleFlag('sendToKitchen')} /> Enable Send to Kitchen</label>
        <label><input type="checkbox" checked={flags.serverSave} onChange={()=>toggleFlag('serverSave')} /> Try server save</label>
        <label><input type="checkbox" checked={flags.clientSearch} onChange={()=>toggleFlag('clientSearch')} /> Enable client search</label>
        <label><input type="checkbox" checked={flags.importExport} onChange={()=>toggleFlag('importExport')} /> Show Import/Export</label>
        <label><input type="checkbox" checked={flags.rewards} onChange={()=>toggleFlag('rewards')} /> Enable Rewards</label>
        <label><input type="checkbox" checked={flags.manageProducts} onChange={()=>toggleFlag('manageProducts')} /> Enable Manage Products UI</label>
      </div>

      <div style={{marginTop:10,display:'flex',gap:8}}>
        <button type="button" className="clear" onClick={save}>Save</button>
        <button type="button" className="product-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
