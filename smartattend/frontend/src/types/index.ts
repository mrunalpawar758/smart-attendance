export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT'

export interface User {
  id: number
  email: string
  username: string
  full_name: string
  role: UserRole
  is_active: boolean
  profile_photo?: string
  phone?: string
  last_login?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

export interface Department {
  id: number
  name: string
  code: string
  description?: string
  is_active: boolean
  created_at: string
}

export interface Class {
  id: number
  name: string
  code: string
  year: number
  division?: string
  semester?: number
  department_id: number
  department_name?: string
  is_active: boolean
  student_count: number
  created_at: string
}

export interface Subject {
  id: number
  name: string
  code: string
  description?: string
  department_id: number
  department_name?: string
  class_id?: number
  class_name?: string
  credits: number
  is_active: boolean
  created_at: string
}

export interface Student {
  id: number
  user_id: number
  student_id: string
  roll_number: string
  full_name: string
  email: string
  phone?: string
  department_id: number
  department_name?: string
  year: number
  division?: string
  face_registered: boolean
  is_active: boolean
  profile_photo?: string
  created_at: string
}

export interface Teacher {
  id: number
  user_id: number
  teacher_id: string
  full_name: string
  email: string
  phone?: string
  department_id: number
  department_name?: string
  designation?: string
  qualification?: string
  is_active: boolean
  subject_count: number
  created_at: string
}

export type AttendanceMethod = 'FACE' | 'MANUAL' | 'HYBRID'
export type AttendanceStatus = 'PRESENT' | 'ABSENT'
export type SessionStatus = 'OPEN' | 'CLOSED' | 'CANCELLED'

export interface AttendanceSession {
  id: number
  session_code: string
  teacher_id: number
  teacher_name?: string
  class_id: number
  class_name?: string
  subject_id: number
  subject_name?: string
  date: string
  lecture_number: number
  method: AttendanceMethod
  status: SessionStatus
  total_students: number
  present_count: number
  absent_count: number
  started_at: string
  closed_at?: string
}

export interface AttendanceRecord {
  id: number
  session_id: number
  student_id: number
  student_name?: string
  roll_number?: string
  subject_id: number
  subject_name?: string
  class_id: number
  date: string
  status: AttendanceStatus
  method: AttendanceMethod
  confidence_score?: number
  timestamp: string
}

export interface SessionStudent {
  student_id: number
  student_name: string
  roll_number: string
  student_uid: string
  face_registered: boolean
  status?: AttendanceStatus
  method?: AttendanceMethod
  confidence_score?: number
  record_id?: number
}

export interface AttendanceStats {
  subject_id?: number
  subject_name?: string
  subject_code?: string
  total_classes: number
  present_count: number
  absent_count: number
  percentage: number
  is_low_attendance: boolean
}

export interface DashboardStats {
  total_students: number
  total_teachers: number
  total_classes: number
  total_subjects: number
  today_sessions: number
  today_attendance_percentage: number
  threshold: number
}
