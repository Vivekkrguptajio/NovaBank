import axios from 'axios'

/**
 * One axios instance for the whole app.
 * - In dev, "/api" is proxied to http://localhost:8080 (see vite.config.js).
 * - For a deployed build, set VITE_API_URL=https://your-backend.com/api
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

const TOKEN_KEY = 'novabank_token'
const USER_KEY = 'novabank_user'

export const session = {
  get token() { return localStorage.getItem(TOKEN_KEY) },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  },
}

// Attach "Authorization: Bearer <token>" to every request
api.interceptors.request.use((config) => {
  const token = session.token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Token expired / invalid -> log out and go to the login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginCall = err.config?.url?.includes('/auth/')
    if (err.response?.status === 401 && !isLoginCall) {
      session.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

/** Turns the backend's error JSON into one readable line for the UI. */
export function errorMessage(err) {
  const data = err?.response?.data
  if (!err?.response) return 'Cannot reach the server. Is the Spring Boot backend running on port 8080?'
  if (data?.fieldErrors) {
    return Object.entries(data.fieldErrors).map(([f, m]) => `${f}: ${m}`).join(' · ')
  }
  return data?.message || `Request failed (${err.response.status})`
}

export default api
