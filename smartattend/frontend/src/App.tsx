import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'

// Pages
import Login from './pages/Login'

// Admin
import AdminDashboard from './pages/admin/AdminDashboard'
import StudentsPage from './pages/admin/StudentsPage'
import TeachersPage from './pages/admin/TeachersPage'
import ClassesPage from './pages/admin/ClassesPage'
import SubjectsPage from './pages/admin/SubjectsPage'
import DepartmentsPage from './pages/admin/DepartmentsPage'
import AttendanceAdmin from './pages/admin/AttendanceAdmin'
import ReportsAdmin from './pages/admin/ReportsAdmin'
import AuditLogPage from './pages/admin/AuditLogPage'
import SettingsPage from './pages/admin/SettingsPage'

// Teacher
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import ManualAttendance from './pages/teacher/ManualAttendance'
import FaceAttendance from './pages/teacher/FaceAttendance'
import FaceRegister from './pages/teacher/FaceRegister'
import SessionsPage from './pages/teacher/SessionsPage'
import TeacherReports from './pages/teacher/TeacherReports'

// Student
import StudentDashboard from './pages/student/StudentDashboard'
import AttendanceHistory from './pages/student/AttendanceHistory'
import StudentReport from './pages/student/StudentReport'
import StudentProfile from './pages/student/StudentProfile'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RoleRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />
  if (user.role === 'TEACHER') return <Navigate to="/teacher" replace />
  return <Navigate to="/student" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><AdminDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/students" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><StudentsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/teachers" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><TeachersPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/classes" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><ClassesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/subjects" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><SubjectsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><DepartmentsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/attendance" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><AttendanceAdmin /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><ReportsAdmin /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/audit" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><AuditLogPage /></AppLayout></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute roles={['ADMIN']}><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />

      {/* Teacher routes */}
      <Route path="/teacher" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><TeacherDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/teacher/manual" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><ManualAttendance /></AppLayout></ProtectedRoute>} />
      <Route path="/teacher/face" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><FaceAttendance /></AppLayout></ProtectedRoute>} />
      <Route path="/teacher/face-register" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><FaceRegister /></AppLayout></ProtectedRoute>} />
      <Route path="/teacher/sessions" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><SessionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/teacher/classes" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><SessionsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/teacher/reports" element={<ProtectedRoute roles={['TEACHER', 'ADMIN']}><AppLayout><TeacherReports /></AppLayout></ProtectedRoute>} />

      {/* Student routes */}
      <Route path="/student" element={<ProtectedRoute roles={['STUDENT']}><AppLayout><StudentDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/student/attendance" element={<ProtectedRoute roles={['STUDENT']}><AppLayout><AttendanceHistory /></AppLayout></ProtectedRoute>} />
      <Route path="/student/reports" element={<ProtectedRoute roles={['STUDENT']}><AppLayout><StudentReport /></AppLayout></ProtectedRoute>} />
      <Route path="/student/profile" element={<ProtectedRoute roles={['STUDENT']}><AppLayout><StudentProfile /></AppLayout></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
