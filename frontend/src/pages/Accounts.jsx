import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountApi } from '../api'
import { errorMessage } from '../api/client'
import { AccountCard, ErrorBox, Field, Loading, Modal, PageHeader, StatusBadge, useToast } from '../components/ui'
import { useLoad } from '../hooks'
import { dt, fmt, fmt0, MIN_BALANCE } from '../utils'

export default function Accounts() {
  const toast = useToast()
  const navigate = useNavigate()
  const { data: accounts, loading, error, reload } = useLoad(() => accountApi.mine(), [])
  const [form, setForm] = useState({ type: 'SAVINGS', initialDeposit: 10000, fundFromAccountNo: '', nominee: '' })
  const [formErr, setFormErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null) // { kind: 'view'|'close'|'cantClose', account }

  const create = async (e) => {
    e.preventDefault()
    setFormErr(''); setBusy(true)
    try {
      const a = await accountApi.create({ ...form, initialDeposit: Number(form.initialDeposit), fundFromAccountNo: form.fundFromAccountNo || null })
      toast(`${a.type} account ${a.accountNo} created`, 'ok')
      reload()
    } catch (ex) { setFormErr(errorMessage(ex)) } finally { setBusy(false) }
  }

  const toggleFreeze = async (a) => {
    try {
      const r = await accountApi.setStatus(a.accountNo, a.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN')
      toast(`Account is now ${r.status}`, 'ok'); reload()
    } catch (ex) { toast(errorMessage(ex), 'bad') }
  }

  const close = async (a) => {
    try {
      await accountApi.close(a.accountNo)
      toast('Account closed', 'ok'); setModal(null); reload()
    } catch (ex) { toast(errorMessage(ex), 'bad') }
  }

  return (
    <>
      <PageHeader title="My Accounts" sub="Create, view, freeze or close your bank accounts"
        apis={['GET /api/accounts/my', 'POST /api/accounts', 'PUT /api/accounts/{no}/status', 'DELETE /api/accounts/{no}']} />
      <section className="content">
        <div className="grid g2-1">
          <div className="card">
            <div className="card-h"><h3>All accounts {accounts && `(${accounts.length})`}</h3></div>
            {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : (
              <>
                <div className="tbl-wrap"><table>
                  <thead><tr><th>Account no.</th><th>Type</th><th>Balance</th><th>Status</th><th>Opened</th><th>Actions</th></tr></thead>
                  <tbody>
                    {accounts.map((a) => (
                      <tr key={a.accountNo}>
                        <td className="mono">{a.accountNo}</td><td>{a.type}</td><td><b>{fmt(a.balance)}</b></td>
                        <td><StatusBadge s={a.status} /></td><td>{dt(a.openedAt)}</td>
                        <td className="acts">
                          <button className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'view', account: a })}>View</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleFreeze(a)}>{a.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                            onClick={() => setModal({ kind: Number(a.balance) > 0 ? 'cantClose' : 'close', account: a })}>Close</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
                <div className="acct-cards" style={{ marginTop: 18 }}>{accounts.map((a) => <AccountCard key={a.accountNo} a={a} />)}</div>
              </>
            )}
          </div>

          <div className="card">
            <div className="card-h"><h3>Open new account</h3></div>
            <form onSubmit={create}>
              <Field label="Account type">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="SAVINGS">Savings — 3.5% p.a. interest</option>
                  <option value="CURRENT">Current — for business</option>
                </select>
              </Field>
              <Field label="Initial deposit (₹)" help={`Minimum balance: ${fmt0(MIN_BALANCE[form.type])}`}>
                <input type="number" required value={form.initialDeposit} onChange={(e) => setForm({ ...form, initialDeposit: e.target.value })} />
              </Field>
              <Field label="Fund from" help="Optionally move money from an existing account">
                <select value={form.fundFromAccountNo} onChange={(e) => setForm({ ...form, fundFromAccountNo: e.target.value })}>
                  <option value="">Cash at branch / UPI</option>
                  {accounts?.filter((a) => a.status === 'ACTIVE').map((a) => <option key={a.accountNo} value={a.accountNo}>{a.type} · {a.accountNo} · {fmt(a.balance)}</option>)}
                </select>
              </Field>
              <Field label="Nominee name"><input value={form.nominee} onChange={(e) => setForm({ ...form, nominee: e.target.value })} /></Field>
              <ErrorBox msg={formErr} />
              <button className="btn btn-primary btn-block" disabled={busy}>Create account</button>
            </form>
          </div>
        </div>
      </section>

      {modal?.kind === 'view' && (
        <Modal title="Account details" onClose={() => setModal(null)}>
          <AccountCard a={modal.account} />
          <dl className="kv" style={{ marginTop: 18 }}>
            <dt>Account holder</dt><dd>{modal.account.holderName}</dd>
            <dt>Account number</dt><dd className="mono">{modal.account.accountNo}</dd>
            <dt>Type</dt><dd>{modal.account.type}</dd>
            <dt>IFSC</dt><dd className="mono">{modal.account.ifsc}</dd>
            <dt>Branch</dt><dd>{modal.account.branch}</dd>
            <dt>Status</dt><dd><StatusBadge s={modal.account.status} /></dd>
            <dt>Minimum balance</dt><dd>{fmt0(modal.account.minimumBalance)}</dd>
            <dt>Nominee</dt><dd>{modal.account.nominee || '—'}</dd>
            <dt>Opened on</dt><dd>{dt(modal.account.openedAt)}</dd>
          </dl>
          <div className="modal-f">
            <button className="btn btn-primary" onClick={() => navigate(`/balance?acc=${modal.account.accountNo}`)}>Check balance</button>
          </div>
        </Modal>
      )}
      {modal?.kind === 'cantClose' && (
        <Modal title="Cannot close account" onClose={() => setModal(null)}>
          <p>Account <b className="mono">{modal.account.accountNo}</b> still has <b>{fmt(modal.account.balance)}</b>.</p>
          <p className="muted" style={{ marginTop: 8 }}>Withdraw or transfer the full balance first.</p>
          <div className="modal-f">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>OK</button>
            <button className="btn btn-primary" onClick={() => navigate('/transfer')}>Transfer balance</button>
          </div>
        </Modal>
      )}
      {modal?.kind === 'close' && (
        <Modal title="Close account?" onClose={() => setModal(null)}>
          <p>This will permanently close <b className="mono">{modal.account.accountNo}</b>.</p>
          <div className="modal-f">
            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={() => close(modal.account)}>Close account</button>
          </div>
        </Modal>
      )}
    </>
  )
}
