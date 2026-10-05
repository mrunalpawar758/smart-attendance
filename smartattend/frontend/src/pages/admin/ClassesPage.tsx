import React, { useEffect, useState } from 'react'
import { classApi, deptApi } from '../../services/api'
import { Class, Department } from '../../types'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Users } from 'lucide-react'

const defaultForm = { name: '', code: '', year: '1', division: '', semester: '', department_id: '' }

export default function ClassesPage() {
  const [classes, setClasses] = useState<Class[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([classApi.list(), deptApi.list()])
      .then(([c, d]) => { setClasses(c); setDepts(d) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditId(null); setForm(defaultForm); setModalOpen(true) }
  const openEdit = (c: Class) => {
    setEditId(c.id)
    setForm({ name: c.name, code: c.code, year: String(c.year), division: c.division || '', semester: String(c.semester || ''), department_id: String(c.department_id) })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.department_id) return toast.error('Please fill required fields')
    setSaving(true)
    try {
      const payload = { ...form, year: Number(form.year), semester: form.semester ? Number(form.semester) : undefined, department_id: Number(form.department_id) }
      if (editId) { await classApi.update(editId, payload); toast.success('Class updated') }
      else { await classApi.create(payload); toast.success('Class created') }
      setModalOpen(false); load()
    } finally { setSaving(false) }
  }

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Classes</h1><p className="text-sm text-gray-500 mt-1">{classes.length} classes</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Class</button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? <LoadingSpinner /> : classes.length === 0 ? (
          <EmptyState title="No classes found" />
        ) : classes.map((c) => (
          <div key={c.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm">{c.code.slice(0, 2)}</div>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(c)}><Edit2 size={13} /></button>
                <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-500" onClick={async () => { await classApi.delete(c.id); toast.success('Deactivated'); load() }}><Trash2 size={13} /></button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900">{c.name}</h3>
            <p className="text-xs text-gray-500 mt-1">{c.code} · {c.department_name}</p>
            <div className="flex items-center gap-1 mt-3 text-sm text-gray-600">
              <Users size={13} />
              <span>{c.student_count} students</span>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Class' : 'Add Class'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Class Name *</label><input className="input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="CSE Third Year A" /></div>
            <div><label className="label">Code *</label><input className="input" value={form.code} onChange={(e) => f('code', e.target.value)} placeholder="CSE-3A" /></div>
            <div><label className="label">Department *</label>
              <select className="input" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}>
                <option value="">Select</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="label">Year *</label>
              <select className="input" value={form.year} onChange={(e) => f('year', e.target.value)}>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div><label className="label">Division</label><input className="input" value={form.division} onChange={(e) => f('division', e.target.value)} placeholder="A" /></div>
            <div><label className="label">Semester</label><input className="input" type="number" value={form.semester} onChange={(e) => f('semester', e.target.value)} placeholder="5" /></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}
