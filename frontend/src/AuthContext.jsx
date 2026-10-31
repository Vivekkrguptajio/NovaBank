import { createContext, useContext, useState } from 'react'
import { authApi } from './api'
import { session } from './api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(session.user)

  const login = async (email, password) => {
    const res = await authApi.login(email, password)
    session.save(res.token, res.user)
    setUser(res.user)
    return res.user
  }

  const register = async (body) => {
    const res = await authApi.register(body)
    session.save(res.token, res.user)
    setUser(res.user)
    return res.user
  }

  const logout = () => {
    session.clear()
    setUser(null)
  }

  /** After editing the profile, keep the stored copy in sync. */
  const updateUser = (u) => {
    session.save(session.token, u)
    setUser(u)
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin: user?.role === 'ADMIN', login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
