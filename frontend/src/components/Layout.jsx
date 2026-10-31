import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { initials } from '../utils'

const CUSTOMER_NAV = [
  { sec: 'Banking' },
  { to: '/dashboard', ic: '▦', label: 'Dashboard' },
  { to: '/accounts', ic: '◫', label: 'My Accounts' },
  { to: '/balance', ic: '◉', label: 'Balance Inquiry' },
  { sec: 'Payments' },
  { to: '/deposit', ic: '⇅', label: 'Deposit / Withdraw' },
  { to: '/transfer', ic: '⇄', label: 'Money Transfer' },
  { to: '/history', ic: '≡', label: 'Transaction History' },
  { sec: 'Credit' },
  { to: '/loans', ic: '₹', label: 'Loans' },
  { sec: 'Settings' },
  { to: '/profile', ic: '☺', label: 'Profile & Security' },
]

const ADMIN_NAV = [
  { sec: 'Admin' },
  { to: '/admin', ic: '▦', label: 'Admin Dashboard' },
  { to: '/admin/approvals', ic: '✓', label: 'Loan Approvals' },
  { to: '/admin/customers', ic: '☷', label: 'Customers' },
  { to: '/admin/transactions', ic: '≡', label: 'All Transactions' },
  { sec: 'Settings' },
  { to: '/profile', ic: '☺', label: 'Profile & Security' },
]

export default function Layout() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const nav = isAdmin ? ADMIN_NAV : CUSTOMER_NAV

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand"><div className="logo">◆</div>NovaBank</div>
        <nav>
          {nav.map((n, i) =>
            n.sec ? <div className="sec" key={i}>{n.sec}</div> : (
              <NavLink key={n.to} to={n.to} end={n.to === '/admin'} className={({ isActive }) => (isActive ? 'active' : '')}>
                <span className="ic">{n.ic}</span>{n.label}
              </NavLink>
            ),
          )}
        </nav>
        <div className="side-foot">
          <div className="avatar">{initials(user.name)}</div>
          <div className="who"><b>{user.name}</b><span>{user.role}</span></div>
          <button className="logout" onClick={() => { logout(); navigate('/login') }}>Logout</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
