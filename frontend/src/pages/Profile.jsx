import { useState } from 'react'
import { useAuth } from '../AuthContext'
import { userApi } from '../api'
import { errorMessage } from '../api/client'
import { ErrorBox, Field, PageHeader, useToast } from '../components/ui'
import { dt, initials } from '../utils'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const [p, setP] = useState({ name: user.name, phone: user.phone || '', city: user.city || '' })
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pin, setPin] = useState({ currentPassword: '', newPin: '' })
  const [errs, setErrs] = useState({})

  const run = async (key, fn) => {
    setErrs({ ...errs, [key]: '' })
    try { await fn() } catch (ex) { setErrs({ ...errs, [key]: errorMessage(ex) }) }
  }

  const saveProfile = (e) => { e.preventDefault(); run('p', async () => { updateUser(await userApi.update(p)); toast('Profile updated', 'ok') }) }
  const savePassword = (e) => {
    e.preventDefault()
    if (pwd.newPassword !== pwd.confirm) return setErrs({ ...errs, pwd: 'New passwords do not match' })
    run('pwd', async () => {
      await userApi.changePassword({ currentPassword: pwd.currentPassword, newPassword: pwd.newPassword })
      setPwd({ currentPassword: '', newPassword: '', confirm: '' }); toast('Password changed', 'ok')
    })
  }
  const savePin = (e) => { e.preventDefault(); run('pin', async () => { await userApi.changePin(pin); setPin({ currentPassword: '', newPin: '' }); toast('Transaction PIN changed', 'ok') }) }

  return (
    <>
      <PageHeader title="Profile & Security" sub="Manage your personal details, password and transaction PIN"
        apis={['PUT /api/users/me', 'PUT /api/users/me/password', 'PUT /api/users/me/pin']} />
      <section className="content">
        <div className="grid g2">
          <div className="card">
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 18 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 18, background: 'var(--pri)' }}>{initials(user.name)}</div>
              <div><h3>{user.name}</h3><span className="badge b-blue">{user.role}</span></div>
            </div>
            <form onSubmit={saveProfile}>
              <Field label="Full name"><input required value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
              <div className="row2">
                <Field label="Email" help="Email cannot be changed"><input value={user.email} disabled /></Field>
                <Field label="Mobile"><input value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Field>
              </div>
              <Field label="City"><input value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
              <p className="help" style={{ marginBottom: 14 }}>Customer since {dt(user.joinedAt)}</p>
              <ErrorBox msg={errs.p} />
              <button className="btn btn-primary">Save changes</button>
            </form>
          </div>
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 14 }}>Change password</h3>
              <form onSubmit={savePassword}>
                <Field label="Current password"><input type="password" required value={pwd.currentPassword} onChange={(e) => setPwd({ ...pwd, currentPassword: e.target.value })} /></Field>
                <div className="row2">
                  <Field label="New password"><input type="password" minLength={6} required value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} /></Field>
                  <Field label="Confirm"><input type="password" required value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
                </div>
                <ErrorBox msg={errs.pwd} />
                <button className="btn btn-ghost">Update password</button>
              </form>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>Transaction PIN</h3>
              <form onSubmit={savePin}>
                <div className="row2">
                  <Field label="Current password"><input type="password" required value={pin.currentPassword} onChange={(e) => setPin({ ...pin, currentPassword: e.target.value })} /></Field>
                  <Field label="New 4-digit PIN"><input className="pin" type="password" maxLength={4} pattern="\d{4}" required value={pin.newPin} onChange={(e) => setPin({ ...pin, newPin: e.target.value })} /></Field>
                </div>
                <ErrorBox msg={errs.pin} />
                <button className="btn btn-ghost">Set PIN</button>
                <p className="help">PIN is stored as a BCrypt hash — never in plain text.</p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
