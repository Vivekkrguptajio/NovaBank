// Formatting helpers + constants that mirror the backend rules

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export const fmt = (n) => inr.format(Number(n || 0))
export const fmt0 = (n) => inr0.format(Number(n || 0))
export const dt = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
export const dtt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
export const mask = (no) => (no ? 'XXXX ' + no.slice(-4) : '')
export const initials = (name = '') => name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
export const sum = (arr) => arr.reduce((a, b) => a + Number(b || 0), 0)

export const CREDIT_TYPES = ['DEPOSIT', 'TRANSFER_IN', 'LOAN_CREDIT', 'INTEREST']
export const isCredit = (t) => (t.credit !== undefined ? t.credit : CREDIT_TYPES.includes(t.type))

export const MIN_BALANCE = { SAVINGS: 1000, CURRENT: 5000 }
export const TXN_TYPES = ['DEPOSIT', 'WITHDRAW', 'TRANSFER_IN', 'TRANSFER_OUT', 'LOAN_CREDIT', 'INTEREST']

/** Same values as LoanType enum in the backend */
export const LOAN_TYPES = {
  PERSONAL: { label: 'Personal Loan', rate: 11.5, max: 1500000 },
  HOME: { label: 'Home Loan', rate: 8.5, max: 10000000 },
  CAR: { label: 'Car Loan', rate: 9.2, max: 2000000 },
  EDUCATION: { label: 'Education Loan', rate: 7.9, max: 3000000 },
}

/** Live EMI preview in the browser (the backend recalculates and validates on submit). */
export function calcEmi(P, rate, n) {
  const r = rate / 12 / 100
  if (!r) return P / n
  const f = Math.pow(1 + r, n)
  return (P * r * f) / (f - 1)
}
