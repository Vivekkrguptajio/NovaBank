import { Link } from 'react-router-dom'
import { adminApi } from '../../api'
import { ErrorBox, Loading, PageHeader, Stat, TxnTable } from '../../components/ui'
import { useLoad } from '../../hooks'
import { fmt0 } from '../../utils'
import LoanQueue from './LoanQueue'

export default function AdminDashboard() {
  const { data, loading, error, reload } = useLoad(() =>
    Promise.all([adminApi.stats(), adminApi.loans('PENDING'), adminApi.transactions(0, 6)])
      .then(([stats, pending, txns]) => ({ stats, pending, txns: txns.content })), [])

  return (
    <>
      <PageHeader title="Admin Dashboard" sub="Bank-wide overview · ROLE_ADMIN only"
        apis={['GET /api/admin/stats', 'GET /api/admin/loans?status=PENDING', 'GET /api/admin/transactions']} />
      <section className="content">
        {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} /> : (
          <>
            <div className="grid g4">
              <Stat label="Total customers" value={data.stats.totalCustomers} hint={`${data.stats.totalAccounts} accounts`} color="blue" icon="☷" />
              <Stat label="Total deposits" value={fmt0(data.stats.totalDeposits)} hint="all active accounts" color="green" icon="₹" />
              <Stat label="Pending loans" value={data.stats.pendingLoans} hint={`${fmt0(data.stats.pendingLoanAmount)} requested`} color="amber" icon="◷" />
              <Stat label="Loans disbursed" value={fmt0(data.stats.loansDisbursed)} hint={`${data.stats.transactionsToday} txns today`} color="violet" icon="✓" />
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-h"><h3>Pending loan approvals</h3><Link to="/admin/approvals">Open queue →</Link></div>
              <LoanQueue loans={data.pending.slice(0, 5)} onChange={reload} />
            </div>
            <div className="card">
              <div className="card-h"><h3>Latest transactions (all customers)</h3><Link to="/admin/transactions">View all →</Link></div>
              <TxnTable list={data.txns} />
            </div>
          </>
        )}
      </section>
    </>
  )
}
