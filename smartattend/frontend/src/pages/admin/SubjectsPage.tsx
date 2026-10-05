import React, { useEffect, useState } from 'react'
import { subjectApi, deptApi, classApi } from '../../services/api'
import { Subject, Department, Class } from '../../types'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2 } from 'lucide-react'

const def = { name: '', code: '', department_id: '', class_id: '', credits: '3', description: '' }

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [depts, setDepts] = useState<Department[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(def)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([subjectApi.list(), deptApi.list(), classApi.list()])
      .then(([s, d, c]) => { setSubjects(s); setDepts(d); setClasses(c) })
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditId(null); setForm(def); setModalOpen(true) }
  const openEdit = (s: Subject) => {
    setEditId(s.id)
    setForm({ name: s.name, code: s.code, department_id: String(s.department_id), class_id: String(s.class_id || ''), credits: String(s.credits), description: s.description || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.code || !form.department_id) return toast.error('Fill required fields')
    setSaving(true)
    try {
      const payload = { ...form, department_id: Number(form.department_id), class_id: form.class_id ? Number(form.class_id) : undefined, credits: Number(form.credits) }
      if (editId) { await subjectApi.update(editId, payload); toast.success('Updated') }
      else { await subjectApi.create(payload); toast.success('Created') }
      setModalOpen(false); load()
    } finally { setSaving(false) }
  }

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Subjects</h1><p className="text-sm text-gray-500">{subjects.length} subjects</p></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Subject</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {loading ? <LoadingSpinner /> : subjects.length === 0 ? <EmptyState title="No subjects" /> : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Name', 'Code', 'Department', 'Class', 'Credits', ''].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {subjects.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">{s.name}</td>
                    <td className="table-cell font-mono text-xs">{s.code}</td>
                    <td className="table-cell">{s.department_name}</td>
                    <td className="table-cell">{s.class_name || '—'}</td>
                    <td className="table-cell">{s.credits}</td>
                    <td className="table-cell">
                      <div className="flex gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                        <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={async () => { await subjectApi.delete(s.id); toast.success('Deactivated'); load() }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Subject' : 'Add Subject'}>
        <div className="space-y-4">
          <div><label className="label">Subject Name *</label><input className="input" value={form.name} onChange={(e) => f('name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Code *</label><input className="input" value={form.code} onChange={(e) => f('code', e.target.value)} placeholder="CSE301" /></div>
            <div><label className="label">Credits</label><input className="input" type="number" value={form.credits} onChange={(e) => f('credits', e.target.value)} /></div>
            <div><label className="label">Department *</label>
              <select className="input" value={form.department_id} onChange={(e) => f('department_id', e.target.value)}>
                <option value="">Select</option>
                {depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div><label className="label">Class</label>
              <select className="input" value={form.class_id} onChange={(e) => f('class_id', e.target.value)}>
                <option value="">Optional</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Description</label><textarea className="input" rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}
