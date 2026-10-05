import React, { useEffect, useState } from 'react'
import { reportApi, classApi, subjectApi, studentApi } from '../../services/api'
import { Class, Subject, Student } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Download, BarChart3, Users, BookOpen, Calendar } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

type ReportType = 'class' | 'subject' | 'student' | 'daily'

export default function ReportsAdmin() {
  const [reportType, setReportType] = useState<ReportType>('class')
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([classApi.list(), subjectApi.list(), studentApi.list({ per_page: 200 })])
      .then(([c, s, st]) => { setClasses(c); setSubjects(s); setStudents(st) })
  }, [])

  const generate = async () => {
    setLoading(true); setReport(null)
    try {
      if (reportType === 'class' && selectedClass) setReport(await reportApi.class(Number(selectedClass), { subject_id: selectedSubject || undefined }))
      else if (reportType === 'subject' && selectedSubject) setReport(await reportApi.subject(Number(selectedSubject)))
      else if (reportType === 'student' && selectedStudent) setReport(await reportApi.student(Number(selectedStudent)))
      else if (reportType === 'daily') setReport(await reportApi.daily(selectedDate))
      else toast.error('Please make a selection')
    } finally { setLoading(false) }
  }

  const exportCsv = async () => {
    if (reportType === 'class' && selectedClass) {
      const blob = await reportApi.exportCsv(Number(selectedClass))
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = 'attendance.csv'; a.click()
    }
  }

  const typeButtons = [
    { type: 'class', label: 'Class Report', icon: <Users size={16} /> },
    { type: 'subject', label: 'Subject Report', icon: <BookOpen size={16} /> },
    { type: 'student', label: 'Student Report', icon: <BarChart3 size={16} /> },
    { type: 'daily', label: 'Daily Report', icon: <Calendar size={16} /> },
  ]

  const chartData = report?.students?.slice(0, 20).map((s: any) => ({ name: s.roll_number, Pct: s.percentage, isLow: s.is_low })) || []

  return (
    <div className="space-y-5 fade-in">
      <div><h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1><p className="text-sm text-gray-500">Generate and export attendance reports</p></div>

      {/* Report type selector */}
      <div className="flex flex-wrap gap-2">
        {typeButtons.map(({ type, label, icon }) => (
          <button key={type} onClick={() => { setReportType(type as ReportType); setReport(null) }}
            className={`btn ${reportType === type ? 'btn-primary' : 'btn-secondary'}`}>
            {icon}{label}
          </button>
        ))}
      </div>

      {/* Params */}
      <div className="card max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          {(reportType === 'class' || reportType === 'subject') && (
            <div><label className="label">Class</label>
              <select className="input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">Select</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {(reportType === 'class' || reportType === 'subject') && (
            <div><label className="label">Subject {reportType === 'class' ? '(optional)' : '*'}</label>
              <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">All subjects</option>
                {subjects.filter(s => !selectedClass || s.class_id === Number(selectedClass)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {reportType === 'student' && (
            <div className="col-span-2"><label className="label">Student *</label>
              <select className="input" value={selectedStudent} onChange={(e) => setSelectedStudent(e.target.value)}>
                <option value="">Select student</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.roll_number})</option>)}
              </select>
            </div>
          )}
          {reportType === 'daily' && (
            <div><label className="label">Date</label><input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          <button className="btn-primary flex-1" onClick={generate} disabled={loading}>{loading ? 'Generating...' : 'Generate Report'}</button>
          {report && (reportType === 'class') && <button className="btn-secondary" onClick={exportCsv}><Download size={15} />CSV</button>}
        </div>
      </div>

      {loading && <LoadingSpinner text="Generating report..." />}

      {report && !loading && (
        <>
          {/* Class/Subject report */}
          {(reportType === 'class' || reportType === 'subject') && report.students && (
            <>
              <div className="card">
                <h3 className="font-semibold mb-4">Attendance % (by Roll No.)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip />
                    <Bar dataKey="Pct" radius={[4, 4, 0, 0]}>
                      {chartData.map((d: any, i: number) => <Cell key={i} fill={d.isLow ? '#ef4444' : '#10b981'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="card p-0 overflow-hidden">
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
                        <td className="table-cell text-red-500">{s.absent}</td>
                        <td className="table-cell"><span className={`font-bold ${s.is_low ? 'text-red-600' : 'text-emerald-700'}`}>{s.percentage}%</span></td>
                        <td className="table-cell">{s.is_low ? <span className="badge-red">⚠ Low</span> : <span className="badge-green">✓ OK</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Student report */}
          {reportType === 'student' && report.student && (
            <div className="space-y-4">
              <div className="card">
                <p className="font-bold text-lg">{report.student.full_name}</p>
                <p className="text-sm text-gray-500">{report.student.student_id} · {report.student.department}</p>
                <p className="text-2xl font-bold text-primary-600 mt-3">{report.overall.percentage.toFixed(1)}%</p>
                <p className="text-sm text-gray-500">Overall: {report.overall.present}/{report.overall.total_classes} classes present</p>
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Subject', 'Total', 'Present', 'Absent', '%'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.subjects.map((s: any) => (
                      <tr key={s.subject_id}><td className="table-cell font-medium">{s.subject_name}</td>
                        <td className="table-cell">{s.total_classes}</td>
                        <td className="table-cell text-emerald-600 font-bold">{s.present}</td>
                        <td className="table-cell text-red-500">{s.absent}</td>
                        <td className="table-cell"><span className={`font-bold ${s.is_low ? 'text-red-600' : 'text-emerald-600'}`}>{s.percentage}%</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Daily report */}
          {reportType === 'daily' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                {[['Sessions', report.summary.total_sessions], ['Students', report.summary.total_students], ['Present', report.summary.total_present], ['Absent', report.summary.total_absent]].map(([k, v]) => (
                  <div key={k} className="card text-center"><p className="text-2xl font-bold">{v}</p><p className="text-sm text-gray-500 mt-1">{k}</p></div>
                ))}
              </div>
              <div className="card p-0 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Class', 'Subject', 'Teacher', 'Present', 'Method', 'Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {report.sessions.map((s: any) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="table-cell font-medium">{s.class_name}</td>
                        <td className="table-cell">{s.subject_name}</td>
                        <td className="table-cell">{s.teacher}</td>
                        <td className="table-cell"><span className="text-emerald-600 font-bold">{s.present}</span>/{s.total}</td>
                        <td className="table-cell"><span className="badge-blue">{s.method}</span></td>
                        <td className="table-cell"><span className={s.status === 'CLOSED' ? 'badge-green' : 'badge-yellow'}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
