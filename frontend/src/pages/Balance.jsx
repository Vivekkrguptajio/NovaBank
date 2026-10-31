import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { accountApi } from '../api'
import { errorMessage } from '../api/client'
import { ErrorBox, Loading, PageHeader, StatusBadge, TxnTable, useToast } from '../components/ui'
import { useLoad } from '../hooks'
import { dt, fmt, fmt0, mask } from '../utils'

export default function Balance() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const { data: accounts, loading, error } = useLoad(() => accountApi.mine(), [])
  const selected = params.get('acc') || accounts?.[0]?.accountNo
  const [info, setInfo] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const fetchBalance = async (no, showToast) => {
    setBusy(true); setErr('')
    try {
      const [balance, mini] = await Promise.all([accountApi.balance(no), accountApi.miniStatement(no)])
      setInfo({ balance, mini })
      if (showToast) toast('Balance refreshed', 'ok')
    } catch (ex) { setErr(errorMessage(ex)) } finally { setBusy(false) }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (selected) fetchBalance(selected) }, [selected]) // eslint-disable-line react-hooks/exhaustive-deps

  const account = accounts?.find((a) => a.accountNo === selected)
  return (
    <>
      <PageHeader title="Balance Inquiry" sub="Real-time balance and mini statement"
        apis={['GET /api/accounts/{no}/balance', 'GET /api/accounts/{no}/mini-statement']} />
      <section className="content">
        {loading ? <Loading /> : error ? <ErrorBox msg={error} /> : !accounts.length ? <div className="card empty">No accounts</div> : (
          <>
            <div className="chips" style={{ margin: '0 0 16px' }}>
              {accounts.map((a) => (
                <button key={a.accountNo} className={`chip ${a.accountNo === selected ? 'on' : ''}`} onClick={() => setParams({ acc: a.accountNo })}>
                  {a.type} · {mask(a.accountNo)}
                </button>
              ))}
            </div>
            <ErrorBox msg={err} />
            {!info ? <Loading /> : (
              <>
                <div className="grid g2">
                  <div className="bal-hero">
                    <div className="sm">{info.balance.type} ACCOUNT · {info.balance.accountNo}</div>
                    <div className="sm" style={{ marginTop: 14 }}>Available balance</div>
                    <div className="big">{fmt(info.balance.availableBalance)}</div>
                    <div className="sm">Updated {new Date(info.balance.asOf).toLocaleTimeString('en-IN')}</div>
                    <div className="split">
                      <div><span className="sm">Ledger balance</span><b>{fmt(info.balance.ledgerBalance)}</b></div>
                      <div><span className="sm">Withdrawable</span><b>{fmt(info.balance.withdrawableBalance)}</b></div>
                    </div>
                    <button className="btn" style={{ marginTop: 20, background: 'rgba(255,255,255,.15)', color: '#fff' }}
                      disabled={busy} onClick={() => fetchBalance(selected, true)}>
                      {busy ? <><span className="spin" /> Fetching…</> : '↻ Refresh balance'}
                    </button>
                  </div>
                  {account && (
                    <div className="card">
                      <h3 style={{ marginBottom: 12 }}>Account summary</h3>
                      <dl className="kv">
                        <dt>Holder</dt><dd>{account.holderName}</dd>
                        <dt>Status</dt><dd><StatusBadge s={account.status} /></dd>
                        <dt>IFSC</dt><dd className="mono">{account.ifsc}</dd>
                        <dt>Branch</dt><dd>{account.branch}</dd>
                        <dt>Minimum balance</dt><dd>{fmt0(account.minimumBalance)}</dd>
                        <dt>Opened</dt><dd>{dt(account.openedAt)}</dd>
                      </dl>
                    </div>
                  )}
                </div>
                <div className="card">
                  <div className="card-h"><h3>Mini statement — last 5 transactions</h3><Link to={`/history?acc=${selected}`}>Full statement →</Link></div>
                  <TxnTable list={info.mini.lastTransactions} showAccount={false} />
                </div>
              </>
            )}
          </>
        )}
      </section>
    </>
  )
}
