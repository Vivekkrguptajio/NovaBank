import api from './client'

/** Every backend endpoint in one place. Each function returns the response JSON. */
const data = (p) => p.then((r) => r.data)

export const authApi = {
  login: (email, password) => data(api.post('/auth/login', { email, password })),
  register: (body) => data(api.post('/auth/register', body)),
}

export const userApi = {
  me: () => data(api.get('/users/me')),
  update: (body) => data(api.put('/users/me', body)),
  changePassword: (body) => data(api.put('/users/me/password', body)),
  changePin: (body) => data(api.put('/users/me/pin', body)),
}

export const accountApi = {
  mine: () => data(api.get('/accounts/my')),
  create: (body) => data(api.post('/accounts', body)),
  details: (no) => data(api.get(`/accounts/${no}`)),
  balance: (no) => data(api.get(`/accounts/${no}/balance`)),
  miniStatement: (no) => data(api.get(`/accounts/${no}/mini-statement`)),
  lookup: (no) => data(api.get(`/accounts/lookup/${no}`)),
  setStatus: (no, status) => data(api.put(`/accounts/${no}/status`, { status })),
  close: (no) => data(api.delete(`/accounts/${no}`)),
}

export const txnApi = {
  deposit: (body) => data(api.post('/transactions/deposit', body)),
  withdraw: (body) => data(api.post('/transactions/withdraw', body)),
  transfer: (body) => data(api.post('/transactions/transfer', body)),
  recent: () => data(api.get('/transactions/recent')),
  /** params: { accountNo, type, from, to, q, page, size } — empty values are dropped */
  history: (params) => data(api.get('/transactions', { params: clean(params) })),
  exportCsv: (params) => api.get('/transactions/export', { params: clean(params), responseType: 'blob' }),
}

export const loanApi = {
  emi: (amount, rate, tenure) => data(api.get('/loans/emi-calculator', { params: { amount, rate, tenure } })),
  apply: (body) => data(api.post('/loans/apply', body)),
  mine: () => data(api.get('/loans/my')),
  schedule: (id) => data(api.get(`/loans/${id}/schedule`)),
}

export const adminApi = {
  stats: () => data(api.get('/admin/stats')),
  users: () => data(api.get('/admin/users')),
  accounts: () => data(api.get('/admin/accounts')),
  setAccountStatus: (no, status) => data(api.put(`/admin/accounts/${no}/status`, { status })),
  transactions: (page = 0, size = 20) => data(api.get('/admin/transactions', { params: { page, size } })),
  loans: (status) => data(api.get('/admin/loans', { params: status ? { status } : {} })),
  approve: (id) => data(api.put(`/admin/loans/${id}/approve`)),
  reject: (id, reason) => data(api.put(`/admin/loans/${id}/reject`, { reason })),
}

function clean(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
}
