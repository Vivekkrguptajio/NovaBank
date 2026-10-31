import { useState } from 'react'
import { adminApi } from '../../api'
import { ErrorBox, Loading, PageHeader, TxnTable } from '../../components/ui'
import { useLoad } from '../../hooks'

export default function AllTransactions() {
  const [page, setPage] = useState(0)
  const { data, loading, error } = useLoad(() => adminApi.transactions(page, 20), [page])

  return (
    <>
      <PageHeader title="All Transactions" sub="Bank-wide transaction ledger" apis={['GET /api/admin/transactions?page=&size=']} />
      <section className="content">
        <div className="card">
          {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} /> : (
            <>
              <TxnTable list={data.content} />
              <div className="pager">
                <span>{data.totalElements} transactions</span>
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
