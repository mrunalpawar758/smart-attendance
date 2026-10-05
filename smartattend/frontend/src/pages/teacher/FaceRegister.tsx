import React, { useRef, useState, useEffect } from 'react'
import Webcam from 'react-webcam'
import { studentApi, faceApi } from '../../services/api'
import { Student } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Camera, CameraOff, Image as ImageIcon, Trash2, CheckCircle, AlertTriangle, Search } from 'lucide-react'

export default function FaceRegister() {
  const webcamRef = useRef<Webcam>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [faceProfile, setFaceProfile] = useState<any>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [capturedImages, setCapturedImages] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    studentApi.list({ per_page: 200 }).then(setStudents)
  }, [])

  const filteredStudents = students.filter((s) =>
    !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search) || s.roll_number.includes(search)
  )

  const selectStudent = async (s: Student) => {
    setSelectedStudent(s)
    setCapturedImages([])
    const profile = await faceApi.profile(s.id).catch(() => null)
    setFaceProfile(profile)
  }

  const capture = () => {
    if (!webcamRef.current) return
    const img = webcamRef.current.getScreenshot()
    if (!img) return toast.error('Could not capture image')
    if (capturedImages.length >= 8) return toast.error('Maximum 8 samples. Remove some first.')
    setCapturedImages((p) => [...p, img])
    toast.success(`Sample ${capturedImages.length + 1} captured`, { duration: 1500 })
  }

  const removeImage = (i: number) => setCapturedImages((p) => p.filter((_, idx) => idx !== i))

  const saveProfile = async () => {
    if (!selectedStudent || capturedImages.length < 3) return toast.error('Capture at least 3 samples')
    setSaving(true)
    try {
      const result = await faceApi.register(selectedStudent.id, capturedImages)
      if (result.success) {
        toast.success(`Face registered! ${result.encodings_saved} encodings saved.`)
        setCapturedImages([])
        const profile = await faceApi.profile(selectedStudent.id)
        setFaceProfile(profile)
        // refresh student list
        studentApi.list({ per_page: 200 }).then(setStudents)
      }
    } finally { setSaving(false) }
  }

  const deleteProfile = async () => {
    if (!selectedStudent) return
    await faceApi.deleteProfile(selectedStudent.id)
    toast.success('Face profile removed')
    setFaceProfile(null)
    studentApi.list({ per_page: 200 }).then(setStudents)
  }

  return (
    <div className="space-y-5 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Face Registration</h1>
        <p className="text-sm text-gray-500 mt-1">Register student face profiles for attendance recognition</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Student list */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input pl-8 py-2 text-xs" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {filteredStudents.map((s) => (
              <button key={s.id} onClick={() => selectStudent(s)}
                className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 text-left hover:bg-gray-50 transition-colors ${selectedStudent?.id === s.id ? 'bg-primary-50 border-l-2 border-l-primary-600' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">{s.full_name[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.roll_number} · {s.student_id}</p>
                </div>
                {s.face_registered ? <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" /> : <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>

        {/* Registration area */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedStudent ? (
            <div className="card flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <Camera size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Select a student from the list</p>
              </div>
            </div>
          ) : (
            <>
              {/* Student info */}
              <div className="card flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold">{selectedStudent.full_name[0]}</div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{selectedStudent.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedStudent.student_id} · Roll {selectedStudent.roll_number}</p>
                </div>
                {faceProfile?.face_registered ? (
                  <div className="text-right">
                    <span className="badge-green">✓ {faceProfile.sample_count} samples registered</span>
                    <button className="block mt-1 text-xs text-red-500 hover:underline" onClick={deleteProfile}>Remove profile</button>
                  </div>
                ) : (
                  <span className="badge-yellow">⚠ Not registered</span>
                )}
              </div>

              {/* Instructions */}
              <div className="card bg-blue-50 border-blue-200">
                <p className="text-sm font-semibold text-blue-800 mb-2">📷 Face Capture Instructions</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Look directly at the camera for the first sample</li>
                  <li>Slightly turn left, right, and tilt for variety</li>
                  <li>Ensure good lighting — no strong backlight</li>
                  <li>Remove glasses or obstructions if possible</li>
                  <li>Capture at least 3 samples (5+ recommended)</li>
                </ul>
              </div>

              {/* Camera */}
              <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video">
                {cameraOn && !cameraError ? (
                  <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" className="w-full h-full object-cover" onUserMediaError={() => setCameraError(true)} />
                ) : cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center">
                    <CameraOff size={40} className="mb-2 text-gray-400" />
                    <p className="font-medium">Camera unavailable</p>
                    <p className="text-xs text-gray-400 mt-1">Grant camera permission in browser settings</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <Camera size={40} className="mb-2 opacity-40" />
                    <p className="text-sm">Camera off</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button className={`btn ${cameraOn ? 'btn-danger' : 'btn-primary'} flex-1`} onClick={() => { setCameraOn(!cameraOn); setCameraError(false) }}>
                  {cameraOn ? <><CameraOff size={15} />Stop Camera</> : <><Camera size={15} />Start Camera</>}
                </button>
                {cameraOn && <button className="btn-success flex-1" onClick={capture} disabled={capturedImages.length >= 8}><ImageIcon size={15} />Capture Sample ({capturedImages.length}/8)</button>}
              </div>

              {/* Thumbnails */}
              {capturedImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {capturedImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt={`sample ${i + 1}`} className="rounded-xl w-full aspect-square object-cover" />
                      <button onClick={() => removeImage(i)}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={10} />
                      </button>
                      <span className="absolute bottom-1 left-1 text-xs bg-black/60 text-white px-1 rounded">{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {capturedImages.length >= 3 && (
                <button className="btn-primary w-full" onClick={saveProfile} disabled={saving}>
                  <CheckCircle size={16} />{saving ? 'Processing & Saving...' : `Save Face Profile (${capturedImages.length} samples)`}
                </button>
              )}
              {capturedImages.length > 0 && capturedImages.length < 3 && (
                <p className="text-xs text-yellow-600 text-center">Capture at least {3 - capturedImages.length} more sample(s)</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
