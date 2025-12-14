import React, { useState } from 'react'

export default function ImportExport({ products, addons, onSaveProducts, onSaveAddons, resetDefaults }) {
  const [model, setModel] = useState('products')
  const [preview, setPreview] = useState('')

  function download(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleExport() {
    if (model === 'products') download('products.json', products)
    else download('addons.json', addons)
  }

  function handleFile(e) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      setPreview(reader.result)
    }
    reader.readAsText(f)
  }

  function applyImport() {
    try {
      const parsed = JSON.parse(preview)
      if (model === 'products') onSaveProducts(parsed)
      else onSaveAddons(parsed)
      setPreview('')
      alert('Import applied')
    } catch (err) {
      alert('Invalid JSON: ' + err.message)
    }
  }

  return (
    <div style={{marginTop:12}}>
      <h3>Import / Export</h3>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <select value={model} onChange={e=>setModel(e.target.value)}>
          <option value="products">Products</option>
          <option value="addons">Addons</option>
        </select>
        <button type="button" className="clear" onClick={handleExport}>Export</button>
        <input type="file" accept="application/json,.json" onChange={handleFile} />
      </div>

      {preview && (
        <div style={{marginTop:8}}>
          <div style={{fontSize:13,color:'#333',marginBottom:6}}>Preview</div>
          <textarea style={{width:'100%',height:120}} value={preview} onChange={e=>setPreview(e.target.value)} />
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <button type="button" className="clear" onClick={applyImport}>Apply Import</button>
            <button type="button" className="product-btn" onClick={()=>setPreview('')}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{marginTop:12}}>
        <button type="button" className="product-btn" onClick={resetDefaults}>Reset To Defaults</button>
      </div>
    </div>
  )
}
