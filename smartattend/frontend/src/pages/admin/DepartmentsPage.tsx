import React, { useEffect, useState } from 'react'
import { deptApi } from '../../services/api'
import { Department } from '../../types'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import toast from 'react-hot-toast'
import { Plus, Edit2, Trash2, Building2 } from 'lucide-react'

export default function DepartmentsPage() {
  const [depts, setDepts] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ name: '', code: '', description: '' })
  const [saving, setSaving] = useState(false)

  const load = () => { setLoading(true); deptApi.list().then(setDepts).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [])

  const openCreate = () => { setEditId(null); setForm({ name: '', code: '', description: '' }); setModalOpen(true) }
  const openEdit = (d: Department) => { setEditId(d.id); setForm({ name: d.name, code: d.code, description: d.description || '' }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name || !form.code) return toast.error('Name and code are required')
    setSaving(true)
    try {
      if (editId) { await deptApi.update(editId, form); toast.success('Updated') }
      else { await deptApi.create(form); toast.success('Department created') }
      setModalOpen(false); load()
    } finally { setSaving(false) }
  }

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Departments</h1></div>
        <button className="btn-primary" onClick={openCreate}><Plus size={16} />Add Department</button>
      </div>

      {loading ? <LoadingSpinner /> : depts.length === 0 ? <EmptyState title="No departments" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {depts.map((d) => (
            <div key={d.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700">
                  <Building2 size={22} />
                </div>
                <div className="flex gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" onClick={() => openEdit(d)}><Edit2 size={14} /></button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50 text-red-600" onClick={async () => { await deptApi.delete(d.id); toast.success('Deactivated'); load() }}><Trash2 size={14} /></button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 mt-4">{d.name}</h3>
              <p className="text-sm text-gray-500 mt-0.5">{d.code}</p>
              {d.description && <p className="text-xs text-gray-400 mt-2">{d.description}</p>}
              <div className={`mt-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${d.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {d.is_active ? 'Active' : 'Inactive'}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Department' : 'Add Department'} size="sm">
        <div className="space-y-4">
          <div><label className="label">Name *</label><input className="input" value={form.name} onChange={(e) => f('name', e.target.value)} placeholder="Computer Science & Engineering" /></div>
          <div><label className="label">Code *</label><input className="input" value={form.code} onChange={(e) => f('code', e.target.value)} placeholder="CSE" /></div>
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
