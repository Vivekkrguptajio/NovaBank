/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react'
import { dtt, fmt, isCredit, mask } from '../utils'

// ---------- Toasts ----------
const ToastContext = createContext(() => {})
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const toast = useCallback((msg, kind = '') => {
    const id = Math.random()
    setItems((x) => [...x, { id, msg, kind }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200)
  }, [])
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div id="toast">{items.map((t) => <div key={t.id} className={`tst ${t.kind}`}>{t.msg}</div>)}</div>
    </ToastContext.Provider>
  )
}

// ---------- Modal ----------
export function Modal({ title, onClose, wide, children }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal-box ${wide ? 'wide' : ''}`}>
        {title && (
          <div className="modal-h">
            <h3>{title}</h3>
            <button className="x" onClick={onClose}>×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ---------- Small building blocks ----------
export function Field({ label, help, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {help && <div className="help">{help}</div>}
    </div>
  )
}

export function ApiPill({ api }) {
  const [m, ...p] = api.split(' ')
  return <span className="api"><i className={`m-${m}`}>{m}</i>{p.join(' ')}</span>
}

export function PageHeader({ title, sub, apis = [] }) {
  return (
    <header className="topbar">
      <div><h1>{title}</h1>{sub && <p className="sub">{sub}</p>}</div>
      <div className="api-pills">{apis.map((a) => <ApiPill key={a} api={a} />)}</div>
    </header>
  )
}

export function Stat({ label, value, hint, color, icon }) {
  return (
    <div className="card stat">
      <div className={`dot c-${color}`}>{icon}</div>
      <div className="lbl">{label}</div>
      <div className="val">{value}</div>
      <div className="hint">{hint}</div>
    </div>
  )
}

const STATUS_CLASS = { ACTIVE: 'b-green', APPROVED: 'b-green', SUCCESS: 'b-green', FROZEN: 'b-gray', CLOSED: 'b-gray', PENDING: 'b-amber', REJECTED: 'b-red' }
export const StatusBadge = ({ s }) => <span className={`badge ${STATUS_CLASS[s] || 'b-gray'}`}>{s}</span>
export const TypeBadge = ({ t }) => (
  <span className={`badge ${isCredit(t) ? 'b-green' : 'b-red'}`}>{t.type.replace('_', ' ')}</span>
)

export const Loading = () => <div className="loading"><span className="spin-dark" /> Loading…</div>
export const ErrorBox = ({ msg }) => (msg ? <div className="err">{msg}</div> : <div className="err" />)

export function AccountCard({ a }) {
  return (
    <div className={`acct ${a.type} ${a.status === 'FROZEN' ? 'FROZEN' : ''}`}>
      <div className="row">
        <span className="t">{a.type} account</span>
        {a.status !== 'ACTIVE'
          ? <span className="badge" style={{ background: 'rgba(255,255,255,.2)', color: '#fff' }}>{a.status}</span>
          : <span>◆</span>}
      </div>
      <div>
        <div style={{ fontSize: 12, opacity: 0.75 }}>Available balance</div>
        <div className="b">{fmt(a.balance)}</div>
      </div>
      <div className="row">
        <span className="n">{a.accountNo.replace(/(.{4})/g, '$1 ').trim()}</span>
        <span style={{ fontSize: 12, opacity: 0.8 }}>{a.ifsc}</span>
      </div>
    </div>
  )
}

export function TxnTable({ list, showAccount = true }) {
  if (!list?.length) return <div className="empty">No transactions found</div>
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Reference</th><th>Date</th>{showAccount && <th>Account</th>}<th>Description</th><th>Type</th><th>Mode</th>
            <th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {list.map((t) => (
            <tr key={t.id}>
              <td className="mono">{t.referenceId}</td>
              <td>{dtt(t.createdAt)}</td>
              {showAccount && <td className="mono">{mask(t.accountNo)}</td>}
              <td>{t.description}</td>
              <td><TypeBadge t={t} /></td>
              <td className="muted">{t.mode || '—'}</td>
              <td style={{ textAlign: 'right' }} className={isCredit(t) ? 'amt-cr' : 'amt-dr'}>
                {isCredit(t) ? '+' : '−'} {fmt(t.amount)}
              </td>
              <td style={{ textAlign: 'right' }}>{fmt(t.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Success receipt shown after deposit / withdraw / transfer. */
export function Receipt({ title, amount, rows, onClose, onHistory }) {
  return (
    <Modal onClose={onClose}>
      <div className="receipt">
        <div className="tick">✓</div>
        <h3>{title}</h3>
        <div className="ramt">{fmt(amount)}</div>
        <dl className="kv">
          {rows.map(([k, v]) => [<dt key={k + 'k'}>{k}</dt>, <dd key={k + 'v'}>{v}</dd>])}
          <dt>Status</dt><dd><StatusBadge s="SUCCESS" /></dd>
        </dl>
        <div className="modal-f" style={{ justifyContent: 'center' }}>
          {onHistory && <button className="btn btn-ghost" onClick={onHistory}>View history</button>}
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  )
}
