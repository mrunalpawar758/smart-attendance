import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi, reportApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatCard from '../../components/ui/StatCard'
import { Camera, ClipboardList, BarChart3, CalendarDays, Users, TrendingUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      attendanceApi.listSessions({ per_page: 5 }),
      reportApi.dashboardStats(),
    ]).then(([s, st]) => { setSessions(s); setStats(st) }).finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading..." />

  const today = format(new Date(), 'yyyy-MM-dd')
  const todaySessions = sessions.filter((s: any) => s.date === today)

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Sessions" value={todaySessions.length} icon={<CalendarDays size={20} />} color="blue" />
        <StatCard title="Total Students" value={stats?.total_students || 0} icon={<Users size={20} />} color="green" />
        <StatCard title="Total Classes" value={stats?.total_classes || 0} icon={<ClipboardList size={20} />} color="purple" />
        <StatCard title="Today's Attendance" value={`${stats?.today_attendance_percentage || 0}%`} icon={<TrendingUp size={20} />} color="orange" />
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Manual Attendance', icon: <ClipboardList size={22} />, to: '/teacher/manual', color: 'bg-blue-600 hover:bg-blue-700' },
          { label: 'Face Attendance', icon: <Camera size={22} />, to: '/teacher/face', color: 'bg-emerald-600 hover:bg-emerald-700' },
          { label: 'Register Face', icon: <Users size={22} />, to: '/teacher/face-register', color: 'bg-purple-600 hover:bg-purple-700' },
          { label: 'Reports', icon: <BarChart3 size={22} />, to: '/teacher/reports', color: 'bg-orange-600 hover:bg-orange-700' },
        ].map(({ label, icon, to, color }) => (
          <Link key={label} to={to} className={`flex flex-col items-center gap-2 p-5 rounded-xl text-white transition-all shadow-sm ${color}`}>
            {icon}
            <span className="text-sm font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Recent Sessions</h3>
          <Link to="/teacher/sessions" className="text-sm text-primary-600 hover:underline">View all</Link>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No sessions yet. Start by taking attendance.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                  {s.class_name?.slice(0, 2) || '??'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.subject_name}</p>
                  <p className="text-xs text-gray-500">{s.class_name} · {s.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-emerald-600">{s.present_count}/{s.total_students}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
