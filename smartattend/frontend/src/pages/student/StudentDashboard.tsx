import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi, studentApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { AttendanceStats } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import StatCard from '../../components/ui/StatCard'
import { CheckCircle, XCircle, BookOpen, AlertTriangle, TrendingUp } from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [studentId, setStudentId] = useState<number | null>(null)
  const [stats, setStats] = useState<AttendanceStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get student profile
    studentApi.list({ per_page: 200 }).then((students: any[]) => {
      const me = students.find((s) => s.user_id === user?.id)
      if (me) {
        setStudentId(me.id)
        attendanceApi.studentStats(me.id).then((data) => {
          setStats(Array.isArray(data) ? data : [])
        }).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })
  }, [user])

  if (loading) return <LoadingSpinner text="Loading your attendance..." />

  const totalClasses = stats.reduce((s, a) => s + a.total_classes, 0)
  const totalPresent = stats.reduce((s, a) => s + a.present_count, 0)
  const totalAbsent = stats.reduce((s, a) => s + a.absent_count, 0)
  const overall = totalClasses > 0 ? Math.round(totalPresent / totalClasses * 100) : 0
  const lowSubjects = stats.filter((s) => s.is_low_attendance)

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Hello, {user?.full_name?.split(' ')[0]} 👋</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overall %" value={`${overall}%`} icon={<TrendingUp size={20} />} color={overall < 75 ? 'red' : 'green'} />
        <StatCard title="Present" value={totalPresent} icon={<CheckCircle size={20} />} color="green" />
        <StatCard title="Absent" value={totalAbsent} icon={<XCircle size={20} />} color="red" />
        <StatCard title="Total Classes" value={totalClasses} icon={<BookOpen size={20} />} color="blue" />
      </div>

      {/* Low attendance warning */}
      {lowSubjects.length > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-600 flex-shrink-0" size={18} />
            <p className="text-sm font-semibold text-red-800">Low Attendance Warning</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowSubjects.map((s) => (
              <span key={s.subject_id} className="px-3 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                {s.subject_name} — {s.percentage}%
              </span>
            ))}
          </div>
          <p className="text-xs text-red-600 mt-2">Attendance below the minimum required threshold. Contact your teacher immediately.</p>
        </div>
      )}

      {/* Subject cards */}
      <div>
        <h2 className="font-semibold text-gray-900 mb-3">Subject-wise Attendance</h2>
        {stats.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <BookOpen size={36} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No attendance records found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.subject_id} className={`card ${s.is_low_attendance ? 'border-red-200 bg-red-50/30' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{s.subject_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.subject_code}</p>
                  </div>
                  {s.is_low_attendance && <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${s.percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className={`font-bold text-lg ${s.is_low_attendance ? 'text-red-600' : 'text-emerald-600'}`}>{s.percentage}%</span>
                  <div className="text-right text-xs text-gray-500">
                    <div><span className="text-emerald-600 font-semibold">{s.present_count}</span> present</div>
                    <div><span className="text-red-500 font-semibold">{s.absent_count}</span> absent</div>
                  </div>
                </div>

                {s.is_low_attendance && (
                  <p className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded mt-2">
                    ⚠ Below minimum threshold
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link to="/student/attendance" className="btn-primary flex-1 justify-center">View Attendance History</Link>
        {studentId && <Link to="/student/reports" className="btn-secondary flex-1 justify-center">Download Report</Link>}
      </div>
    </div>
  )
}
