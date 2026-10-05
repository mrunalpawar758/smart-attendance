import React, { useEffect, useState } from 'react'
import { reportApi, attendanceApi } from '../../services/api'
import { DashboardStats } from '../../types'
import StatCard from '../../components/ui/StatCard'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { Users, GraduationCap, Building2, BookOpen, ClipboardList, TrendingUp, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [daily, setDaily] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([reportApi.dashboardStats(), reportApi.daily()])
      .then(([s, d]) => { setStats(s); setDaily(d) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingSpinner text="Loading dashboard..." />

  const sessionChartData = daily?.sessions?.slice(0, 8).map((s: any) => ({
    name: s.subject_name?.slice(0, 10) || 'N/A',
    Present: s.present,
    Absent: s.absent,
  })) || []

  const pieData = [
    { name: 'Present', value: daily?.summary?.total_present || 0 },
    { name: 'Absent', value: daily?.summary?.total_absent || 0 },
  ]

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of the attendance management system</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Students" value={stats?.total_students || 0} icon={<GraduationCap size={22} />} color="blue" />
        <StatCard title="Total Teachers" value={stats?.total_teachers || 0} icon={<Users size={22} />} color="purple" />
        <StatCard title="Classes" value={stats?.total_classes || 0} icon={<Building2 size={22} />} color="orange" />
        <StatCard title="Subjects" value={stats?.total_subjects || 0} icon={<BookOpen size={22} />} color="indigo" />
        <StatCard title="Today's Sessions" value={stats?.today_sessions || 0} icon={<ClipboardList size={22} />} color="green" />
        <StatCard title="Today's Attendance" value={`${stats?.today_attendance_percentage || 0}%`} icon={<TrendingUp size={22} />} color="green" />
      </div>

      {/* Attendance threshold warning */}
      {(stats?.today_attendance_percentage || 0) < (stats?.threshold || 75) && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <AlertTriangle className="text-yellow-600 flex-shrink-0" size={20} />
          <p className="text-sm text-yellow-800">
            Today's attendance ({stats?.today_attendance_percentage}%) is below the configured threshold ({stats?.threshold}%).
          </p>
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Sessions — Present vs Absent</h3>
          {sessionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sessionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Present" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              No sessions today
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Overview</h3>
          {pieData[0].value + pieData[1].value > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Sessions</span>
              <span className="font-semibold">{daily?.summary?.total_sessions || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Students</span>
              <span className="font-semibold">{daily?.summary?.total_students || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Present</span>
              <span className="font-semibold text-emerald-600">{daily?.summary?.total_present || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Absent</span>
              <span className="font-semibold text-red-600">{daily?.summary?.total_absent || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent sessions table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Sessions Today</h3>
        {daily?.sessions?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Class</th>
                  <th className="table-header">Subject</th>
                  <th className="table-header">Teacher</th>
                  <th className="table-header">Method</th>
                  <th className="table-header">Present</th>
                  <th className="table-header">Absent</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {daily.sessions.map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-cell font-medium">{s.class_name}</td>
                    <td className="table-cell">{s.subject_name}</td>
                    <td className="table-cell">{s.teacher}</td>
                    <td className="table-cell">
                      <span className="badge-blue">{s.method}</span>
                    </td>
                    <td className="table-cell text-emerald-600 font-semibold">{s.present}</td>
                    <td className="table-cell text-red-600 font-semibold">{s.absent}</td>
                    <td className="table-cell">
                      <span className={s.status === 'CLOSED' ? 'badge-green' : 'badge-yellow'}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">No sessions recorded today</p>
        )}
      </div>
    </div>
  )
}
