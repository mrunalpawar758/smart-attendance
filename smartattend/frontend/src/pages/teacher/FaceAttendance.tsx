import React, { useEffect, useRef, useState, useCallback } from 'react'
import Webcam from 'react-webcam'
import { classApi, subjectApi, attendanceApi, faceApi } from '../../services/api'
import { Class, Subject, SessionStudent } from '../../types'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Camera, CameraOff, Play, Pause, CheckCircle, XCircle, AlertTriangle, RefreshCw, Users, ArrowRight } from 'lucide-react'

type RecognitionResult = {
  status: 'RECOGNIZED' | 'UNKNOWN' | 'LOW_CONFIDENCE' | 'UNAVAILABLE' | 'ERROR'
  student_id?: number
  student_name?: string
  roll_number?: string
  confidence?: number
  marked_present?: boolean
  message?: string
}

export default function FaceAttendance() {
  const webcamRef = useRef<Webcam>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [classes, setClasses] = useState<Class[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [faceStatus, setFaceStatus] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [session, setSession] = useState<any>(null)
  const [sessionStudents, setSessionStudents] = useState<SessionStudent[]>([])
  const [attendance, setAttendance] = useState<Record<number, 'PRESENT' | 'ABSENT'>>({})
  const [cameraOn, setCameraOn] = useState(false)
  const [recognizing, setRecognizing] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RecognitionResult[]>([])
  const [switchToManual, setSwitchToManual] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([classApi.list(), subjectApi.list(), faceApi.status()])
      .then(([c, s, fs]) => { setClasses(c); setSubjects(s); setFaceStatus(fs) })
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
        lecture_number: 1,
        method: 'HYBRID',
      })
      setSession(sess)
      const studs = await attendanceApi.getSessionStudents(sess.id)
      setSessionStudents(studs)
      const init: Record<number, 'PRESENT' | 'ABSENT'> = {}
      studs.forEach((s: SessionStudent) => { init[s.student_id] = s.status || 'ABSENT' })
      setAttendance(init)
      setSessionStarted(true)
      setCameraOn(true)
    } finally { setLoading(false) }
  }

  const capture = useCallback(async () => {
    if (!webcamRef.current || !session) return
    const imageSrc = webcamRef.current.getScreenshot()
    if (!imageSrc) return

    try {
      const data = await faceApi.recognize(session.id, Number(selectedClass), imageSrc)
      const r: RecognitionResult[] = data.results || []
      setResults(r)
      r.forEach((res) => {
        if (res.status === 'RECOGNIZED' && res.student_id && res.marked_present) {
          setAttendance((prev) => {
            if (prev[res.student_id!] !== 'PRESENT') {
              toast.success(`✓ ${res.student_name} recognized (${(res.confidence! * 100).toFixed(0)}%)`, { duration: 2000 })
              return { ...prev, [res.student_id!]: 'PRESENT' }
            }
            return prev
          })
        }
      })
    } catch { /* recognition errors are non-fatal */ }
  }, [session, selectedClass])

  const startRecognition = () => {
    setRecognizing(true)
    intervalRef.current = setInterval(capture, 2500)
    toast('🔍 Face recognition active — scanning every 2.5s', { icon: '📷' })
  }

  const stopRecognition = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRecognizing(false)
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  const saveAndFinish = async () => {
    if (!session) return
    setSaving(true)
    try {
      const records = sessionStudents.map((s) => ({
        student_id: s.student_id,
        status: attendance[s.student_id] || 'ABSENT',
        method: attendance[s.student_id] === 'PRESENT' ? 'FACE' : 'MANUAL',
      }))
      await attendanceApi.mark(session.id, records)
      await attendanceApi.closeSession(session.id)
      toast.success('Attendance saved!')
      setSessionStarted(false); setSession(null); setResults([]); setCameraOn(false); stopRecognition()
    } finally { setSaving(false) }
  }

  const presentCount = Object.values(attendance).filter((v) => v === 'PRESENT').length
  const unrecognized = sessionStudents.filter((s) => !attendance[s.student_id] || attendance[s.student_id] === 'ABSENT')

  if (!sessionStarted) {
    return (
      <div className="space-y-5 fade-in">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Face Recognition Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">Automatically mark attendance using face recognition</p>
        </div>

        {faceStatus && !faceStatus.available && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
            <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-yellow-800">Face Recognition Not Available</p>
              <p className="text-xs text-yellow-700 mt-1">{faceStatus.message}</p>
              <p className="text-xs text-yellow-700 mt-1">You can still use <strong>Hybrid mode</strong> — the session will be created and unrecognized students can be marked manually.</p>
            </div>
          </div>
        )}

        <div className="card max-w-2xl">
          <h2 className="font-semibold text-gray-900 mb-4">Setup Recognition Session</h2>
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
              <label className="label">Date</label>
              <input className="input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </div>
          <button className="btn-primary mt-5 w-full" onClick={startSession} disabled={loading}>
            <Camera size={16} />{loading ? 'Setting up...' : 'Start Face Recognition Session'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 flex-1">Face Attendance — Hybrid Mode</h1>
        <button className="btn-secondary btn-sm" onClick={() => { setSwitchToManual(!switchToManual) }}>
          {switchToManual ? 'Hide Manual Override' : 'Manual Override'}
        </button>
      </div>

      <div className="card bg-primary-50 border-primary-100">
        <div className="flex flex-wrap gap-4 justify-between items-center">
          <div>
            <p className="font-semibold text-primary-900">{session?.class_name} · {session?.subject_name}</p>
            <p className="text-sm text-primary-700">{session?.date}</p>
          </div>
          <div className="flex gap-4 text-sm font-semibold">
            <span className="text-emerald-700">✓ {presentCount} Present</span>
            <span className="text-red-600">✗ {sessionStudents.length - presentCount} Absent</span>
            <span className="text-gray-500">{sessionStudents.length} Total</span>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Camera side */}
        <div className="space-y-3">
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            {cameraOn && !cameraError ? (
              <Webcam
                ref={webcamRef}
                audio={false}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                onUserMediaError={() => setCameraError(true)}
              />
            ) : cameraError ? (
              <div className="text-center text-white p-8">
                <CameraOff size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium">Camera unavailable</p>
                <p className="text-sm text-gray-400 mt-1">Grant camera permission or use manual attendance</p>
              </div>
            ) : (
              <div className="text-center text-gray-400 p-8">
                <Camera size={48} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Camera off</p>
              </div>
            )}
            {recognizing && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full animate-pulse">
                <span className="w-2 h-2 bg-white rounded-full" />
                LIVE SCANNING
              </div>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button className={`btn flex-1 ${cameraOn ? 'btn-danger' : 'btn-primary'}`} onClick={() => { setCameraOn(!cameraOn); if (recognizing) stopRecognition() }}>
              {cameraOn ? <><CameraOff size={15} />Stop Camera</> : <><Camera size={15} />Start Camera</>}
            </button>
            {cameraOn && (
              <button className={`btn flex-1 ${recognizing ? 'btn-secondary' : 'btn-success'}`} onClick={recognizing ? stopRecognition : startRecognition} disabled={!faceStatus?.available}>
                {recognizing ? <><Pause size={15} />Pause</> : <><Play size={15} />Start Recognition</>}
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="card p-3">
              <p className="text-xs font-semibold text-gray-500 mb-2">LAST SCAN RESULTS</p>
              <div className="space-y-1">
                {results.map((r, i) => (
                  <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg ${r.status === 'RECOGNIZED' ? 'bg-emerald-50 text-emerald-800' : 'bg-yellow-50 text-yellow-800'}`}>
                    {r.status === 'RECOGNIZED' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                    <span className="font-medium">{r.student_name || 'Unknown face'}</span>
                    {r.confidence && <span className="ml-auto opacity-70">{(r.confidence * 100).toFixed(0)}%</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Attendance status side */}
        <div className="space-y-3">
          <div className="card p-0 overflow-hidden max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gray-50 border-b border-gray-100 px-4 py-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance Status</p>
            </div>
            {sessionStudents.map((s) => {
              const status = attendance[s.student_id] || 'ABSENT'
              return (
                <div key={s.student_id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 ${status === 'PRESENT' ? 'bg-emerald-50/40' : ''}`}>
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                    {s.roll_number}
                  </div>
                  <p className="text-sm font-medium text-gray-900 flex-1">{s.student_name}</p>
                  {switchToManual ? (
                    <div className="flex gap-1">
                      <button onClick={() => setAttendance((p) => ({ ...p, [s.student_id]: 'PRESENT' }))}
                        className={`p-1 rounded-lg ${status === 'PRESENT' ? 'text-emerald-600 bg-emerald-100' : 'text-gray-400 hover:text-emerald-600'}`}>
                        <CheckCircle size={16} />
                      </button>
                      <button onClick={() => setAttendance((p) => ({ ...p, [s.student_id]: 'ABSENT' }))}
                        className={`p-1 rounded-lg ${status === 'ABSENT' ? 'text-red-500 bg-red-100' : 'text-gray-400 hover:text-red-500'}`}>
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {status === 'PRESENT' ? '✓ Present' : '✗ Absent'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {unrecognized.length > 0 && (
            <div className="card border-yellow-200 bg-yellow-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-yellow-600" size={16} />
                <p className="text-sm font-semibold text-yellow-800">{unrecognized.length} Not Recognized — Manual Override Available</p>
              </div>
              <p className="text-xs text-yellow-700">Enable Manual Override above to mark these students.</p>
            </div>
          )}

          <button className="btn-primary w-full" onClick={saveAndFinish} disabled={saving}>
            <CheckCircle size={16} />{saving ? 'Saving...' : 'Complete & Save Attendance'}
          </button>
        </div>
      </div>
    </div>
  )
}
