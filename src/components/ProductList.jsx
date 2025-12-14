import React from 'react'

export default function ProductList({ products, onAdd, onSelect }) {
  return (
    <div className="product-list">
      {products.map(p => (
        <div key={p.id} style={{display:'flex', gap:8}}>
          <button type="button" className="product-btn" style={{flex:1}} onClick={() => onSelect(p)}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div className="product-name">{p.name}</div>
              {p.rewardEligible && (<div title="Reward eligible" style={{color:'#f5a623',marginLeft:8}}>★</div>)}
            </div>
            <div className="product-price">${p.price.toFixed(2)}</div>
          </button>
          <button type="button" className="product-btn" style={{width:48}} title="Quick add" onClick={() => onAdd(p)}>
            +
          </button>
        </div>
      ))}
    </div>
  )
}
