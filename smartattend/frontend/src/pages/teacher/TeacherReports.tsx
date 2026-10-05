import React, { useEffect, useState } from 'react'
import { reportApi, classApi, subjectApi } from '../../services/api'
import { Class, Subject } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function TeacherReports() {
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { Promise.all([classApi.list(), subjectApi.list()]).then(([c, s]) => { setClasses(c); setSubjects(s) }) }, [])

  const loadReport = async () => {
    if (!selectedClass) return toast.error('Select a class')
    setLoading(true)
    try {
      const data = await reportApi.class(Number(selectedClass), { subject_id: selectedSubject || undefined })
      setReport(data)
    } finally { setLoading(false) }
  }

  const exportCsv = async () => {
    if (!selectedClass) return
    const blob = await reportApi.exportCsv(Number(selectedClass))
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `attendance_class_${selectedClass}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Report downloaded')
  }

  const chartData = report?.students?.slice(0, 20).map((s: any) => ({
    name: s.roll_number,
    Attendance: s.percentage,
    isLow: s.is_low,
  })) || []

  return (
    <div className="space-y-5 fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">Attendance Reports</h1></div>

      <div className="card max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Class *</label>
            <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
              <option value="">Select class</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject (optional)</label>
            <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">All subjects</option>
              {subjects.filter(s => !selectedClass || s.class_id === Number(selectedClass)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn-primary flex-1" onClick={loadReport} disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
          {report && <button className="btn-secondary" onClick={exportCsv}><Download size={15} />Export CSV</button>}
        </div>
      </div>

      {loading && <LoadingSpinner text="Generating report..." />}

      {report && !loading && (
        <>
          {/* Bar chart */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Attendance % by Student (Roll No.)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: number | string) => [`${v}%`, 'Attendance']} />
                <Bar dataKey="Attendance" radius={[4, 4, 0, 0]}>
                  {chartData.map((d: any, i: number) => <Cell key={i} fill={d.isLow ? '#ef4444' : '#10b981'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-400 mt-1"><span className="text-emerald-600 font-medium">■ Green</span> = above threshold · <span className="text-red-500 font-medium">■ Red</span> = below threshold ({report.threshold}%)</p>
          </div>

          {/* Table */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Roll', 'Name', 'Total', 'Present', 'Absent', '%', 'Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {report.students.map((s: any) => (
                    <tr key={s.roll_number} className={s.is_low ? 'bg-red-50/50' : 'hover:bg-gray-50'}>
                      <td className="table-cell font-mono">{s.roll_number}</td>
                      <td className="table-cell font-medium">{s.full_name}</td>
                      <td className="table-cell">{s.total}</td>
                      <td className="table-cell text-emerald-700 font-semibold">{s.present}</td>
                      <td className="table-cell text-red-600">{s.absent}</td>
                      <td className="table-cell">
                        <span className={`font-bold ${s.is_low ? 'text-red-600' : 'text-emerald-700'}`}>{s.percentage}%</span>
                      </td>
                      <td className="table-cell">
                        {s.is_low ? <span className="badge-red">⚠ Low</span> : <span className="badge-green">✓ OK</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
