import React, { useEffect, useState } from 'react'

// Minimal Stripe Terminal integration for Web using @stripe/terminal-js
// This component initializes the Terminal SDK, discovers readers (USB), connects to a reader,
// creates PaymentIntents via your server, and demonstrates the collect/process flow.
// Note: This is a starting point — follow Stripe Terminal docs and adjust discovery/connect options
// to match your reader model and environment (HTTPS, compatible reader, etc.).

export default function StripeTerminal({}) {
  const [terminal, setTerminal] = useState(null)
  const [readers, setReaders] = useState([])
  const [connectedReader, setConnectedReader] = useState(null)
  const [status, setStatus] = useState('Not initialized')
  const [logs, setLogs] = useState([])

  useEffect(() => {
    let mounted = true
    async function init() {
      setStatus('Loading Terminal SDK...')
      try {
        const mod = await import('@stripe/terminal-js')
        const { createTerminal } = mod
        const term = createTerminal({
          onFetchConnectionToken: async () => {
            const resp = await fetch('/stripe/connection_token', { method: 'POST' })
            const data = await resp.json()
            return data.secret
          },
          onUnexpectedReaderDisconnect: () => {
            addLog('Reader disconnected unexpectedly')
            setConnectedReader(null)
            setStatus('Reader disconnected')
          }
        })
        if (!mounted) return
        setTerminal(term)
        setStatus('Terminal initialized')
        addLog('Terminal initialized')
      } catch (err) {
        setStatus('Failed to load Terminal SDK: ' + err.message)
        addLog('Terminal load error: ' + err.message)
      }
    }
    init()
    return () => { mounted = false }
  }, [])

  function addLog(msg) { setLogs(l => [...l, `${new Date().toISOString()} - ${msg}`]) }

  async function discoverReaders() {
    if (!terminal) return setStatus('Terminal not ready')
    setStatus('Discovering readers...')
    try {
      // discovery options vary by reader and environment; see Stripe docs
      const discovery = await terminal.discoverReaders({ simulated: false })
      // discovery may return different shapes depending on SDK version
      const found = discovery && (discovery.discoveredReaders || discovery.readers || discovery)
      setReaders(found || [])
      setStatus(`Discovered ${ (found && found.length) || 0 } readers`)
      addLog(`Discovered ${ (found && found.length) || 0 } readers`)
    } catch (err) {
      setStatus('Discovery failed: ' + err.message)
      addLog('Discovery failed: ' + err.message)
    }
  }

  async function connectReader(reader) {
    if (!terminal) return setStatus('Terminal not ready')
    setStatus('Connecting to reader...')
    try {
      const conn = await terminal.connectReader(reader)
      setConnectedReader(conn)
      setStatus('Connected to ' + (conn.label || conn.id || conn.serial_number || 'reader'))
      addLog('Connected to reader ' + (conn.label || conn.id || conn.serial_number || 'reader'))
    } catch (err) {
      setStatus('Connect failed: ' + err.message)
      addLog('Connect failed: ' + err.message)
    }
  }

  async function disconnectReader() {
    if (!terminal || !connectedReader) return
    try {
      await terminal.disconnectReader()
      addLog('Disconnected reader')
      setConnectedReader(null)
      setStatus('Reader disconnected')
    } catch (err) {
      setStatus('Disconnect failed: ' + err.message)
      addLog('Disconnect failed: ' + err.message)
    }
  }

  async function createPaymentIntent(amountCents) {
    try {
      const resp = await fetch('/stripe/create_payment_intent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountCents, currency: 'usd' })
      })
      const data = await resp.json()
      if (!data || !data.ok) throw new Error(data && data.error ? data.error : 'no response')
      addLog('Created PaymentIntent ' + data.id)
      return data
    } catch (err) {
      addLog('Create PI error: ' + err.message)
      setStatus('Create PI error: ' + err.message)
      return null
    }
  }

  async function takePaymentFlow() {
    if (!terminal || !connectedReader) return setStatus('Terminal or reader not ready')
    const amount = parseInt(prompt('Enter amount in cents (e.g., 1000 = $10.00)'), 10)
    if (!amount || isNaN(amount)) return
    setStatus('Creating PaymentIntent...')
    const pi = await createPaymentIntent(amount)
    if (!pi) return

    try {
      setStatus('Collecting payment method...')
      // The next steps depend on SDK version. Typical flow: collectPaymentMethod then processPayment.
      const collected = await terminal.collectPaymentMethod(pi)
      if (collected.error) {
        setStatus('Collect failed: ' + collected.error.message)
        addLog('Collect failed: ' + collected.error.message)
        return
      }
      setStatus('Processing payment...')
      const processed = await terminal.processPayment(collected.paymentIntent || collected)
      if (processed.error) {
        setStatus('Process failed: ' + processed.error.message)
        addLog('Process failed: ' + processed.error.message)
        return
      }
      setStatus('Payment processed: ' + (processed.paymentIntent ? processed.paymentIntent.status : 'succeeded'))
      addLog('Payment processed: ' + (processed.paymentIntent ? processed.paymentIntent.id : 'unknown'))
    } catch (err) {
      setStatus('Payment flow error: ' + err.message)
      addLog('Payment flow error: ' + err.message)
    }
  }

  return (
    <div style={{padding:8,border:'1px solid #eee',borderRadius:6}}>
      <h4>Stripe Terminal</h4>
      <div style={{marginBottom:8}}><strong>Status:</strong> {status}</div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" className="product-btn" onClick={discoverReaders}>Discover readers</button>
        <button type="button" className="product-btn" onClick={takePaymentFlow} disabled={!connectedReader}>Take payment</button>
        <button type="button" className="clear" onClick={disconnectReader} disabled={!connectedReader}>Disconnect</button>
      </div>

      <div style={{marginTop:10}}>
        <strong>Readers</strong>
        <ul>
          {readers && readers.length ? readers.map(r => (
            <li key={r.id || r.serial_number || JSON.stringify(r)} style={{marginBottom:6}}>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1}}>{r.label || r.id || r.serial_number || JSON.stringify(r)}</div>
                <div><button type="button" className="product-btn" onClick={() => connectReader(r)}>Connect</button></div>
              </div>
            </li>
          )) : <li>No readers found</li>}
        </ul>
      </div>

      <div style={{marginTop:10}}>
        <strong>Activity log</strong>
        <div style={{maxHeight:160,overflow:'auto',background:'#fafafa',padding:8,border:'1px solid #eee'}}>
          {logs.map((l,i)=>(<div key={i} style={{fontSize:12}}>{l}</div>))}
        </div>
      </div>
      <div style={{marginTop:8,fontSize:12,color:'#666'}}>Note: Make sure you run the app on HTTPS and use a Stripe-compatible USB reader for web Terminal.</div>
    </div>
  )
}
