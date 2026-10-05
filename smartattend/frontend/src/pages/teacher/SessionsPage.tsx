import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { attendanceApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { format } from 'date-fns'
import { Eye } from 'lucide-react'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    attendanceApi.listSessions({ page, per_page: 20 }).then(setSessions).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page])

  return (
    <div className="space-y-5 fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">Attendance Sessions</h1><p className="text-sm text-gray-500 mt-1">All attendance sessions you have conducted</p></div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : sessions.length === 0 ? (
          <EmptyState title="No sessions yet" description="Take your first attendance to see sessions here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Date', 'Class', 'Subject', 'Method', 'Present/Total', 'Status', ''].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-cell text-sm">{s.date}</td>
                    <td className="table-cell font-medium">{s.class_name}</td>
                    <td className="table-cell">{s.subject_name}</td>
                    <td className="table-cell">
                      <Badge variant={s.method === 'FACE' ? 'blue' : s.method === 'HYBRID' ? 'purple' : 'gray'}>{s.method}</Badge>
                    </td>
                    <td className="table-cell">
                      <span className="font-semibold text-emerald-600">{s.present_count}</span>
                      <span className="text-gray-400">/{s.total_students}</span>
                      <span className="ml-2 text-xs text-gray-500">
                        ({s.total_students > 0 ? Math.round(s.present_count / s.total_students * 100) : 0}%)
                      </span>
                    </td>
                    <td className="table-cell"><Badge variant={s.status === 'CLOSED' ? 'green' : 'yellow'}>{s.status}</Badge></td>
                    <td className="table-cell">
                      <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">Page {page}</p>
        <div className="flex gap-2">
          <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <button className="btn-secondary btn-sm" disabled={sessions.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
