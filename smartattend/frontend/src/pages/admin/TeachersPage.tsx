import React, { useEffect, useState } from 'react'
import { teacherApi, deptApi, subjectApi } from '../../services/api'
import { Teacher, Department, Subject } from '../../types'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import toast from 'react-hot-toast'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'

const defaultForm = {
  teacher_id: '', full_name: '', email: '', phone: '',
  department_id: '', designation: '', qualification: '', subject_ids: [] as number[],
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([teacherApi.list({ search }), deptApi.list(), subjectApi.list()])
      .then(([t, d, s]) => { setTeachers(t); setDepts(d); setSubjects(s) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [search])

  const openCreate = () => { setEditId(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (t: Teacher) => {
    setEditId(t.id)
    setForm({
      teacher_id: t.teacher_id, full_name: t.full_name, email: t.email,
      phone: t.phone || '', department_id: String(t.department_id),
      designation: t.designation || '', qualification: t.qualification || '',
      subject_ids: [],
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.teacher_id || !form.full_name || !form.email || !form.department_id)
      return toast.error('Please fill required fields')
    setSaving(true)
    try {
      const payload = { ...form, department_id: Number(form.department_id) }
      if (editId) { await teacherApi.update(editId, payload); toast.success('Teacher updated') }
      else { await teacherApi.create(payload); toast.success('Teacher created — default password: Teacher@123') }
      setModalOpen(false); load()
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    await teacherApi.delete(deleteId)
    toast.success('Teacher deactivated'); setDeleteId(null); load()
  }

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const toggleSubject = (id: number) => {
    setForm((p) => ({
      ...p,
      subject_ids: p.subject_ids.includes(id) ? p.subject_ids.filter((s) => s !== id) : [...p.subject_ids, id],
    }))
  }

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
          <p className="text-sm text-gray-500 mt-1">{teachers.length} teachers registered</p>
        </div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Teacher</button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : teachers.length === 0 ? (
          <EmptyState title="No teachers found" action={<button className="btn-primary" onClick={openCreate}><Plus size={14} />Add Teacher</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name', 'Teacher ID', 'Department', 'Designation', 'Subjects', 'Status', ''].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-xs">{t.full_name[0]}</div>
                        <div><p className="font-medium text-gray-900">{t.full_name}</p><p className="text-xs text-gray-500">{t.email}</p></div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs">{t.teacher_id}</td>
                    <td className="table-cell">{t.department_name}</td>
                    <td className="table-cell text-gray-600">{t.designation || '—'}</td>
                    <td className="table-cell"><span className="badge-blue">{t.subject_count} subjects</span></td>
                    <td className="table-cell"><Badge variant={t.is_active ? 'green' : 'red'}>{t.is_active ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(t)}><Edit2 size={14} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={() => setDeleteId(t.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Teacher' : 'Add New Teacher'} size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Teacher ID *</label><input className="input" value={form.teacher_id} onChange={(e) => f('teacher_id', e.target.value)} placeholder="T001" /></div>
          <div><label className="label">Full Name *</label><input className="input" value={form.full_name} onChange={(e) => f('full_name', e.target.value)} /></div>
          <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={(e) => f('email', e.target.value)} disabled={!!editId} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={(e) => f('phone', e.target.value)} /></div>
          <div><label className="label">Department *</label>
            <select className="input" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}>
              <option value="">Select</option>
              {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Designation</label><input className="input" value={form.designation} onChange={(e) => f('designation', e.target.value)} /></div>
          <div className="col-span-2">
            <label className="label">Assign Subjects</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {subjects.map((s) => (
                <button key={s.id} type="button"
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${form.subject_ids.includes(s.id) ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}`}
                  onClick={() => toggleSubject(s.id)}>
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        {!editId && <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg mt-4">Default password: <strong>Teacher@123</strong></p>}
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add Teacher'}</button>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Deactivate Teacher" message="Deactivate this teacher account?" confirmLabel="Deactivate" danger />
    </div>
  )
}
