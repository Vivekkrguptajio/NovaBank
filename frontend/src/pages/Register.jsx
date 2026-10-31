import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorMessage } from '../api/client'
import { ApiPill, ErrorBox, Field, useToast } from '../components/ui'
import { fmt0, MIN_BALANCE } from '../utils'
import AuthHero from './AuthHero'

export default function Register() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [f, setF] = useState({
    name: '', email: '', phone: '', city: '', password: '', confirm: '',
    transactionPin: '', accountType: 'SAVINGS', initialDeposit: 5000,
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (f.password !== f.confirm) return setErr('Passwords do not match')
    if (Number(f.initialDeposit) < MIN_BALANCE[f.accountType]) {
      return setErr(`Minimum opening deposit for ${f.accountType} is ${fmt0(MIN_BALANCE[f.accountType])}`)
    }
    setErr(''); setBusy(true)
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirm, ...body } = f
      await register({ ...body, initialDeposit: Number(f.initialDeposit) })
      toast('Account created 🎉', 'ok')
      navigate('/dashboard')
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
        <form className="auth-card" style={{ maxWidth: 460 }} onSubmit={submit}>
          <h2>Open an account</h2>
          <p className="muted">Takes less than 2 minutes.</p>
          <Field label="Full name"><input required value={f.name} onChange={set('name')} placeholder="As per PAN" /></Field>
          <div className="row2">
            <Field label="Email"><input type="email" required value={f.email} onChange={set('email')} /></Field>
            <Field label="Mobile"><input required value={f.phone} onChange={set('phone')} placeholder="9876543210" /></Field>
          </div>
          <div className="row2">
            <Field label="Password" help="Min 6 characters"><input type="password" minLength={6} required value={f.password} onChange={set('password')} /></Field>
            <Field label="Confirm password"><input type="password" required value={f.confirm} onChange={set('confirm')} /></Field>
          </div>
          <div className="row2">
            <Field label="Account type">
              <select value={f.accountType} onChange={set('accountType')}>
                <option value="SAVINGS">Savings</option><option value="CURRENT">Current</option>
              </select>
            </Field>
            <Field label="Initial deposit (₹)" help={`Min ${fmt0(MIN_BALANCE[f.accountType])}`}>
              <input type="number" required value={f.initialDeposit} onChange={set('initialDeposit')} />
            </Field>
          </div>
          <div className="row2">
            <Field label="4-digit transaction PIN" help="Needed for transfers">
              <input className="pin" type="password" maxLength={4} pattern="\d{4}" required value={f.transactionPin} onChange={set('transactionPin')} />
            </Field>
            <Field label="City"><input value={f.city} onChange={set('city')} /></Field>
          </div>
          <ErrorBox msg={err} />
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
          <p className="muted center" style={{ marginTop: 14 }}>Already a customer? <Link to="/login">Sign in</Link></p>
          <div className="api-foot"><ApiPill api="POST /api/auth/register" /></div>
        </form>
      </div>
    </div>
  )
}
