import React from 'react'

export default function CategoryList({ categories, onSelect }) {
  return (
    <div className="category-list">
      {categories.map(c => (
        <button type="button" key={c.id} className="product-btn" onClick={() => onSelect(c)} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontWeight:600}}>{c.name}</div>
          <div style={{opacity:0.7}}>View</div>
        </button>
      ))}
    </div>
  )
}
