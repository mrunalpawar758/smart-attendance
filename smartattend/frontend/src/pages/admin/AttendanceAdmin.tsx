import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi, reportApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { format } from 'date-fns'
import { BarChart3 } from 'lucide-react'

export default function AttendanceAdmin() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = () => {
    setLoading(true)
    attendanceApi.listSessions({ page, per_page: 20, date_from: dateFrom || undefined, date_to: dateTo || undefined })
      .then(setSessions)
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page, dateFrom, dateTo])

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Attendance Sessions</h1><p className="text-sm text-gray-500">All recorded attendance sessions</p></div>
        <Link to="/admin/reports" className="btn-secondary btn-sm"><BarChart3 size={14} />Reports</Link>
      </div>

      <div className="flex gap-3">
        <div><label className="label">From</label><input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><label className="label">To</label><input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        <div className="flex items-end"><button className="btn-secondary" onClick={() => { setDateFrom(''); setDateTo('') }}>Clear</button></div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : sessions.length === 0 ? <EmptyState title="No sessions found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Date', 'Class', 'Subject', 'Teacher', 'Method', 'Present/Total', 'Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-cell">{s.date}</td>
                    <td className="table-cell font-medium">{s.class_name}</td>
                    <td className="table-cell">{s.subject_name}</td>
                    <td className="table-cell">{s.teacher_name}</td>
                    <td className="table-cell"><Badge variant={s.method === 'FACE' ? 'blue' : s.method === 'HYBRID' ? 'purple' : 'gray'}>{s.method}</Badge></td>
                    <td className="table-cell">
                      <span className="text-emerald-600 font-bold">{s.present_count}</span>/<span className="text-gray-500">{s.total_students}</span>
                      <span className="text-xs text-gray-400 ml-1">({s.total_students > 0 ? Math.round(s.present_count / s.total_students * 100) : 0}%)</span>
                    </td>
                    <td className="table-cell"><Badge variant={s.status === 'CLOSED' ? 'green' : 'yellow'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <p className="text-sm text-gray-500">Page {page}</p>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button className="btn-secondary btn-sm" disabled={sessions.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
