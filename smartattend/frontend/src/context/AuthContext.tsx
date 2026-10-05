import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthState } from '../types'
import { authApi } from '../services/api'

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('sa_token'),
    isAuthenticated: false,
  })

  useEffect(() => {
    const token = localStorage.getItem('sa_token')
    const userStr = localStorage.getItem('sa_user')
    if (token && userStr) {
      try {
        setState({ user: JSON.parse(userStr), token, isAuthenticated: true })
      } catch {
        logout()
      }
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authApi.login(email, password)
    localStorage.setItem('sa_token', data.access_token)
    const user: User = {
      id: data.user_id,
      email: data.email,
      username: data.email,
      full_name: data.full_name,
      role: data.role,
      is_active: true,
      profile_photo: data.profile_photo,
    }
    localStorage.setItem('sa_user', JSON.stringify(user))
    setState({ user, token: data.access_token, isAuthenticated: true })
  }

  const logout = () => {
    localStorage.removeItem('sa_token')
    localStorage.removeItem('sa_user')
    setState({ user: null, token: null, isAuthenticated: false })
  }

  const refreshUser = async () => {
    const data = await authApi.me()
    const user: User = data
    localStorage.setItem('sa_user', JSON.stringify(user))
    setState((s) => ({ ...s, user }))
  }

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
