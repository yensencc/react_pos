import React, { useState } from 'react'

export default function Features({ features = {}, onSave, onCancel }) {
  const [flags, setFlags] = useState({
    ordersView: features.ordersView === true,
    sendToKitchen: features.sendToKitchen === true,
    serverSave: features.serverSave === true,
    clientSearch: features.clientSearch === true,
    importExport: features.importExport === true
  })

  function toggleFlag(k) { setFlags(f => ({ ...f, [k]: !f[k] })) }
  function save() { if (onSave) onSave({ features: flags }) }

  return (
    <div className="settings-panel">
      <h3>Feature Toggles</h3>
      <div style={{display:'grid',gap:6}}>
        <label><input type="checkbox" checked={flags.ordersView} onChange={()=>toggleFlag('ordersView')} /> Show Orders view</label>
        <label><input type="checkbox" checked={flags.sendToKitchen} onChange={()=>toggleFlag('sendToKitchen')} /> Enable Send to Kitchen</label>
        <label><input type="checkbox" checked={flags.serverSave} onChange={()=>toggleFlag('serverSave')} /> Try server save</label>
        <label><input type="checkbox" checked={flags.clientSearch} onChange={()=>toggleFlag('clientSearch')} /> Enable client search</label>
        <label><input type="checkbox" checked={flags.importExport} onChange={()=>toggleFlag('importExport')} /> Show Import/Export</label>
      </div>

      <div style={{marginTop:10,display:'flex',gap:8}}>
        <button type="button" className="clear" onClick={save}>Save</button>
        <button type="button" className="product-btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
