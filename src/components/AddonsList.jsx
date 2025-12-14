import React from 'react'

export default function AddonsList({ addons, selected = [], onToggle }) {
  console.debug('AddonsList props', { addons, selected })
  return (
    <div className="addons-list">
      {addons.map(a => {
        if (!a) return null
        const active = Array.isArray(selected) && selected.includes(a.id)
        return (
          <button type="button"
            key={a.id}
            className={`product-btn ${active ? 'active' : ''}`}
            onClick={() => onToggle && onToggle(a.id)}
            style={{display:'flex',justifyContent:'space-between'}}
          >
            <div>{a.name}</div>
            <div>{typeof a.price === 'number' ? `$${a.price.toFixed(2)}` : '-'}</div>
          </button>
        )
      })}
    </div>
  )
}
