import React, { useEffect, useState } from 'react'
import { studentApi } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { Student } from '../../types'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { CheckCircle, XCircle, Mail, Phone, GraduationCap } from 'lucide-react'

export default function StudentProfile() {
  const { user } = useAuth()
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    studentApi.list({ per_page: 200 }).then((students: any[]) => {
      const me = students.find((s: any) => s.user_id === user?.id)
      if (me) setStudent(me)
    }).finally(() => setLoading(false))
  }, [user])

  if (loading) return <LoadingSpinner />
  if (!student) return <div className="card text-center py-8 text-gray-400">Profile not found</div>

  return (
    <div className="max-w-2xl space-y-5 fade-in">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="card">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-3xl font-bold">
            {student.full_name[0]}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{student.full_name}</h2>
            <p className="text-gray-500">{student.student_id} · Roll #{student.roll_number}</p>
            <div className="flex items-center gap-2 mt-2">
              {student.face_registered
                ? <span className="badge-green flex items-center gap-1"><CheckCircle size={11} />Face Registered</span>
                : <span className="badge-yellow flex items-center gap-1"><XCircle size={11} />Face Not Registered</span>}
              <span className={student.is_active ? 'badge-green' : 'badge-red'}>{student.is_active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          {[
            { icon: <Mail size={14} />, label: 'Email', value: student.email },
            { icon: <Phone size={14} />, label: 'Phone', value: student.phone || '—' },
            { icon: <GraduationCap size={14} />, label: 'Department', value: student.department_name },
            { icon: <GraduationCap size={14} />, label: 'Year & Division', value: `Year ${student.year}${student.division ? ` - ${student.division}` : ''}` },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>
              <div>
                <p className="text-xs text-gray-500">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!student.face_registered && (
        <div className="card bg-yellow-50 border-yellow-200">
          <p className="text-sm font-semibold text-yellow-800 mb-1">Face Not Registered</p>
          <p className="text-xs text-yellow-700">Your face has not been registered for face recognition attendance. Contact your teacher or department office to get your face registered.</p>
        </div>
      )}

      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm font-semibold text-blue-800 mb-1">Privacy Notice</p>
        <p className="text-xs text-blue-700">Your face data is stored as mathematical embeddings only. Raw images are not stored after processing. Face data is used exclusively for attendance marking and can be deleted on request.</p>
      </div>
    </div>
  )
}
