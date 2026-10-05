import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Building2,
  ClipboardList, Camera, BarChart3, Settings, LogOut, Menu, X,
  ChevronRight, Bell, UserCircle, CalendarDays,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

function getNavItems(role: string): NavItem[] {
  if (role === 'ADMIN') return [
    { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Students', href: '/admin/students', icon: <GraduationCap size={18} /> },
    { label: 'Teachers', href: '/admin/teachers', icon: <Users size={18} /> },
    { label: 'Classes', href: '/admin/classes', icon: <Building2 size={18} /> },
    { label: 'Subjects', href: '/admin/subjects', icon: <BookOpen size={18} /> },
    { label: 'Departments', href: '/admin/departments', icon: <Building2 size={18} /> },
    { label: 'Attendance', href: '/admin/attendance', icon: <ClipboardList size={18} /> },
    { label: 'Reports', href: '/admin/reports', icon: <BarChart3 size={18} /> },
    { label: 'Audit Log', href: '/admin/audit', icon: <CalendarDays size={18} /> },
    { label: 'Settings', href: '/admin/settings', icon: <Settings size={18} /> },
  ]
  if (role === 'TEACHER') return [
    { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard size={18} /> },
    { label: 'My Classes', href: '/teacher/classes', icon: <Building2 size={18} /> },
    { label: 'Manual Attendance', href: '/teacher/manual', icon: <ClipboardList size={18} /> },
    { label: 'Face Attendance', href: '/teacher/face', icon: <Camera size={18} /> },
    { label: 'Sessions', href: '/teacher/sessions', icon: <CalendarDays size={18} /> },
    { label: 'Register Face', href: '/teacher/face-register', icon: <UserCircle size={18} /> },
    { label: 'Reports', href: '/teacher/reports', icon: <BarChart3 size={18} /> },
  ]
  return [
    { label: 'Dashboard', href: '/student', icon: <LayoutDashboard size={18} /> },
    { label: 'My Attendance', href: '/student/attendance', icon: <ClipboardList size={18} /> },
    { label: 'Reports', href: '/student/reports', icon: <BarChart3 size={18} /> },
    { label: 'Profile', href: '/student/profile', icon: <UserCircle size={18} /> },
  ]
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  TEACHER: 'bg-blue-100 text-blue-700',
  STUDENT: 'bg-emerald-100 text-emerald-700',
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = getNavItems(user?.role || '')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const NavLinks = () => (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {navItems.map((item) => {
        const active = location.pathname === item.href
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
              ${active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {active && <ChevronRight size={14} className="ml-auto" />}
          </Link>
        )
      })}
    </nav>
  )

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
            <Camera className="text-white" size={18} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base leading-tight">SmartAttend</p>
            <p className="text-xs text-gray-500">Attendance System</p>
          </div>
        </div>
      </div>

      <NavLinks />

      {/* User info */}
      <div className="p-3 border-t border-gray-100">
        <div className="p-3 rounded-xl bg-gray-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {user?.full_name?.[0] || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[user?.role || '']}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-white border-r border-gray-100 shadow-sm flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-50 w-64 bg-white shadow-xl flex flex-col fade-in">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-4 lg:px-6 h-14 flex items-center gap-4 flex-shrink-0 shadow-sm">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={20} />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 hidden sm:block">
              {navItems.find((n) => n.href === location.pathname)?.label || 'SmartAttend'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 relative">
              <Bell size={18} />
            </button>
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                {user?.full_name?.[0] || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
