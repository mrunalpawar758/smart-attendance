import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Camera, Eye, EyeOff, GraduationCap } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please enter email and password')
    setLoading(true)
    try {
      await login(email, password)
      // Redirect based on role
      const user = JSON.parse(localStorage.getItem('sa_user') || '{}')
      if (user.role === 'ADMIN') navigate('/admin')
      else if (user.role === 'TEACHER') navigate('/teacher')
      else navigate('/student')
    } catch {
      // error already shown by interceptor
    } finally {
      setLoading(false)
    }
  }

  const demoLogin = (e: string, p: string) => { setEmail(e); setPassword(p) }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 text-white">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Camera size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">SmartAttend</h1>
            <p className="text-primary-200 text-sm">Attendance Management System</p>
          </div>
        </div>
        <h2 className="text-4xl font-bold leading-tight mb-6">
          Smart Attendance<br />Made Simple
        </h2>
        <div className="space-y-4">
          {[
            { icon: '🎯', text: 'Face Recognition Attendance' },
            { icon: '📋', text: 'Manual & Hybrid Attendance' },
            { icon: '📊', text: 'Real-time Analytics & Reports' },
            { icon: '🔒', text: 'Role-based Secure Access' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-primary-100">
              <span className="text-xl">{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex items-center gap-2 mb-8 lg:hidden">
              <Camera className="text-primary-600" size={24} />
              <h1 className="text-xl font-bold text-gray-900">SmartAttend</h1>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label">Email address</label>
                <input
                  type="text"
                  className="input"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPwd(!showPwd)}
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wide">Demo Accounts</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Admin', email: 'admin@smartattend.edu', pwd: 'Admin@123', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                  { label: 'Teacher', email: 'teacher@smartattend.edu', pwd: 'Teacher@123', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: 'Student', email: 'student@smartattend.edu', pwd: 'Student@123', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                ].map(({ label, email: e, pwd, color }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => demoLogin(e, pwd)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all hover:opacity-80 ${color}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">Click a role to fill credentials, then sign in</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
