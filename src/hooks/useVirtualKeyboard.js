import { useState } from 'react'

export function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '')
}

export function formatPhoneForInput(raw) {
  if (!raw) return ''
  const s = String(raw)
  const leadingPlus = s.trim().startsWith('+') ? '+' : ''
  const digits = s.replace(/\D/g, '')
  if (digits.length <= 3) return leadingPlus + digits
  if (digits.length <= 6) return leadingPlus + digits.slice(0,3) + '-' + digits.slice(3)
  if (digits.length <= 10) return leadingPlus + digits.slice(0,3) + '-' + digits.slice(3,6) + '-' + digits.slice(6)
  const extra = digits.slice(0, digits.length - 10)
  const last10 = digits.slice(-10)
  return leadingPlus + extra + (extra ? '-' : '') + last10.slice(0,3) + '-' + last10.slice(3,6) + '-' + last10.slice(6)
}

export default function useVirtualKeyboard() {
  const [keyboardTarget, setKeyboardTarget] = useState(null)

  function attachKeyboard(name, el, setter, mode = 'text') {
    if (!el) return
    setKeyboardTarget({ name, el, setter, mode })
  }

  function detachKeyboard() { setKeyboardTarget(null) }

  function findPosForDigitCount(formatted, digitsCount) {
    let count = 0
    for (let i = 0; i < formatted.length; i++) {
      if (/[0-9]/.test(formatted[i])) {
        count++
        if (count === digitsCount) return i + 1
      }
    }
    return formatted.length
  }

  function vk_onKey(ch) {
    if (!keyboardTarget) return
    const { el, setter, name, mode } = keyboardTarget
    const val = el.value || ''
    const start = el.selectionStart == null ? val.length : el.selectionStart
    const end = el.selectionEnd == null ? start : el.selectionEnd

    if (mode === 'numeric' || name === 'phone' || name === 'search') {
      const before = val.slice(0, start)
      const after = val.slice(end)
      const combined = before + ch + after
      const digits = combined.replace(/\D/g, '')
      const formatted = formatPhoneForInput(digits)
      setter(formatted)
      const digitsBefore = (before.replace(/\D/g, '')).length + (/\d/.test(ch) ? 1 : 0)
      setTimeout(() => {
        try {
          const pos = findPosForDigitCount(formatted, digitsBefore)
          el.setSelectionRange(pos, pos)
        } catch (e) {}
      }, 0)
      return
    }

    const newVal = val.slice(0, start) + ch + val.slice(end)
    setter(newVal)
    setTimeout(() => { try { const pos = start + ch.length; el.setSelectionRange(pos, pos) } catch (e) {} }, 0)
  }

  function vk_backspace() {
    if (!keyboardTarget) return
    const { el, setter, name, mode } = keyboardTarget
    const val = el.value || ''
    let start = el.selectionStart == null ? val.length : el.selectionStart
    let end = el.selectionEnd == null ? start : el.selectionEnd

    if (start === end) {
      if (start === 0) return
      start = start - 1
    }

    if (mode === 'numeric' || name === 'phone' || name === 'search') {
      const before = val.slice(0, start)
      const after = val.slice(end)
      const combined = before + after
      const digits = combined.replace(/\D/g, '')
      const formatted = formatPhoneForInput(digits)
      setter(formatted)
      const digitsBefore = (before.replace(/\D/g, '')).length
      setTimeout(() => { try { const pos = findPosForDigitCount(formatted, digitsBefore); el.setSelectionRange(pos, pos) } catch (e) {} }, 0)
      return
    }

    const newVal = val.slice(0, start) + val.slice(end)
    setter(newVal)
    setTimeout(() => { try { el.setSelectionRange(start, start) } catch (e) {} }, 0)
  }

  function vk_enter() { detachKeyboard() }

  return { keyboardTarget, attachKeyboard, detachKeyboard, vk_onKey, vk_backspace, vk_enter, normalizePhone, formatPhoneForInput }
}
