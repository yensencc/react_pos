import React, { useState, useEffect } from 'react'

export default function Settings({ settings, features = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    businessName: settings.businessName || '',
    address: settings.address || '',
    phone: settings.phone || '',
    taxRate: settings.taxRate != null ? settings.taxRate : 8,
    footerNote: settings.footerNote || '',
    logo: settings.logo || ''
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

  useEffect(() => {
    setFlags(buildFlags(features))
  }, [features])

  function update(k, v) { setForm(f => ({ ...f, [k]: v })) }

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
