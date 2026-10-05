import React, { useEffect, useState } from 'react'
import { studentApi, deptApi, classApi } from '../../services/api'
import { Student, Department, Class } from '../../types'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, UserCheck } from 'lucide-react'

const defaultForm = {
  student_id: '', roll_number: '', full_name: '', email: '', phone: '',
  department_id: '', year: '1', division: '', class_ids: [] as number[],
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([studentApi.list({ search }), deptApi.list(), classApi.list()])
      .then(([s, d, c]) => { setStudents(s); setDepts(d); setClasses(c) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  const openCreate = () => { setEditId(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (s: Student) => {
    setEditId(s.id)
    setForm({
      student_id: s.student_id, roll_number: s.roll_number,
      full_name: s.full_name, email: s.email, phone: s.phone || '',
      department_id: String(s.department_id), year: String(s.year),
      division: s.division || '', class_ids: [],
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.student_id || !form.full_name || !form.email || !form.department_id) {
      return toast.error('Please fill required fields')
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        department_id: Number(form.department_id),
        year: Number(form.year),
      }
      if (editId) {
        await studentApi.update(editId, payload)
        toast.success('Student updated')
      } else {
        await studentApi.create(payload)
        toast.success('Student created — default password: Student@123')
      }
      setModalOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await studentApi.delete(deleteId)
    toast.success('Student deactivated')
    setDeleteId(null)
    load()
  }

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-1">{students.length} students registered</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Student</button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search by name, student ID or roll number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : students.length === 0 ? (
          <EmptyState title="No students found" description="Add students to get started" action={<button className="btn-primary" onClick={openCreate}><Plus size={14} />Add Student</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Roll', 'Name', 'Student ID', 'Department', 'Year', 'Face', 'Status', ''].map(h => (
                    <th key={h} className="table-header">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-cell font-mono font-medium">{s.roll_number}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xs flex-shrink-0">
                          {s.full_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs">{s.student_id}</td>
                    <td className="table-cell text-gray-600">{s.department_name}</td>
                    <td className="table-cell">Year {s.year}{s.division ? ` - ${s.division}` : ''}</td>
                    <td className="table-cell">
                      {s.face_registered
                        ? <span className="badge-green flex items-center gap-1 w-fit"><CheckCircle size={10} />Registered</span>
                        : <span className="badge-yellow flex items-center gap-1 w-fit"><XCircle size={10} />Not Registered</span>}
                    </td>
                    <td className="table-cell">
                      <Badge variant={s.is_active ? 'green' : 'red'}>{s.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(s)} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={() => setDeleteId(s.id)} title="Deactivate">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Student' : 'Add New Student'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Student ID *</label>
            <input className="input" value={form.student_id} onChange={(e) => f('student_id', e.target.value)} placeholder="2024CSE001" disabled={!!editId} />
          </div>
          <div>
            <label className="label">Roll Number *</label>
            <input className="input" value={form.roll_number} onChange={(e) => f('roll_number', e.target.value)} placeholder="01" />
          </div>
          <div className="col-span-2">
            <label className="label">Full Name *</label>
            <input className="input" value={form.full_name} onChange={(e) => f('full_name', e.target.value)} placeholder="Rahul Verma" />
          </div>
          <div>
            <label className="label">Email *</label>
            <input className="input" type="email" value={form.email} onChange={(e) => f('email', e.target.value)} placeholder="student@email.com" disabled={!!editId} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => f('phone', e.target.value)} placeholder="+91 9999999999" />
          </div>
          <div>
            <label className="label">Department *</label>
            <select className="input" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}>
              <option value="">Select department</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year *</label>
            <select className="input" value={form.year} onChange={(e) => f('year', e.target.value)}>
              {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Division</label>
            <input className="input" value={form.division} onChange={(e) => f('division', e.target.value)} placeholder="A / B / C" />
          </div>
        </div>
        {!editId && (
          <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mt-4">
            Default password: <strong>Student@123</strong>
          </p>
        )}
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editId ? 'Update Student' : 'Add Student'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Deactivate Student"
        message="This will deactivate the student's account. They will not be able to log in. You can reactivate them later."
        confirmLabel="Deactivate"
        danger
      />
    </div>
  )
}
