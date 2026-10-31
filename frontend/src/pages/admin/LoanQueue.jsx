import { useState } from 'react'
import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { Field, Modal, useToast } from '../../components/ui'
import { dt, fmt0, LOAN_TYPES } from '../../utils'

/** Pending loans with Approve / Reject buttons. Calls onChange() after a decision. */
export default function LoanQueue({ loans, onChange }) {
  const toast = useToast()
  const [rejecting, setRejecting] = useState(null)
  const [reason, setReason] = useState('Income below eligibility')
  const [busyId, setBusyId] = useState(null)

  const approve = async (l) => {
    setBusyId(l.id)
    try {
      await adminApi.approve(l.id)
      toast(`Loan #${l.id} approved — ${fmt0(l.amount)} credited`, 'ok')
      onChange()
    } catch (ex) { toast(errorMessage(ex), 'bad') } finally { setBusyId(null) }
  }

  const reject = async () => {
    try {
      await adminApi.reject(rejecting.id, reason)
      toast(`Loan #${rejecting.id} rejected`, 'bad')
      setRejecting(null); onChange()
    } catch (ex) { toast(errorMessage(ex), 'bad') }
  }

  if (!loans.length) return <div className="empty">🎉 No pending applications</div>
  return (
    <>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Loan</th><th>Customer</th><th>Type</th><th>Amount</th><th>EMI / Income</th><th>Actions</th></tr></thead>
        <tbody>
          {loans.map((l) => (
            <tr key={l.id}>
              <td className="mono">#{l.id}<div className="help" style={{ margin: 0 }}>{dt(l.appliedAt)}</div></td>
              <td><b>{l.customerName}</b><div className="help" style={{ margin: 0 }}>{l.purpose}</div></td>
              <td>{LOAN_TYPES[l.type]?.label}</td>
              <td><b>{fmt0(l.amount)}</b><div className="help" style={{ margin: 0 }}>{l.tenureMonths} mo @ {l.annualRate}%</div></td>
              <td>
                <span className={`badge ${l.emiToIncomePercent <= 50 ? 'b-green' : 'b-red'}`}>{Math.round(l.emiToIncomePercent)}%</span>
                <div className="help" style={{ margin: 0 }}>{fmt0(l.emi)} / {fmt0(l.monthlyIncome)}</div>
              </td>
              <td className="acts">
                <button className="btn btn-success btn-sm" disabled={busyId === l.id} onClick={() => approve(l)}>Approve</button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => setRejecting(l)}>Reject</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {rejecting && (
        <Modal title={`Reject loan #${rejecting.id}`} onClose={() => setRejecting(null)}>
          <Field label="Reason for rejection">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Income below eligibility</option><option>Low credit score</option>
              <option>Incomplete KYC documents</option><option>High existing liabilities</option>
            </select>
          </Field>
          <div className="modal-f">
            <button className="btn btn-ghost" onClick={() => setRejecting(null)}>Cancel</button>
            <button className="btn btn-danger" onClick={reject}>Reject loan</button>
          </div>
        </Modal>
      )}
    </>
  )
}
