import React, { useEffect, useState } from 'react'
import { classApi, subjectApi, attendanceApi } from '../../services/api'
import { Class, Subject, SessionStudent } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { CheckCircle, XCircle, Search, Users, Save, RefreshCw } from 'lucide-react'

export default function ManualAttendance() {
  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [lecture, setLecture] = useState('1')
  const [session, setSession] = useState<any>(null)
  const [students, setStudents] = useState<SessionStudent[]>([])
  const [attendance, setAttendance] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)

  useEffect(() => {
    Promise.all([classApi.list(), subjectApi.list()])
      .then(([c, s]) => { setClasses(c); setSubjects(s) })
  }, [])

  const filteredSubjects = subjects.filter((s) => !selectedClass || s.class_id === Number(selectedClass))

  const startSession = async () => {
    if (!selectedClass || !selectedSubject) return toast.error('Select class and subject')
    setLoading(true)
    try {
      const sess = await attendanceApi.createSession({
        class_id: Number(selectedClass),
        subject_id: Number(selectedSubject),
        date: selectedDate,
        lecture_number: Number(lecture),
        method: 'MANUAL',
      })
      setSession(sess)

      const studs = await attendanceApi.getSessionStudents(sess.id)
      setStudents(studs)

      // Pre-fill existing attendance
      const init: Record<number, 'PRESENT' | 'ABSENT'> = {}
      studs.forEach((s: SessionStudent) => {
        init[s.student_id] = s.status || 'ABSENT'
      })
      setAttendance(init)
      setSessionStarted(true)
    } finally { setLoading(false) }
  }

  const toggle = (id: number) => {
    setAttendance((p) => ({ ...p, [id]: p[id] === 'PRESENT' ? 'ABSENT' : 'PRESENT' }))
  }

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const all: Record<number, 'PRESENT' | 'ABSENT'> = {}
    students.forEach((s) => { all[s.student_id] = status })
    setAttendance(all)
  }

  const saveAttendance = async () => {
    if (!session) return
    setSaving(true)
    try {
      const records = students.map((s) => ({
        student_id: s.student_id,
        status: attendance[s.student_id] || 'ABSENT',
        method: 'MANUAL',
      }))
      await attendanceApi.mark(session.id, records)
      await attendanceApi.closeSession(session.id)
      toast.success('✅ Attendance saved successfully!')
      // Reset
      setSessionStarted(false)
      setSession(null)
      setStudents([])
      setAttendance({})
    } finally { setSaving(false) }
  }

  const filteredStudents = students.filter((s) =>
    !search || s.student_name.toLowerCase().includes(search.toLowerCase()) || s.roll_number.includes(search)
  )

  const presentCount = Object.values(attendance).filter((v) => v === 'PRESENT').length
  const absentCount = students.length - presentCount

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manual Attendance</h1>
        <p className="text-sm text-gray-500 mt-1">Mark attendance for your class</p>
      </div>

      {/* Session Setup */}
      {!sessionStarted ? (
        <div className="card max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Create Attendance Session</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Class *</label>
              <select className="input" value={selectedClass} onChange={(e) => { setSelectedClass(e.target.value); setSelectedSubject('') }}>
                <option value="">Select class</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject *</label>
              <select className="input" value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">Select subject</option>
                {filteredSubjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Lecture #</label>
              <select className="input" value={lecture} onChange={(e) => setLecture(e.target.value)}>
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Lecture {n}</option>)}
              </select>
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" onClick={startSession} disabled={loading}>
            {loading ? 'Loading students...' : 'Start Attendance'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Session header */}
          <div className="card bg-primary-50 border-primary-100">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="font-semibold text-primary-900">{session?.class_name} — {session?.subject_name}</p>
                <p className="text-sm text-primary-700 mt-0.5">{session?.date} · Lecture {session?.lecture_number}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-700 font-semibold"><CheckCircle size={16} />{presentCount} Present</span>
                <span className="flex items-center gap-1.5 text-red-600 font-semibold"><XCircle size={16} />{absentCount} Absent</span>
                <span className="text-gray-500">{students.length} Total</span>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-9" placeholder="Search student..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn-success btn-sm" onClick={() => markAll('PRESENT')}><CheckCircle size={14} />All Present</button>
              <button className="btn-danger btn-sm" onClick={() => markAll('ABSENT')}><XCircle size={14} />All Absent</button>
              <button className="btn-secondary btn-sm" onClick={() => { setAttendance({}); }}><RefreshCw size={14} />Reset</button>
            </div>
          </div>

          {/* Student list */}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="table-header w-16">Roll</th>
                    <th className="table-header">Student</th>
                    <th className="table-header text-center">Face</th>
                    <th className="table-header text-center">Present</th>
                    <th className="table-header text-center">Absent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStudents.map((s) => {
                    const status = attendance[s.student_id] || 'ABSENT'
                    return (
                      <tr key={s.student_id} className={`transition-colors ${status === 'PRESENT' ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}>
                        <td className="table-cell font-mono font-bold text-gray-700">{s.roll_number}</td>
                        <td className="table-cell">
                          <p className="font-medium text-gray-900">{s.student_name}</p>
                          <p className="text-xs text-gray-500">{s.student_uid}</p>
                        </td>
                        <td className="table-cell text-center">
                          {s.face_registered
                            ? <span className="badge-green text-xs">✓ Registered</span>
                            : <span className="badge-yellow text-xs">⚠ Not Reg.</span>}
                        </td>
                        <td className="table-cell text-center">
                          <button
                            onClick={() => setAttendance((p) => ({ ...p, [s.student_id]: 'PRESENT' }))}
                            className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto transition-all ${status === 'PRESENT' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-emerald-100'}`}
                          >
                            <CheckCircle size={18} />
                          </button>
                        </td>
                        <td className="table-cell text-center">
                          <button
                            onClick={() => setAttendance((p) => ({ ...p, [s.student_id]: 'ABSENT' }))}
                            className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto transition-all ${status === 'ABSENT' ? 'bg-red-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-red-100'}`}
                          >
                            <XCircle size={18} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button className="btn-secondary" onClick={() => { setSessionStarted(false); setSession(null); setStudents([]) }}>← Back</button>
            <button className="btn-primary px-8" onClick={saveAttendance} disabled={saving}>
              <Save size={16} />{saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
