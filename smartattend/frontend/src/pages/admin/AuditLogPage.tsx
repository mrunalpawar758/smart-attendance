import React, { useEffect, useState } from 'react'
import { attendanceApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { format } from 'date-fns'
import { ArrowRight } from 'lucide-react'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    attendanceApi.auditLog({ page }).then((d) => { setLogs(d.logs); setTotal(d.total) }).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [page])

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">All manual attendance modifications — {total} total records</p>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : logs.length === 0 ? <EmptyState title="No audit records" description="Manual attendance modifications will appear here" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Student', 'Change', 'Changed By', 'Reason', 'Time'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{l.student_name}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <span className={`badge ${l.previous_status === 'PRESENT' ? 'badge-green' : 'badge-red'}`}>{l.previous_status || '—'}</span>
                        <ArrowRight size={12} className="text-gray-400" />
                        <span className={`badge ${l.new_status === 'PRESENT' ? 'badge-green' : 'badge-red'}`}>{l.new_status}</span>
                      </div>
                    </td>
                    <td className="table-cell">{l.changed_by}</td>
                    <td className="table-cell text-gray-500 max-w-xs truncate">{l.reason || '—'}</td>
                    <td className="table-cell text-xs text-gray-500">{l.timestamp ? format(new Date(l.timestamp), 'dd MMM yyyy HH:mm') : '—'}</td>
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
          <button className="btn-secondary btn-sm" disabled={logs.length < 30} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
