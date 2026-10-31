import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { accountApi, txnApi } from '../api'
import { errorMessage } from '../api/client'
import { ErrorBox, Field, Loading, PageHeader, TxnTable, useToast } from '../components/ui'
import { useLoad } from '../hooks'
import { fmt, isCredit, mask, sum, TXN_TYPES } from '../utils'

const EMPTY = { accountNo: '', type: '', from: '', to: '', q: '' }

export default function History() {
  const toast = useToast()
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ ...EMPTY, accountNo: params.get('acc') || '' })
  const [page, setPage] = useState(0)
  const size = 10

  const { data: accounts } = useLoad(() => accountApi.mine(), [])
  const { data, loading, error } = useLoad(() => txnApi.history({ ...filters, page, size }), [filters, page])

  const setF = (k) => (e) => { setFilters({ ...filters, [k]: e.target.value }); setPage(0) }
  const list = data?.content || []
  const credit = sum(list.filter(isCredit).map((t) => t.amount))
  const debit = sum(list.filter((t) => !isCredit(t)).map((t) => t.amount))

  const exportCsv = async () => {
    try {
      const res = await txnApi.exportCsv(filters)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = 'statement.csv'; a.click()
      URL.revokeObjectURL(url)
      toast('statement.csv downloaded', 'ok')
    } catch (ex) { toast(errorMessage(ex), 'bad') }
  }

  return (
    <>
      <PageHeader title="Transaction History" sub="Search, filter and export all your transactions"
        apis={['GET /api/transactions', 'GET /api/transactions/export']} />
      <section className="content">
        <div className="card">
          <div className="filters">
            <Field label="Account">
              <select value={filters.accountNo} onChange={setF('accountNo')}>
                <option value="">All accounts</option>
                {accounts?.map((a) => <option key={a.accountNo} value={a.accountNo}>{a.type} · {mask(a.accountNo)}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select value={filters.type} onChange={setF('type')}>
                <option value="">All types</option>
                {TXN_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="From date"><input type="date" value={filters.from} onChange={setF('from')} /></Field>
            <Field label="To date"><input type="date" value={filters.to} onChange={setF('to')} /></Field>
            <Field label="Search"><input placeholder="Description or reference" value={filters.q} onChange={setF('q')} /></Field>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-ghost" onClick={() => { setFilters(EMPTY); setPage(0) }}>Reset</button>
              <button className="btn btn-primary" onClick={exportCsv}>⤓ CSV</button>
            </div>
          </div>

          <div className="grid g3" style={{ marginBottom: 14 }}>
            <div className="card stat" style={{ boxShadow: 'none', background: '#fafbfd' }}><div className="lbl">Credits (this page)</div><div className="val amt-cr" style={{ fontSize: 20 }}>{fmt(credit)}</div></div>
            <div className="card stat" style={{ boxShadow: 'none', background: '#fafbfd' }}><div className="lbl">Debits (this page)</div><div className="val amt-dr" style={{ fontSize: 20 }}>{fmt(debit)}</div></div>
            <div className="card stat" style={{ boxShadow: 'none', background: '#fafbfd' }}><div className="lbl">Matching transactions</div><div className="val" style={{ fontSize: 20 }}>{data?.totalElements ?? '—'}</div></div>
          </div>

          {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} /> : (
            <>
              <TxnTable list={list} />
              <div className="pager">
                <span>Showing {data.totalElements ? page * size + 1 : 0}–{Math.min((page + 1) * size, data.totalElements)} of {data.totalElements}</span>
                <div className="btns">
                  <button className="btn btn-ghost btn-sm" disabled={page <= 0} onClick={() => setPage(page - 1)}>← Prev</button>
                  <span style={{ padding: '5px 8px' }}>Page {page + 1} / {Math.max(1, data.totalPages)}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page + 1 >= data.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
