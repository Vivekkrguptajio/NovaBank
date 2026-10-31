import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { accountApi, loanApi, txnApi } from '../api'
import { AccountCard, ErrorBox, Loading, PageHeader, Stat, TxnTable } from '../components/ui'
import { useLoad } from '../hooks'
import { fmt, fmt0, isCredit, sum } from '../utils'

export default function Dashboard() {
  const { user } = useAuth()
  const { data, loading, error } = useLoad(() =>
    Promise.all([accountApi.mine(), txnApi.history({ size: 100 }), loanApi.mine()])
      .then(([accounts, page, loans]) => ({ accounts, txns: page.content, loans })), [])

  const h = new Date().getHours()
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  const header = (
    <PageHeader title={`${greet}, ${user.name.split(' ')[0]} 👋`} sub="Here's your financial overview"
      apis={['GET /api/accounts/my', 'GET /api/transactions', 'GET /api/loans/my']} />
  )
  if (loading) return <>{header}<Loading /></>
  if (error) return <>{header}<section className="content"><ErrorBox msg={error} /></section></>

  const { accounts, txns, loans } = data
  const month = new Date().toISOString().slice(0, 7)
  const mt = txns.filter((t) => t.createdAt.startsWith(month))
  const credits = mt.filter(isCredit), debits = mt.filter((t) => !isCredit(t))
  const active = loans.filter((l) => l.status === 'APPROVED')

  // money in vs out for the last 6 months
  const months = [...Array(6)].map((_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i)
    return d.toISOString().slice(0, 7)
  })
  const chart = months.map((m) => {
    const l = txns.filter((t) => t.createdAt.startsWith(m))
    return { m, cr: sum(l.filter(isCredit).map((t) => t.amount)), dr: sum(l.filter((t) => !isCredit(t)).map((t) => t.amount)) }
  })
  const max = Math.max(1, ...chart.map((c) => Math.max(c.cr, c.dr)))

  return (
    <>
      {header}
      <section className="content">
        <div className="grid g4">
          <Stat label="Total balance" value={fmt(sum(accounts.map((a) => a.balance)))} hint={`across ${accounts.length} account(s)`} color="blue" icon="₹" />
          <Stat label="Credits this month" value={fmt(sum(credits.map((t) => t.amount)))} hint={`${credits.length} transactions`} color="green" icon="↓" />
          <Stat label="Debits this month" value={fmt(sum(debits.map((t) => t.amount)))} hint={`${debits.length} transactions`} color="red" icon="↑" />
          <Stat label="Active loans" value={active.length} hint={active.length ? `EMI ${fmt(sum(active.map((l) => l.emi)))}/mo` : 'No active loans'} color="amber" icon="◷" />
        </div>

        <div className="grid g2-1">
          <div className="card">
            <div className="card-h"><h3>Your accounts</h3><Link to="/accounts">Manage accounts →</Link></div>
            {accounts.length ? <div className="acct-cards">{accounts.map((a) => <AccountCard key={a.accountNo} a={a} />)}</div> : <div className="empty">No accounts yet</div>}
          </div>
          <div className="card">
            <div className="card-h"><h3>Quick actions</h3></div>
            <div className="qa">
              <Link to="/deposit?tab=deposit"><span className="q c-green">＋</span>Deposit</Link>
              <Link to="/deposit?tab=withdraw"><span className="q c-red">−</span>Withdraw</Link>
              <Link to="/transfer"><span className="q c-blue">⇄</span>Transfer</Link>
              <Link to="/loans"><span className="q c-violet">₹</span>Apply loan</Link>
            </div>
          </div>
        </div>

        <div className="grid g2-1">
          <div className="card">
            <div className="card-h"><h3>Recent transactions</h3><Link to="/history">View all →</Link></div>
            <TxnTable list={txns.slice(0, 6)} />
          </div>
          <div className="card">
            <div className="card-h"><h3>Money in vs out</h3><div className="legend"><span className="l1">In</span><span className="l2">Out</span></div></div>
            <div className="chart">
              {chart.map((c) => (
                <div className="col" key={c.m}>
                  <div className="bars">
                    <div className="bar cr" style={{ height: `${(c.cr / max) * 100}%` }} title={`In: ${fmt0(c.cr)}`} />
                    <div className="bar dr" style={{ height: `${(c.dr / max) * 100}%` }} title={`Out: ${fmt0(c.dr)}`} />
                  </div>
                  <div className="m">{new Date(c.m + '-01').toLocaleString('en-IN', { month: 'short' })}</div>
                </div>
              ))}
            </div>
            <p className="help" style={{ marginTop: 12 }}>Last 6 months · hover a bar for the amount</p>
          </div>
        </div>
      </section>
    </>
  )
}
