import { useState, useEffect } from 'react'

export default function useSettings(defaults) {
  const [settings, setSettings] = useState(() => {
    try { const raw = localStorage.getItem('pos_settings'); return raw ? JSON.parse(raw) : (defaults || {}) } catch(e) { return (defaults || {}) }
  })

  const SETTINGS_URL = (window.__ORDERS_SERVER_URL__ || 'http://localhost:4000') + '/settings'

  async function saveSettings(values) {
    setSettings(values)
    try {
      const resp = await fetch(SETTINGS_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) })
      const data = await resp.json()
      if (data && data.ok && data.settings) {
        setSettings(data.settings)
      } else {
        try { localStorage.setItem('pos_settings', JSON.stringify(values)) } catch(e){}
      }
    } catch (err) {
      try { localStorage.setItem('pos_settings', JSON.stringify(values)) } catch(e){}
    }
    try { window.location.hash = '/' } catch(e){}
  }

  useEffect(() => {
    let cancelled = false
    async function loadSettings() {
      try {
        const resp = await fetch(SETTINGS_URL)
        const data = await resp.json()
        if (!cancelled && data && data.ok && data.settings) {
          setSettings(data.settings)
          try { localStorage.setItem('pos_settings', JSON.stringify(data.settings)) } catch(e){}
        }
      } catch (err) {
        console.debug('Could not fetch settings from server, using defaults/localStorage', err)
      }
    }
    loadSettings()
    return () => { cancelled = true }
  }, [])

  return { settings, setSettings, saveSettings }
}
