import React, { useEffect, useState } from 'react'
import { attendanceApi, studentApi, subjectApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Subject } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { format } from 'date-fns'
import { Filter } from 'lucide-react'

export default function AttendanceHistory() {
  const { user } = useAuth()
  const [studentId, setStudentId] = useState<number | null>(null)
  const [records, setRecords] = useState<any[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ subject_id: '', status: '', date_from: '', date_to: '' })

  useEffect(() => {
    studentApi.list({ per_page: 200 }).then((students: any[]) => {
      const me = students.find((s: any) => s.user_id === user?.id)
      if (me) setStudentId(me.id)
    })
    subjectApi.list().then(setSubjects)
  }, [user])

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    attendanceApi.studentHistory(studentId, { page, per_page: 30, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) })
      .then((d) => { setRecords(d.records); setTotal(d.total) })
      .finally(() => setLoading(false))
  }, [studentId, page, filters])

  const f = (k: string, v: string) => { setFilters((p) => ({ ...p, [k]: v })); setPage(1) }

  return (
    <div className="space-y-5 fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">Attendance History</h1><p className="text-sm text-gray-500">{total} records found</p></div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3"><Filter size={15} className="text-gray-400" /><p className="text-sm font-semibold text-gray-700">Filters</p></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <select className="input" value={filters.subject_id} onChange={(e) => f('subject_id', e.target.value)}>
            <option value="">All Subjects</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input" value={filters.status} onChange={(e) => f('status', e.target.value)}>
            <option value="">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
          </select>
          <input className="input" type="date" value={filters.date_from} onChange={(e) => f('date_from', e.target.value)} placeholder="From date" />
          <input className="input" type="date" value={filters.date_to} onChange={(e) => f('date_to', e.target.value)} placeholder="To date" />
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : records.length === 0 ? <EmptyState title="No records found" description="Try adjusting your filters" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Date', 'Subject', 'Status', 'Method', 'Time'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{r.date ? format(new Date(r.date), 'dd MMM yyyy') : '—'}</td>
                    <td className="table-cell">{r.subject_name}</td>
                    <td className="table-cell">
                      <Badge variant={r.status === 'PRESENT' ? 'green' : 'red'}>{r.status}</Badge>
                    </td>
                    <td className="table-cell">
                      <Badge variant={r.method === 'FACE' ? 'blue' : r.method === 'HYBRID' ? 'purple' : 'gray'}>{r.method}</Badge>
                    </td>
                    <td className="table-cell text-xs text-gray-500">{r.timestamp ? format(new Date(r.timestamp), 'HH:mm') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 30) || 1}</p>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button className="btn-secondary btn-sm" disabled={records.length < 30} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
