import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Global error handler
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const msg = error.response?.data?.detail || error.message || 'Network error'
    if (error.response?.status === 401) {
      localStorage.removeItem('sa_token')
      localStorage.removeItem('sa_user')
      window.location.href = '/login'
    } else if (error.response?.status !== 404) {
      // Don't toast 404s — callers handle them
      toast.error(String(msg))
    }
    return Promise.reject(error)
  }
)

export default api

// ── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (current_password: string, new_password: string) =>
    api.post('/auth/change-password', { current_password, new_password }).then((r) => r.data),
}

// ── Departments ───────────────────────────────────────────────────────────────
export const deptApi = {
  list: () => api.get('/departments').then((r) => r.data),
  create: (d: object) => api.post('/departments', d).then((r) => r.data),
  update: (id: number, d: object) => api.put(`/departments/${id}`, d).then((r) => r.data),
  delete: (id: number) => api.delete(`/departments/${id}`).then((r) => r.data),
}

// ── Classes ───────────────────────────────────────────────────────────────────
export const classApi = {
  list: () => api.get('/classes').then((r) => r.data),
  get: (id: number) => api.get(`/classes/${id}`).then((r) => r.data),
  create: (d: object) => api.post('/classes', d).then((r) => r.data),
  update: (id: number, d: object) => api.put(`/classes/${id}`, d).then((r) => r.data),
  delete: (id: number) => api.delete(`/classes/${id}`).then((r) => r.data),
  students: (id: number) => api.get(`/classes/${id}/students`).then((r) => r.data),
  assignStudent: (classId: number, studentId: number) =>
    api.post(`/classes/${classId}/students/${studentId}`).then((r) => r.data),
}

// ── Subjects ──────────────────────────────────────────────────────────────────
export const subjectApi = {
  list: (params?: object) => api.get('/subjects', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/subjects/${id}`).then((r) => r.data),
  create: (d: object) => api.post('/subjects', d).then((r) => r.data),
  update: (id: number, d: object) => api.put(`/subjects/${id}`, d).then((r) => r.data),
  delete: (id: number) => api.delete(`/subjects/${id}`).then((r) => r.data),
  assignTeacher: (sid: number, tid: number) =>
    api.post(`/subjects/${sid}/assign-teacher/${tid}`).then((r) => r.data),
}

// ── Students ──────────────────────────────────────────────────────────────────
export const studentApi = {
  list: (params?: object) => api.get('/students', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/students/${id}`).then((r) => r.data),
  create: (d: object) => api.post('/students', d).then((r) => r.data),
  update: (id: number, d: object) => api.put(`/students/${id}`, d).then((r) => r.data),
  delete: (id: number) => api.delete(`/students/${id}`).then((r) => r.data),
}

// ── Teachers ──────────────────────────────────────────────────────────────────
export const teacherApi = {
  list: (params?: object) => api.get('/teachers', { params }).then((r) => r.data),
  get: (id: number) => api.get(`/teachers/${id}`).then((r) => r.data),
  create: (d: object) => api.post('/teachers', d).then((r) => r.data),
  update: (id: number, d: object) => api.put(`/teachers/${id}`, d).then((r) => r.data),
  delete: (id: number) => api.delete(`/teachers/${id}`).then((r) => r.data),
  subjects: (id: number) => api.get(`/teachers/${id}/subjects`).then((r) => r.data),
}

// ── Face Recognition ──────────────────────────────────────────────────────────
export const faceApi = {
  status: () => api.get('/face/status').then((r) => r.data),
  register: (student_id: number, images: string[]) =>
    api.post('/face/register', { student_id, images }).then((r) => r.data),
  recognize: (session_id: number, class_id: number, image_data: string) =>
    api.post('/face/recognize', { session_id, class_id, image_data }).then((r) => r.data),
  profile: (student_id: number) => api.get(`/face/profile/${student_id}`).then((r) => r.data),
  deleteProfile: (student_id: number) => api.delete(`/face/profile/${student_id}`).then((r) => r.data),
}

// ── Attendance ────────────────────────────────────────────────────────────────
export const attendanceApi = {
  createSession: (d: object) => api.post('/attendance/sessions', d).then((r) => r.data),
  listSessions: (params?: object) => api.get('/attendance/sessions', { params }).then((r) => r.data),
  getSession: (id: number) => api.get(`/attendance/sessions/${id}`).then((r) => r.data),
  getSessionStudents: (id: number) => api.get(`/attendance/sessions/${id}/students`).then((r) => r.data),
  closeSession: (id: number) => api.post(`/attendance/sessions/${id}/close`).then((r) => r.data),
  mark: (session_id: number, records: object[]) =>
    api.post('/attendance/mark', { session_id, records }).then((r) => r.data),
  updateRecord: (id: number, status: string, reason?: string) =>
    api.put(`/attendance/records/${id}`, { status, reason }).then((r) => r.data),
  studentStats: (student_id: number, subject_id?: number) =>
    api.get(`/attendance/student/${student_id}/stats`, { params: { subject_id } }).then((r) => r.data),
  studentHistory: (student_id: number, params?: object) =>
    api.get(`/attendance/student/${student_id}/history`, { params }).then((r) => r.data),
  auditLog: (params?: object) => api.get('/attendance/audit-log', { params }).then((r) => r.data),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  student: (id: number) => api.get(`/reports/student/${id}`).then((r) => r.data),
  class: (id: number, params?: object) => api.get(`/reports/class/${id}`, { params }).then((r) => r.data),
  subject: (id: number, params?: object) => api.get(`/reports/subject/${id}`, { params }).then((r) => r.data),
  daily: (date?: string) => api.get('/reports/daily', { params: { report_date: date } }).then((r) => r.data),
  dashboardStats: () => api.get('/reports/dashboard/stats').then((r) => r.data),
  exportCsv: (class_id: number) =>
    api.get(`/reports/export/csv/${class_id}`, { responseType: 'blob' }).then((r) => r.data),
}

// ── Settings ──────────────────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get('/settings').then((r) => r.data),
  update: (key: string, value: string) => api.put(`/settings/${key}`, { value }).then((r) => r.data),
  bulkUpdate: (data: Record<string, string>) => api.put('/settings', data).then((r) => r.data),
}
