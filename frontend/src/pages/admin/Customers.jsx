import { adminApi } from '../../api'
import { errorMessage } from '../../api/client'
import { ErrorBox, Loading, PageHeader, StatusBadge, useToast } from '../../components/ui'
import { useLoad } from '../../hooks'
import { dt, fmt, initials } from '../../utils'

export default function Customers() {
  const toast = useToast()
  const { data, loading, error, reload } = useLoad(() =>
    Promise.all([adminApi.users(), adminApi.accounts()]).then(([users, accounts]) => ({ users, accounts })), [])

  const toggle = async (a) => {
    try {
      const r = await adminApi.setAccountStatus(a.accountNo, a.status === 'FROZEN' ? 'ACTIVE' : 'FROZEN')
      toast(`${a.accountNo} is now ${r.status}`, 'ok'); reload()
    } catch (ex) { toast(errorMessage(ex), 'bad') }
  }

  return (
    <>
      <PageHeader title="Customers" sub="All registered customers and their accounts"
        apis={['GET /api/admin/users', 'GET /api/admin/accounts', 'PUT /api/admin/accounts/{no}/status']} />
      <section className="content">
        {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} /> : (
          <>
            <div className="card">
              <div className="tbl-wrap"><table>
                <thead><tr><th>Customer</th><th>Contact</th><th>City</th><th>Joined</th><th>Accounts</th><th>Total balance</th><th>Loans</th></tr></thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id}>
                      <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div className="avatar" style={{ background: 'var(--pri-l)', color: 'var(--pri)' }}>{initials(u.name)}</div><b>{u.name}</b></div></td>
                      <td>{u.email}<div className="help" style={{ margin: 0 }}>{u.phone}</div></td>
                      <td>{u.city || '—'}</td><td>{dt(u.joinedAt)}</td><td>{u.accounts}</td><td><b>{fmt(u.totalBalance)}</b></td><td>{u.loans}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-h"><h3>All accounts</h3></div>
              <div className="tbl-wrap"><table>
                <thead><tr><th>Account no.</th><th>Holder</th><th>Type</th><th>Branch</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {data.accounts.map((a) => (
                    <tr key={a.accountNo}>
                      <td className="mono">{a.accountNo}</td><td>{a.holderName}</td><td>{a.type}</td><td>{a.branch}</td>
                      <td><b>{fmt(a.balance)}</b></td><td><StatusBadge s={a.status} /></td>
                      <td><button className="btn btn-ghost btn-sm" onClick={() => toggle(a)}>{a.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            </div>
          </>
        )}
      </section>
    </>
  )
}
