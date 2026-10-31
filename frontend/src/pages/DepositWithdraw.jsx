import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { accountApi, txnApi } from '../api'
import { errorMessage } from '../api/client'
import { ErrorBox, Field, Loading, PageHeader, Receipt } from '../components/ui'
import { useLoad } from '../hooks'
import { fmt, fmt0, MIN_BALANCE } from '../utils'

const MODES = { deposit: ['CASH', 'UPI', 'CHEQUE', 'NEFT'], withdraw: ['ATM', 'CASH', 'CHEQUE'] }

export default function DepositWithdraw() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'withdraw' ? 'withdraw' : 'deposit'
  const isDeposit = tab === 'deposit'
  const { data: accounts, loading, error, reload } = useLoad(() => accountApi.mine(), [])
  const active = accounts?.filter((a) => a.status === 'ACTIVE') || []

  const [form, setForm] = useState({ accountNo: '', amount: '', mode: '', remark: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const accountNo = form.accountNo || active[0]?.accountNo || ''
  const acc = active.find((a) => a.accountNo === accountNo)
  const amt = Number(form.amount) || 0
  const after = acc ? Number(acc.balance) + (isDeposit ? amt : -amt) : 0

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const body = { accountNo, amount: amt, mode: form.mode || MODES[tab][0], remark: form.remark }
      const t = isDeposit ? await txnApi.deposit(body) : await txnApi.withdraw(body)
      setReceipt(t)
      setForm({ ...form, amount: '', remark: '' })
      reload()
    } catch (ex) { setErr(errorMessage(ex)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Deposit / Withdraw" sub="Add money to or take money out of your account"
        apis={['POST /api/transactions/deposit', 'POST /api/transactions/withdraw']} />
      <section className="content">
        <div className="tabs">
          <button className={isDeposit ? 'on' : ''} onClick={() => { setParams({ tab: 'deposit' }); setErr('') }}>＋ Deposit</button>
          <button className={!isDeposit ? 'on' : ''} onClick={() => { setParams({ tab: 'withdraw' }); setErr('') }}>− Withdraw</button>
        </div>
        {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : (
          <div className="grid g3-2">
            <div className="card">
              <form onSubmit={submit}>
                <Field label="Account" help="Frozen accounts are hidden">
                  <select value={accountNo} onChange={(e) => setForm({ ...form, accountNo: e.target.value })}>
                    {active.map((a) => <option key={a.accountNo} value={a.accountNo}>{a.type} · {a.accountNo} · {fmt(a.balance)}</option>)}
                  </select>
                </Field>
                <Field label="Amount (₹)">
                  <input type="number" min="1" step="0.01" required placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  <div className="chips">
                    {[500, 1000, 2000, 5000, 10000].map((v) => <button type="button" key={v} className="chip" onClick={() => setForm({ ...form, amount: v })}>{fmt0(v)}</button>)}
                  </div>
                </Field>
                <div className="row2">
                  <Field label="Mode">
                    <select value={form.mode || MODES[tab][0]} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                      {MODES[tab].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  </Field>
                  <Field label="Remark"><input placeholder="Optional" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
                </div>
                <ErrorBox msg={err} />
                <button className={`btn ${isDeposit ? 'btn-success' : 'btn-danger'} btn-block`} disabled={busy || !acc}>
                  {busy ? 'Processing…' : isDeposit ? 'Deposit money' : 'Withdraw money'}
                </button>
              </form>
            </div>
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 12 }}>Preview</h3>
                {acc ? (
                  <dl className="kv">
                    <dt>Current balance</dt><dd>{fmt(acc.balance)}</dd>
                    <dt>{isDeposit ? 'Deposit' : 'Withdraw'}</dt><dd className={isDeposit ? 'amt-cr' : 'amt-dr'}>{isDeposit ? '+' : '−'} {fmt(amt)}</dd>
                    <dt>Balance after</dt><dd style={{ color: after < MIN_BALANCE[acc.type] ? 'var(--red)' : 'inherit' }}>{fmt(after)}</dd>
                    <dt>Min. balance</dt><dd className="muted">{fmt0(MIN_BALANCE[acc.type])}</dd>
                  </dl>
                ) : <p className="muted">No active account</p>}
              </div>
              <div className="card">
                <h3 style={{ marginBottom: 6 }}>Rules (checked by the backend)</h3>
                <ul className="info-list">
                  <li>✓ Savings min balance ₹1,000, Current ₹5,000</li>
                  <li>✓ Daily withdrawal limit ₹50,000 per account</li>
                  <li>✓ Frozen / closed accounts are blocked</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
      {receipt && (
        <Receipt title={isDeposit ? 'Deposit successful' : 'Withdrawal successful'} amount={receipt.amount}
          rows={[['Reference', receipt.referenceId], ['Account', receipt.accountNo], ['Mode', receipt.mode], ['New balance', fmt(receipt.balanceAfter)]]}
          onClose={() => setReceipt(null)} onHistory={() => navigate('/history')} />
      )}
    </>
  )
}
