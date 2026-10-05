import React, { useEffect, useState } from 'react'
import { reportApi, studentApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer } from 'recharts'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function StudentReport() {
  const { user } = useAuth()
  const [studentId, setStudentId] = useState<number | null>(null)
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.list({ per_page: 200 }).then((students: any[]) => {
      const me = students.find((s: any) => s.user_id === user?.id)
      if (me) {
        setStudentId(me.id)
        reportApi.student(me.id).then(setReport).finally(() => setLoading(false))
      } else { setLoading(false) }
    })
  }, [user])

  if (loading) return <LoadingSpinner text="Loading report..." />
  if (!report) return <div className="card text-center py-8 text-gray-400">No report available</div>

  const { student, overall, subjects, threshold } = report

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Report</h1>
        <p className="text-sm text-gray-500">{student.full_name} · {student.roll_number}</p>
      </div>

      {/* Student card */}
      <div className="card bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold">{student.full_name[0]}</div>
          <div>
            <p className="text-xl font-bold">{student.full_name}</p>
            <p className="text-primary-200 text-sm">{student.student_id} · Roll {student.roll_number}</p>
            <p className="text-primary-200 text-sm">{student.department} · {student.email}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-4xl font-bold">{overall.percentage.toFixed(1)}%</p>
            <p className="text-primary-200 text-xs mt-1">Overall Attendance</p>
          </div>
        </div>
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center"><p className="text-2xl font-bold text-gray-900">{overall.total_classes}</p><p className="text-sm text-gray-500 mt-1">Total Classes</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-emerald-600">{overall.present}</p><p className="text-sm text-gray-500 mt-1">Present</p></div>
        <div className="card text-center"><p className="text-2xl font-bold text-red-600">{overall.absent}</p><p className="text-sm text-gray-500 mt-1">Absent</p></div>
      </div>

      {overall.percentage < threshold && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-800">Attendance Below Threshold ({threshold}%)</p>
            <p className="text-sm text-red-700 mt-1">Your overall attendance is {overall.percentage.toFixed(1)}%. Please consult your class teacher immediately.</p>
          </div>
        </div>
      )}

      {/* Subject table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900">Subject-wise Breakdown</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="table-header">Subject</th>
              <th className="table-header">Code</th>
              <th className="table-header">Total</th>
              <th className="table-header">Present</th>
              <th className="table-header">Absent</th>
              <th className="table-header">%</th>
              <th className="table-header">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subjects.map((s: any) => (
              <tr key={s.subject_id} className={s.is_low ? 'bg-red-50/40' : 'hover:bg-gray-50'}>
                <td className="table-cell font-medium">{s.subject_name}</td>
                <td className="table-cell font-mono text-xs">{s.subject_code}</td>
                <td className="table-cell">{s.total_classes}</td>
                <td className="table-cell text-emerald-600 font-semibold">{s.present}</td>
                <td className="table-cell text-red-500">{s.absent}</td>
                <td className="table-cell">
                  <span className={`font-bold ${s.is_low ? 'text-red-600' : 'text-emerald-600'}`}>{s.percentage}%</span>
                </td>
                <td className="table-cell">
                  {s.is_low
                    ? <span className="badge-red flex items-center gap-1"><AlertTriangle size={10} />Low</span>
                    : <span className="badge-green flex items-center gap-1"><CheckCircle size={10} />OK</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">Minimum attendance threshold: {threshold}%</p>
    </div>
  )
}
