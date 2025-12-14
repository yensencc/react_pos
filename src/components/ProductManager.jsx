import React, { useState } from 'react';
import Settings from './Settings';

export default function ProductManager({
  products = [],
  addons = [],
  categories = [],
  onSaveProducts,
  onSaveAddons,
  onSaveCategories,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onCreateAddon,
  onUpdateAddon,
  onDeleteAddon,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  settings,
  features,
  onSaveSettings,
  onSaveFeatures,
  initialTab
}) {
  const [localProducts, setLocalProducts] = useState((products || []).map(p => ({ ...p })));
  const [localAddons, setLocalAddons] = useState((addons || []).map(a => ({ ...a })));
  const [localCats, setLocalCats] = useState((categories || []).map(c => ({ ...c })));
  const [tab, setTab] = useState(initialTab || 'products');

  function addProduct() {
    const tempId = 'tmp_' + Date.now().toString(36);
    const newProd = {
      id: tempId,
      name: 'New Product',
      price: 0,
      categoryId: (localCats[0] && localCats[0].id) || null,
      addonIds: [],
      rewardEligible: false
    };
    setLocalProducts(prev => [...prev, newProd]);
    if (typeof onCreateProduct === 'function') {
      (async () => {
        try {
          const created = await onCreateProduct(Object.assign({}, newProd));
          if (created && created.id) {
            setLocalProducts(prev => prev.map(p => (p.id === tempId ? created : p)));
          }
        } catch (e) {
          console.debug('create product failed', e);
        }
      })();
    }
  }

  function addAddon() {
    const tempId = 'tmp_a_' + Date.now().toString(36);
    const newA = { id: tempId, name: 'New Addon', price: 0 };
    setLocalAddons(prev => [...prev, newA]);
    if (typeof onCreateAddon === 'function') {
      (async () => {
        try {
          const created = await onCreateAddon(Object.assign({}, newA));
          if (created && created.id) setLocalAddons(prev => prev.map(a => (a.id === tempId ? created : a)));
        } catch (e) {
          console.debug('create addon failed', e);
        }
      })();
    }
  }

  function removeAddon(id) {
    if (!confirm('Delete this addon?')) return;
    setLocalAddons(prev => prev.filter(a => a.id !== id));
    if (typeof onDeleteAddon === 'function') {
      (async () => {
        try { await onDeleteAddon(id); } catch (e) { console.debug('delete addon failed', e); }
      })();
    }
    setLocalProducts(prev => prev.map(p => ({ ...p, addonIds: (p.addonIds || []).filter(x => x !== id) })));
  }

  function updateProduct(id, patch) {
    setLocalProducts(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  }

  function saveProduct(id) {
    const prod = localProducts.find(p => p.id === id);
    if (!prod) return;
    if (typeof onUpdateProduct === 'function') {
      (async () => {
        try { await onUpdateProduct(id, prod); } catch (e) { console.debug('save product failed', e); }
      })();
    }
  }

  function removeProduct(id) {
    if (!confirm('Delete this product? This action cannot be undone.')) return;
    setLocalProducts(prev => prev.filter(p => p.id !== id));
    if (typeof onDeleteProduct === 'function') {
      (async () => {
        try { await onDeleteProduct(id); } catch (e) { console.debug('delete product failed', e); }
      })();
    }
  }

  function saveAll() {
    try { onSaveProducts && onSaveProducts(localProducts); } catch (e) { /* ignore */ }
    try { onSaveAddons && onSaveAddons(localAddons); } catch (e) { /* ignore */ }
    try { onSaveCategories && onSaveCategories(localCats); } catch (e) { /* ignore */ }
    alert('Saved products, addons and categories');
  }

  function saveSettingsWrapper(payload) {
    try {
      if (payload?.settings && typeof onSaveSettings === 'function') onSaveSettings(payload.settings);
      if (payload?.features && typeof onSaveFeatures === 'function') onSaveFeatures(payload.features);
      alert('Settings saved');
    } catch (e) { console.debug('save settings failed', e); }
  }

  function addCategory() {
    const tempId = 'tmp_c_' + Date.now().toString(36);
    const newC = { id: tempId, name: 'New Category' };
    setLocalCats(prev => [...prev, newC]);
    if (typeof onCreateCategory === 'function') {
      (async () => {
        try {
          const created = await onCreateCategory(Object.assign({}, newC));
          if (created && created.id) setLocalCats(prev => prev.map(c => (c.id === tempId ? created : c)));
        } catch (e) { console.debug('create category failed', e); }
      })();
    }
  }

  function removeCategory(id) {
    if (!confirm('Delete this category? Products using it will keep their categoryId. Continue?')) return;
    setLocalCats(prev => prev.filter(c => c.id !== id));
    if (typeof onDeleteCategory === 'function') {
      (async () => {
        try { await onDeleteCategory(id); } catch (e) { console.debug('delete category failed', e); }
      })();
    }
  }

  function saveAddon(a) {
    if (typeof onUpdateAddon === 'function') {
      (async () => {
        try { await onUpdateAddon(a.id, a); } catch (e) { console.debug('save addon failed', e); }
      })();
    }
  }

  function saveCategory(c) {
    if (typeof onUpdateCategory === 'function') {
      (async () => {
        try { await onUpdateCategory(c.id, c); } catch (e) { console.debug('save category failed', e); }
      })();
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Product Manager</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={'product-btn' + (tab === 'products' ? ' active' : '')} onClick={() => setTab('products')}>Products</button>
          <button className={'product-btn' + (tab === 'addons' ? ' active' : '')} onClick={() => setTab('addons')}>Addons</button>
          <button className={'product-btn' + (tab === 'categories' ? ' active' : '')} onClick={() => setTab('categories')}>Categories</button>
          <button className={'product-btn' + (tab === 'settings' ? ' active' : '')} onClick={() => setTab('settings')}>Settings</button>
          <button className="product-btn" onClick={saveAll}>Save All</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {tab === 'settings' ? (
          <div style={{ flex: 1 }}>
            <Settings settings={settings} features={features} onSave={saveSettingsWrapper} onCancel={() => {}} />
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4>Products</h4>
                <button className="product-btn" onClick={addProduct}>Add Product</button>
              </div>
              <div>
                {localProducts.map(p => (
                  <div key={p.id} style={{ padding: 8, borderBottom: '1px solid #eee', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input value={p.name} onChange={e => updateProduct(p.id, { name: e.target.value })} style={{ flex: 1 }} />
                    <input type="number" value={p.price} onChange={e => updateProduct(p.id, { price: parseFloat(e.target.value || 0) })} style={{ width: 96 }} />
                    <select value={p.categoryId || ''} onChange={e => updateProduct(p.id, { categoryId: e.target.value || null })}>
                      <option value="">No category</option>
                      {localCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input type="checkbox" checked={!!p.rewardEligible} onChange={e => updateProduct(p.id, { rewardEligible: !!e.target.checked })} /> Reward
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 140, overflow: 'auto' }}>
                        {localAddons.map(a => {
                          const selected = Array.isArray(p.addonIds) && p.addonIds.includes(a.id);
                          return (
                            <label key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <input type="checkbox" checked={!!selected} onChange={() => {
                                const nextIds = Array.isArray(p.addonIds)
                                  ? (selected ? p.addonIds.filter(x => x !== a.id) : [...p.addonIds, a.id])
                                  : (selected ? [] : [a.id]);
                                updateProduct(p.id, { addonIds: nextIds });
                              }} />
                              <span style={{ fontSize: 12 }}>{a.name}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="product-btn" onClick={() => removeProduct(p.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h4>Addons</h4>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div></div>
                  <button className="product-btn" onClick={addAddon}>Add Addon</button>
                </div>
                {localAddons.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6, borderBottom: '1px solid #f6f6f6' }}>
                    <input value={a.name} onChange={e => setLocalAddons(prev => prev.map(x => x.id === a.id ? { ...x, name: e.target.value } : x))} style={{ flex: 1 }} />
                    <input type="number" value={a.price} onChange={e => setLocalAddons(prev => prev.map(x => x.id === a.id ? { ...x, price: parseFloat(e.target.value || 0) } : x))} style={{ width: 96 }} />
                    <button className="product-btn" onClick={() => saveAddon(a)}>Save</button>
                    <button className="product-btn" onClick={() => removeAddon(a.id)}>Delete</button>
                  </div>
                ))}
              </div>

              <h4 style={{ marginTop: 12 }}>Categories</h4>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div></div>
                  <button className="product-btn" onClick={addCategory}>Add Category</button>
                </div>
                {localCats.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 6, borderBottom: '1px solid #f6f6f6' }}>
                    <input value={c.name} onChange={e => setLocalCats(prev => prev.map(x => x.id === c.id ? { ...x, name: e.target.value } : x))} style={{ flex: 1 }} />
                    <button className="product-btn" onClick={() => saveCategory(c)}>Save</button>
                    <button className="product-btn" onClick={() => removeCategory(c.id)}>Delete</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}