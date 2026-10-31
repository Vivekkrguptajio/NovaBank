import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import Balance from './pages/Balance'
import DepositWithdraw from './pages/DepositWithdraw'
import Transfer from './pages/Transfer'
import History from './pages/History'
import Loans from './pages/Loans'
import Profile from './pages/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'
import Approvals from './pages/admin/Approvals'
import Customers from './pages/admin/Customers'
import AllTransactions from './pages/admin/AllTransactions'

/** Redirects to /login when not logged in, and blocks pages meant for the other role. */
function Protected({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />
  return children
}

export default function App() {
  const { user } = useAuth()
  const home = !user ? '/login' : user.role === 'ADMIN' ? '/admin' : '/dashboard'

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} replace /> : <Register />} />

      <Route element={<Protected><Layout /></Protected>}>
        {/* Customer pages */}
        <Route path="/dashboard" element={<Protected role="CUSTOMER"><Dashboard /></Protected>} />
        <Route path="/accounts" element={<Protected role="CUSTOMER"><Accounts /></Protected>} />
        <Route path="/balance" element={<Protected role="CUSTOMER"><Balance /></Protected>} />
        <Route path="/deposit" element={<Protected role="CUSTOMER"><DepositWithdraw /></Protected>} />
        <Route path="/transfer" element={<Protected role="CUSTOMER"><Transfer /></Protected>} />
        <Route path="/history" element={<Protected role="CUSTOMER"><History /></Protected>} />
        <Route path="/loans" element={<Protected role="CUSTOMER"><Loans /></Protected>} />
        {/* Admin pages */}
        <Route path="/admin" element={<Protected role="ADMIN"><AdminDashboard /></Protected>} />
        <Route path="/admin/approvals" element={<Protected role="ADMIN"><Approvals /></Protected>} />
        <Route path="/admin/customers" element={<Protected role="ADMIN"><Customers /></Protected>} />
        <Route path="/admin/transactions" element={<Protected role="ADMIN"><AllTransactions /></Protected>} />
        {/* Both */}
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}
