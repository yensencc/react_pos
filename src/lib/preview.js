import { buildReceiptHtml } from '../components/Receipt'

export async function openPreviewWithEmbeddedLogo(itemsArg, settingsArg, customerArg, productsArg, paymentType) {
  // open popup synchronously to avoid popup blockers
  const popup = window.open('about:blank', '_blank')
  if (!popup) {
    alert('Unable to open preview: your browser blocked popups. Please allow popups for this site.')
    return
  }

  (async () => {
    try {
      let previewSettings = { ...(settingsArg || {}) }
      let logoVal = previewSettings.logo ? ('' + previewSettings.logo).trim() : ''
      if (logoVal && !/^https?:\/\//i.test(logoVal) && !logoVal.startsWith('data:')) {
        if (logoVal.startsWith('public/')) logoVal = '/' + logoVal.slice('public/'.length)
        else if (!logoVal.startsWith('/')) logoVal = '/' + logoVal

        const tryFetchAsDataUrl = async (url) => {
          try {
            const r = await fetch(url, { cache: 'no-store' })
            if (!r) return null
            if (r.status !== 200 && r.status !== 201) return null
            const b = await r.blob()
            return await new Promise((res, rej) => {
              const fr = new FileReader()
              fr.onload = () => res(fr.result)
              fr.onerror = (err) => rej(err)
              fr.readAsDataURL(b)
            })
          } catch (e) {
            return null
          }
        }

        try {
          const bust = (u) => u + (u.includes('?') ? '&' : '?') + '_cb=' + Date.now()
          let dataUrl = await tryFetchAsDataUrl(bust(logoVal))
          if (!dataUrl) {
            const candidates = []
            if (/\.png$/i.test(logoVal)) candidates.push(logoVal.replace(/\.png$/i, '.svg'))
            if (/\.svg$/i.test(logoVal)) candidates.push(logoVal.replace(/\.svg$/i, '.png'))
            if (!/\.[a-zA-Z0-9]+$/.test(logoVal)) { candidates.push(logoVal + '.png'); candidates.push(logoVal + '.svg') }
            for (const c of candidates) {
              dataUrl = await tryFetchAsDataUrl(bust(c))
              if (dataUrl) { logoVal = c; break }
            }
          }
          if (dataUrl) previewSettings.logo = dataUrl
        } catch (e) {}
      }

      const html = buildReceiptHtml(itemsArg, previewSettings, customerArg, productsArg, paymentType)
      if (!html) throw new Error('Failed to build receipt HTML')

      try {
        popup.document.open()
        popup.document.write(html)
        popup.document.close()
        popup.focus()
      } catch (e) {
        try {
          const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)
          popup.location.href = dataUrl
          popup.focus()
        } catch (e2) {
          const blob = new Blob([html], { type: 'text/html' })
          const url = URL.createObjectURL(blob)
          const w2 = window.open(url, '_blank')
          if (!w2) {
            alert('Unable to open preview: your browser blocked popups. Please allow popups for this site.')
            try { URL.revokeObjectURL(url) } catch (e3) {}
            return
          }
          w2.addEventListener('load', () => { try { URL.revokeObjectURL(url) } catch(e){} })
          w2.focus()
        }
      }
    } catch (err) {
      console.error('Preview failed', err)
      alert('Preview failed: ' + (err && err.message ? err.message : err))
    }
  })()
}
