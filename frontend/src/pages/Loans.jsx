import { useState } from 'react'
import { accountApi, loanApi } from '../api'
import { errorMessage } from '../api/client'
import { ErrorBox, Field, Loading, Modal, PageHeader, Stat, StatusBadge, useToast } from '../components/ui'
import { useLoad } from '../hooks'
import { calcEmi, dt, fmt, fmt0, LOAN_TYPES } from '../utils'

/** Shared with the admin pages to show a loan's EMI schedule. */
export function ScheduleModal({ loanId, onClose }) {
  const { data, loading, error } = useLoad(() => loanApi.schedule(loanId), [loanId])
  return (
    <Modal title={`EMI schedule — Loan #${loanId}`} onClose={onClose} wide>
      {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : (
        <>
          <dl className="kv" style={{ marginBottom: 16 }}>
            <dt>Principal</dt><dd>{fmt0(data.summary.principal)} @ {data.summary.annualRate}% for {data.summary.tenureMonths} months</dd>
            <dt>Monthly EMI</dt><dd>{fmt(data.summary.emi)}</dd>
            <dt>Total interest</dt><dd>{fmt0(data.summary.totalInterest)}</dd>
          </dl>
          <div className="tbl-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
            <table>
              <thead><tr><th>#</th><th>EMI</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
              <tbody>{data.rows.map((r) => (
                <tr key={r.month}><td>{r.month}</td><td>{fmt(r.emi)}</td><td>{fmt(r.principal)}</td><td>{fmt(r.interest)}</td><td>{fmt(r.balance)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  )
}

export default function Loans() {
  const toast = useToast()
  const { data, loading, error, reload } = useLoad(() =>
    Promise.all([loanApi.mine(), accountApi.mine()]).then(([loans, accounts]) => ({ loans, accounts })), [])
  const [f, setF] = useState({ type: 'PERSONAL', amount: 500000, tenureMonths: 36, monthlyIncome: 85000, employment: 'Salaried', purpose: '', creditAccountNo: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [scheduleId, setScheduleId] = useState(null)

  const lt = LOAN_TYPES[f.type]
  const amount = Math.min(Number(f.amount), lt.max)
  const emi = calcEmi(amount, lt.rate, Number(f.tenureMonths))
  const total = emi * f.tenureMonths
  const income = Number(f.monthlyIncome) || 0
  const eligible = income > 0 && emi <= income * 0.5
  const active = data?.accounts.filter((a) => a.status === 'ACTIVE') || []
  const creditAccountNo = f.creditAccountNo || active[0]?.accountNo || ''

  const apply = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const l = await loanApi.apply({ type: f.type, amount, tenureMonths: Number(f.tenureMonths), monthlyIncome: income, purpose: f.purpose, creditAccountNo })
      toast(`Loan #${l.id} submitted — status PENDING`, 'ok')
      setF({ ...f, purpose: '' })
      reload()
    } catch (ex) { setErr(errorMessage(ex)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Loans" sub="Calculate EMI, check eligibility and apply in minutes"
        apis={['POST /api/loans/apply', 'GET /api/loans/my', 'GET /api/loans/{id}/schedule']} />
      <section className="content">
        <div className="grid g4">
          {Object.entries(LOAN_TYPES).map(([k, v]) => (
            <div key={k} style={{ cursor: 'pointer' }} onClick={() => setF({ ...f, type: k })}>
              <Stat label={v.label} value={`${v.rate}% p.a.`} hint={`Up to ${fmt0(v.max)}`} color={f.type === k ? 'violet' : 'blue'} icon={f.type === k ? '✓' : '₹'} />
            </div>
          ))}
        </div>

        <div className="grid g1-2">
          <div className="card">
            <h3 style={{ marginBottom: 14 }}>Apply for a loan</h3>
            <form onSubmit={apply}>
              <Field label="Loan type">
                <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  {Object.entries(LOAN_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.rate}%</option>)}
                </select>
              </Field>
              <Field label={<>Loan amount <span className="range-val">{fmt0(amount)}</span></>}>
                <input type="range" min="50000" max={lt.max} step="10000" value={amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
              </Field>
              <Field label={<>Tenure <span className="range-val">{f.tenureMonths} months</span></>}>
                <input type="range" min="6" max={f.type === 'HOME' ? 360 : 84} step="6" value={f.tenureMonths} onChange={(e) => setF({ ...f, tenureMonths: Number(e.target.value) })} />
              </Field>
              <div className="row2">
                <Field label="Monthly income (₹)"><input type="number" required value={f.monthlyIncome} onChange={(e) => setF({ ...f, monthlyIncome: e.target.value })} /></Field>
                <Field label="Employment">
                  <select value={f.employment} onChange={(e) => setF({ ...f, employment: e.target.value })}><option>Salaried</option><option>Self-employed</option><option>Business</option></select>
                </Field>
              </div>
              <div className="emi-box">
                <div className="muted" style={{ fontSize: 12.5 }}>Monthly EMI</div>
                <div className="e">{fmt(emi)}</div>
                <div className="emi-grid">
                  <div>Principal<b>{fmt0(amount)}</b></div>
                  <div>Total interest<b>{fmt0(total - amount)}</b></div>
                  <div>Total payable<b>{fmt0(total)}</b></div>
                  <div>Interest rate<b>{lt.rate}% p.a.</b></div>
                </div>
                <div className="elig">
                  {eligible
                    ? <span style={{ color: 'var(--green)' }}>✓ Eligible — EMI is {Math.round((emi / income) * 100)}% of income (limit 50%)</span>
                    : <span style={{ color: 'var(--red)' }}>✕ Not eligible — EMI exceeds 50% of monthly income</span>}
                </div>
              </div>
              <Field label="Purpose"><input required placeholder="e.g. Home renovation" value={f.purpose} onChange={(e) => setF({ ...f, purpose: e.target.value })} /></Field>
              <Field label="Credit to account">
                <select value={creditAccountNo} onChange={(e) => setF({ ...f, creditAccountNo: e.target.value })}>
                  {active.map((a) => <option key={a.accountNo} value={a.accountNo}>{a.type} · {a.accountNo}</option>)}
                </select>
              </Field>
              <ErrorBox msg={err} />
              <button className="btn btn-primary btn-block" disabled={!eligible || busy || !creditAccountNo}>{busy ? 'Submitting…' : 'Submit application'}</button>
            </form>
          </div>

          <div className="card">
            <div className="card-h"><h3>My loan applications</h3><span className="muted">{data?.loans.length ?? 0} total</span></div>
            {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : (
              <div className="tbl-wrap"><table>
                <thead><tr><th>Loan</th><th>Type</th><th>Amount</th><th>Tenure</th><th>EMI</th><th>Applied</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {data.loans.length ? data.loans.map((l) => (
                    <tr key={l.id}>
                      <td className="mono">#{l.id}</td><td>{LOAN_TYPES[l.type]?.label}</td><td><b>{fmt0(l.amount)}</b></td>
                      <td>{l.tenureMonths} mo</td><td>{fmt(l.emi)}</td><td>{dt(l.appliedAt)}</td>
                      <td><StatusBadge s={l.status} />{l.rejectionReason && <div className="help" style={{ margin: 0 }}>{l.rejectionReason}</div>}</td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => setScheduleId(l.id)}>Schedule</button></td>
                    </tr>
                  )) : <tr><td colSpan={8} className="empty">No applications yet</td></tr>}
                </tbody>
              </table></div>
            )}
            <div style={{ marginTop: 18, padding: 14, background: '#f8fafc', borderRadius: 10, fontSize: 13 }}>
              <b>Loan lifecycle:</b> <StatusBadge s="PENDING" /> → admin reviews → <StatusBadge s="APPROVED" /> (amount credited) or <StatusBadge s="REJECTED" />
            </div>
          </div>
        </div>
      </section>
      {scheduleId && <ScheduleModal loanId={scheduleId} onClose={() => setScheduleId(null)} />}
    </>
  )
}
