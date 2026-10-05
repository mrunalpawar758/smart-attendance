import React, { useEffect, useState } from 'react'
import { settingsApi } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

const SETTINGS_META: { key: string; label: string; description: string; type: 'text' | 'number' | 'boolean' }[] = [
  { key: 'institution_name', label: 'Institution Name', description: 'Name displayed throughout the system', type: 'text' },
  { key: 'academic_year', label: 'Academic Year', description: 'Current academic year (e.g. 2025-2026)', type: 'text' },
  { key: 'attendance_threshold', label: 'Attendance Threshold (%)', description: 'Minimum attendance % before low-attendance warning triggers', type: 'number' },
  { key: 'face_recognition_threshold', label: 'Face Recognition Confidence', description: 'Minimum confidence (0.0–1.0) to accept a face match', type: 'number' },
  { key: 'working_days_per_week', label: 'Working Days / Week', description: 'Used in scheduling calculations', type: 'number' },
  { key: 'session_duration_minutes', label: 'Session Duration (minutes)', description: 'Default lecture duration', type: 'number' },
  { key: 'face_recognition_enabled', label: 'Face Recognition Enabled', description: 'Enable/disable face recognition globally', type: 'boolean' },
  { key: 'liveness_detection_enabled', label: 'Liveness Detection Enabled', description: 'Require liveness checks during face attendance', type: 'boolean' },
  { key: 'data_retention_days', label: 'Face Data Retention (days)', description: 'Number of days to retain face embedding data', type: 'number' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changed, setChanged] = useState<Record<string, string>>({})

  useEffect(() => {
    settingsApi.get().then((data) => { setSettings(data) }).finally(() => setLoading(false))
  }, [])

  const handleChange = (key: string, value: string) => {
    setSettings((p) => ({ ...p, [key]: value }))
    setChanged((p) => ({ ...p, [key]: value }))
  }

  const handleSave = async () => {
    if (Object.keys(changed).length === 0) return toast('No changes to save')
    setSaving(true)
    try {
      await settingsApi.bulkUpdate(changed)
      toast.success('Settings saved')
      setChanged({})
    } finally { setSaving(false) }
  }

  if (loading) return <LoadingSpinner text="Loading settings..." />

  return (
    <div className="space-y-6 fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">System Settings</h1><p className="text-sm text-gray-500 mt-1">Configure system-wide parameters</p></div>
        <button className="btn-primary" onClick={handleSave} disabled={saving || Object.keys(changed).length === 0}>
          <Save size={16} />{saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-4">
        {SETTINGS_META.map(({ key, label, description, type }) => (
          <div key={key} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              </div>
              <div className="w-48 flex-shrink-0">
                {type === 'boolean' ? (
                  <select className="input" value={settings[key] || 'true'} onChange={(e) => handleChange(key, e.target.value)}>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <input
                    className={`input ${changed[key] ? 'border-primary-400 ring-1 ring-primary-300' : ''}`}
                    type={type}
                    step={type === 'number' && key.includes('threshold') ? '0.01' : '1'}
                    value={settings[key] || ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card bg-blue-50 border-blue-200">
        <p className="text-sm font-semibold text-blue-800 mb-2">Privacy Notice</p>
        <p className="text-xs text-blue-700">
          SmartAttend uses face recognition technology for attendance. Face embeddings are stored securely and are
          not exposed through public APIs. Students can opt for manual attendance. Face data is retained for the
          configured period and can be deleted per student on request.
        </p>
      </div>
    </div>
  )
}
