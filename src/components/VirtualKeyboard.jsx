import React, { useState } from 'react'

export default function VirtualKeyboard({ mode = 'text', onKey, onBackspace, onEnter, onClose }) {
  const [shift, setShift] = useState(false)
  const textRows = [
    'qwertyuiop'.split(''),
    "asdfghjkl".split(''),
    "zxcvbnm".split('')
  ]

  const nums = ['1','2','3','4','5','6','7','8','9','0']

  function key(k) {
    const ch = shift ? k.toUpperCase() : k
    onKey && onKey(ch)
    if (shift) setShift(false)
  }

  return (
    <div style={{position:'fixed',left:0,right:0,bottom:0,background:'#222',color:'#fff',padding:10,zIndex:9999}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{fontWeight:700}}>Virtual Keyboard ({mode})</div>
        <div>
          <button className="product-btn" onClick={onClose} style={{marginRight:8,color:'#fff'}}>Close</button>
          <button className="product-btn" onClick={onEnter} style={{color:'#fff'}}>Enter</button>
        </div>
      </div>

      {mode !== 'text' && (
        <div style={{display:'flex',gap:6,marginBottom:8,justifyContent:'center'}}>
          {nums.map(n => (<button key={n} className="product-btn" onClick={() => key(n)} style={{minWidth:40,color:'#fff'}}>{n}</button>))}
            <button className="product-btn" onClick={onBackspace} style={{minWidth:80,color:'#fff'}}>Backspace</button>
        </div>
      )}

      {mode !== 'numeric' && (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
            {textRows[0].map(c => (<button key={c} className="product-btn" onClick={() => key(c)} style={{minWidth:40,color:'#fff'}}>{shift ? c.toUpperCase() : c}</button>))}
          </div>
          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
            <button className="product-btn" onClick={() => setShift(s => !s)} style={{minWidth:60,color:'#fff'}}>{shift ? 'Shift↑' : 'shift'}</button>
            {textRows[1].map(c => (<button key={c} className="product-btn" onClick={() => key(c)} style={{minWidth:40,color:'#fff'}}>{shift ? c.toUpperCase() : c}</button>))}
            <button className="product-btn" onClick={() => onBackspace && onBackspace()} style={{minWidth:60,color:'#fff'}}>⌫</button>
          </div>
          <div style={{display:'flex',gap:6,justifyContent:'center'}}>
            {textRows[2].map(c => (<button key={c} className="product-btn" onClick={() => key(c)} style={{minWidth:40,color:'#fff'}}>{shift ? c.toUpperCase() : c}</button>))}
            <button className="product-btn" onClick={() => onKey && onKey(' ')} style={{minWidth:120,color:'#fff'}}>Space</button>
          </div>
        </div>
      )}
    </div>
  )
}
