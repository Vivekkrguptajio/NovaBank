import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorMessage } from '../api/client'
import { ApiPill, ErrorBox, Field, useToast } from '../components/ui'
import AuthHero from './AuthHero'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: 'rahul@novabank.in', password: 'demo123' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setErr(''); setBusy(true)
    try {
      const user = await login(form.email, form.password)
      toast(`Welcome, ${user.name.split(' ')[0]}!`, 'ok')
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard')
    } catch (ex) {
      setErr(errorMessage(ex))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <AuthHero />
      <div className="auth-panel">
        <form className="auth-card" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Welcome back! Log in to your account.</p>
          <Field label="Email address">
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Password">
            <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <ErrorBox msg={err} />
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          <div className="demo-creds">
            <span className="muted">Demo login as:</span>
            <button type="button" className="chip" onClick={() => setForm({ email: 'rahul@novabank.in', password: 'demo123' })}>Customer</button>
            <button type="button" className="chip" onClick={() => setForm({ email: 'admin@novabank.in', password: 'admin123' })}>Admin</button>
          </div>
          <p className="muted center">New to NovaBank? <Link to="/register">Open an account</Link></p>
          <div className="api-foot"><ApiPill api="POST /api/auth/login" /></div>
        </form>
      </div>
    </div>
  )
}
