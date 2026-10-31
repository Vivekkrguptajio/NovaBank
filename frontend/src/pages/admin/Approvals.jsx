import { useState } from 'react'
import { adminApi } from '../../api'
import { ErrorBox, Loading, PageHeader, StatusBadge } from '../../components/ui'
import { useLoad } from '../../hooks'
import { dt, fmt0, LOAN_TYPES } from '../../utils'
import { ScheduleModal } from '../Loans'
import LoanQueue from './LoanQueue'

export default function Approvals() {
  const { data: all, loading, error, reload } = useLoad(() => adminApi.loans(), [])
  const [scheduleId, setScheduleId] = useState(null)
  const pending = all?.filter((l) => l.status === 'PENDING') || []

  return (
    <>
      <PageHeader title="Loan Approvals" sub="Review and decide on customer loan applications"
        apis={['GET /api/admin/loans', 'PUT /api/admin/loans/{id}/approve', 'PUT /api/admin/loans/{id}/reject']} />
      <section className="content">
        {loading && !all ? <Loading /> : error ? <ErrorBox msg={error} /> : (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h"><h3>Pending queue ({pending.length})</h3><span className="help" style={{ margin: 0 }}>Rule: EMI ≤ 50% of monthly income</span></div>
              <LoanQueue loans={pending} onChange={reload} />
            </div>
            <div className="card">
              <div className="card-h"><h3>All applications</h3></div>
              <div className="tbl-wrap"><table>
                <thead><tr><th>Loan</th><th>Customer</th><th>Type</th><th>Amount</th><th>Applied</th><th>Decided</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {all.map((l) => (
                    <tr key={l.id}>
                      <td className="mono">#{l.id}</td><td>{l.customerName}</td><td>{LOAN_TYPES[l.type]?.label}</td><td>{fmt0(l.amount)}</td>
                      <td>{dt(l.appliedAt)}</td><td>{dt(l.decidedAt)}</td>
                      <td><StatusBadge s={l.status} />{l.rejectionReason && <div className="help" style={{ margin: 0 }}>{l.rejectionReason}</div>}</td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => setScheduleId(l.id)}>Schedule</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </>
        )}
      </section>
      {scheduleId && <ScheduleModal loanId={scheduleId} onClose={() => setScheduleId(null)} />}
    </>
  )
}
