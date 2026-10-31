import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountApi, txnApi } from '../api'
import { errorMessage } from '../api/client'
import { ErrorBox, Field, Loading, Modal, PageHeader, Receipt } from '../components/ui'
import { useLoad } from '../hooks'
import { dt, fmt, fmt0 } from '../utils'

export default function Transfer() {
  const navigate = useNavigate()
  const { data, loading, error, reload } = useLoad(() =>
    Promise.all([accountApi.mine(), txnApi.history({ type: 'TRANSFER_OUT', size: 5 })])
      .then(([accounts, recent]) => ({ accounts, recent: recent.content })), [])
  const active = data?.accounts.filter((a) => a.status === 'ACTIVE') || []

  const [form, setForm] = useState({ fromAccountNo: '', toAccountNo: '', amount: '', mode: 'IMPS', remark: '' })
  const [ben, setBen] = useState(null) // { ok, text }
  const [err, setErr] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [pin, setPin] = useState('')
  const [pinErr, setPinErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const from = form.fromAccountNo || active[0]?.accountNo || ''

  // Look up the beneficiary name as soon as a full account number is typed
  useEffect(() => {
    const no = form.toAccountNo.trim().toUpperCase()
    if (no.length < 10) { setBen(null); return }
    let cancelled = false
    accountApi.lookup(no)
      .then((b) => !cancelled && setBen(b.canReceive
        ? { ok: true, text: `✓ ${b.holderName} · ${b.type} · ${b.branch}` }
        : { ok: false, text: `✕ ${b.holderName} — account is not active` }))
      .catch(() => !cancelled && setBen({ ok: false, text: '✕ Account not found' }))
    return () => { cancelled = true }
  }, [form.toAccountNo])

  const review = (e) => {
    e.preventDefault()
    setErr('')
    if (from === form.toAccountNo.trim().toUpperCase()) return setErr('Source and destination cannot be the same')
    if (!ben?.ok) return setErr('Enter a valid beneficiary account')
    setPin(''); setPinErr(''); setConfirm(true)
  }

  const send = async () => {
    setBusy(true); setPinErr('')
    try {
      const r = await txnApi.transfer({ ...form, fromAccountNo: from, toAccountNo: form.toAccountNo.trim().toUpperCase(), amount: Number(form.amount), pin })
      setConfirm(false)
      setReceipt(r)
      setForm({ ...form, toAccountNo: '', amount: '', remark: '' })
      reload()
    } catch (ex) {
      if (ex.response?.data?.code === 'INVALID_PIN') setPinErr('Incorrect PIN')
      else { setConfirm(false); setErr(errorMessage(ex)) }
    } finally { setBusy(false) }
  }

  const saved = [
    ...active.filter((a) => a.accountNo !== from).map((a) => ({ no: a.accountNo, name: `Own · ${a.type}` })),
  ]

  return (
    <>
      <PageHeader title="Money Transfer" sub="Send money instantly to any NovaBank account"
        apis={['GET /api/accounts/lookup/{no}', 'POST /api/transactions/transfer']} />
      <section className="content">
        {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : (
          <div className="grid g3-2">
            <div className="card">
              <form onSubmit={review}>
                <Field label="From account">
                  <select value={from} onChange={(e) => setForm({ ...form, fromAccountNo: e.target.value })}>
                    {active.map((a) => <option key={a.accountNo} value={a.accountNo}>{a.type} · {a.accountNo} · {fmt(a.balance)}</option>)}
                  </select>
                </Field>
                <Field label="To account number">
                  <input className="mono" style={{ fontSize: 14 }} required placeholder="NB1XXXXXXX" value={form.toAccountNo}
                    onChange={(e) => setForm({ ...form, toAccountNo: e.target.value })} />
                  {ben && <div className={ben.ok ? 'ben-ok' : 'ben-bad'}>{ben.text}</div>}
                </Field>
                {saved.length > 0 && (
                  <div className="chips" style={{ margin: '-6px 0 14px' }}>
                    <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>My accounts:</span>
                    {saved.map((b) => <button type="button" key={b.no} className="chip" onClick={() => setForm({ ...form, toAccountNo: b.no })}>{b.name}</button>)}
                  </div>
                )}
                <div className="row2">
                  <Field label="Amount (₹)">
                    <input type="number" min="1" step="0.01" required placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </Field>
                  <Field label="Transfer mode">
                    <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                      <option value="IMPS">IMPS — instant, up to ₹5L</option>
                      <option value="NEFT">NEFT — no limit</option>
                      <option value="RTGS">RTGS — ₹2L and above</option>
                      <option value="UPI">UPI — up to ₹1L</option>
                    </select>
                  </Field>
                </div>
                <Field label="Remark"><input maxLength={60} placeholder="e.g. Rent for November" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
                <ErrorBox msg={err} />
                <button className="btn btn-primary btn-block" disabled={!active.length}>Continue →</button>
              </form>
            </div>
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 6 }}>Transfer limits</h3>
                <ul className="info-list">
                  <li><b style={{ width: 60 }}>UPI</b> ₹1 – ₹1,00,000</li>
                  <li><b style={{ width: 60 }}>IMPS</b> ₹1 – ₹5,00,000</li>
                  <li><b style={{ width: 60 }}>NEFT</b> No upper limit</li>
                  <li><b style={{ width: 60 }}>RTGS</b> Minimum ₹2,00,000</li>
                </ul>
              </div>
              <div className="card">
                <h3 style={{ marginBottom: 10 }}>Recent transfers</h3>
                {data.recent.length ? data.recent.map((t) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
                    <div><b style={{ fontSize: 13 }}>{t.description}</b><div className="help" style={{ margin: 0 }}>{dt(t.createdAt)} · {t.mode}</div></div>
                    <span className="amt-dr">− {fmt0(t.amount)}</span>
                  </div>
                )) : <div className="muted">No transfers yet</div>}
              </div>
            </div>
          </div>
        )}
      </section>

      {confirm && (
        <Modal title="Confirm transfer" onClose={() => setConfirm(false)}>
          <dl className="kv" style={{ background: '#f8fafc', padding: 14, borderRadius: 10 }}>
            <dt>From</dt><dd className="mono">{from}</dd>
            <dt>To</dt><dd>{ben?.text.replace('✓ ', '')}<br /><span className="mono muted">{form.toAccountNo.toUpperCase()}</span></dd>
            <dt>Mode</dt><dd>{form.mode}</dd>
            <dt>Remark</dt><dd>{form.remark || '—'}</dd>
            <dt>Amount</dt><dd style={{ fontSize: 20 }}>{fmt(form.amount)}</dd>
          </dl>
          <div className="field" style={{ marginTop: 18 }}>
            <label>Enter 4-digit transaction PIN</label>
            <input className="pin" type="password" maxLength={4} inputMode="numeric" placeholder="••••" autoFocus value={pin} onChange={(e) => setPin(e.target.value)} />
          </div>
          <ErrorBox msg={pinErr} />
          <div className="modal-f">
            <button className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy || pin.length !== 4} onClick={send}>{busy ? 'Sending…' : `Transfer ${fmt0(form.amount)}`}</button>
          </div>
        </Modal>
      )}
      {receipt && (
        <Receipt title="Transfer successful" amount={receipt.amount}
          rows={[['Reference', receipt.referenceId], ['Paid to', receipt.beneficiaryName], ['To account', receipt.toAccountNo], ['Mode', receipt.mode], ['Balance left', fmt(receipt.balanceAfter)]]}
          onClose={() => setReceipt(null)} onHistory={() => navigate('/history')} />
      )}
    </>
  )
}
