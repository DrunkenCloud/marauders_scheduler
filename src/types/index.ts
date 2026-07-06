// User and Authentication Types
export enum UserRole {
  ADMIN = 'admin',
  STUDENT = 'student',
  PROFESSOR = 'professor'
}

export interface UserSession {
  id: string
  username: string
  role: UserRole
  sessionId?: number
}

// Entity Types
export enum EntityType {
  STUDENT = 'student',
  FACULTY = 'faculty',
  HALL = 'hall',
  COURSE = 'course',
  STUDENT_GROUP = 'studentGroup',
  FACULTY_GROUP = 'facultyGroup',
  HALL_GROUP = 'hallGroup',
  SCHEDULE_COURSES = 'scheduleCourses'
}

// Common UI Types
export type ViewMode = 'list' | 'create' | 'edit'

// Session Types
export interface SessionConfig {
  id: string
  name: string
  details?: string
  createdAt: Date
  updatedAt: Date
}

// Student Types
export interface Student {
  id: string
  digitalId: number
  timetable: any
  createdAt: string
  updatedAt: string
  session: { id: string; name: string }
  studentGroupMemberships: Array<{ studentGroup: { id: string; groupName: string } }>
}

// Faculty Types
export interface Faculty {
  id: string
  name: string
  shortForm: string | null
  timetable: any
  createdAt: string
  updatedAt: string
  session: { id: string; name: string }
  facultyGroupMemberships: Array<{ facultyGroup: { id: string; groupName: string } }>
  coursesTaught: Array<{ id: string; name: string; code: string }>
}

// Hall Types
export interface Hall {
  id: string
  name: string
  Floor: string
  Building: string
  shortForm: string | null
  timetable: any
  createdAt: string
  updatedAt: string
  session: { id: string; name: string }
  hallGroupMemberships: Array<{ hallGroup: { id: string; groupName: string } }>
  coursesTaught: Array<{ id: string; name: string; code: string }>
}

// Course Types
export interface Course {
  id: string
  name: string
  code: string
  classDuration: number
  sessionsPerLecture: number
  totalSessions: number
  scheduledCount: number
  timetable: any
  createdAt: string
  updatedAt: string
  session: { id: string; name: string }
  compulsoryFaculties: Array<{ id: string; name: string; shortForm: string | null }>
  compulsoryHalls: Array<{ id: string; name: string; Building: string; Floor: string; shortForm: string | null }>
  studentEnrollments: Array<{ student: { id: string; digitalId: number } }>
  studentGroupEnrollments: Array<{ studentGroup: { id: string; groupName: string } }>
  compulsoryFacultyGroups?: Array<{ facultyGroup: { id: string; groupName: string } }>
  compulsoryHallGroups?: Array<{ hallGroup: { id: string; groupName: string } }>
}

// Group Types
export interface StudentGroup {
  id: string
  groupName: string
  createdAt: string
  updatedAt: string
  _count: { studentMemberships: number }
  studentMemberships?: Array<{ student: { id: string; digitalId: number } }>
}

export interface FacultyGroup {
  id: string
  groupName: string
  createdAt: string
  updatedAt: string
  _count: { facultyMemberships: number }
  facultyMemberships?: Array<{ faculty: { id: string; name: string; shortForm?: string } }>
}

export interface HallGroup {
  id: string
  groupName: string
  createdAt: string
  updatedAt: string
  _count: { hallMemberships: number }
  hallMemberships?: Array<{ hall: { id: string; name: string; Floor: string; Building: string; shortForm?: string } }>
}

// Form Data Types
export interface StudentGroupFormData {
  groupName: string
}

export interface FacultyGroupFormData {
  groupName: string
}

export interface HallGroupFormData {
  groupName: string
}

// Timetable Types — slot-number based (7 slots per day, 5 days)
export const SLOTS_PER_DAY = 7

export interface TimetableSlot {
  type: 'course' | 'blocker'
  slotNumber: number      // 0–6
  slotSpan: number        // consecutive slots consumed (default 1)
  courseId?: string
  courseCode?: string
  blockerReason?: string
  hallIds?: string[]
  facultyIds?: string[]
  hallGroupIds?: string[]
  facultyGroupIds?: string[]
  studentIds?: string[]
  studentGroupIds?: string[]
}

export interface DaySchedule {
  [day: string]: TimetableSlot[]
}

export interface EntityTimetable {
  entityId: string
  entityType: EntityType
  schedule: DaySchedule
  isComplete: boolean
}

// Scheduling Algorithm Types
export interface CompiledCourseData {
  courseId: string
  courseCode: string
  classDuration: number
  sessionsPerLecture: number   // also used as slotSpan in scheduler
  totalSessions: number
  scheduledCount: number
  targetSessions?: number
  studentIds: string[]
  facultyIds: string[]
  hallIds: string[]
  studentGroupIds: string[]
  facultyGroupIds: string[]
  hallGroupIds: string[]
}

export interface EntityWorkload {
  totalFreeSlots: number
  dailyFreeSlots: { [day: string]: number }
  dailyThresholds: { [day: string]: number }
  currentWorkload: { [day: string]: number }  // slots used per day
  totalScheduledSlots: number
}

export interface EntityData {
  id: string
  timetable: any
  workload: EntityWorkload
}

export interface CompiledSchedulingData {
  sessionId: string
  courses: CompiledCourseData[]
  allEntities: { [entityId: string]: EntityData }
}

export interface SlotFragment {
  slotNumber: number
  slotSpan: number
  type: 'course' | 'blocker'
  courseId?: string
  courseCode?: string
  blockerReason?: string
  hallIds?: string[]
  facultyIds?: string[]
  hallGroupIds?: string[]
  facultyGroupIds?: string[]
  studentIds?: string[]
  studentGroupIds?: string[]
}

export interface AvailableSlot {
  day: string
  slotNumber: number
  slotSpan: number
}

// Pagination Types
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// Validation Types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Dashboard Types
export interface DashboardStats {
  students: number
  faculty: number
  halls: number
  courses: number
  studentGroups: number
  facultyGroups: number
  hallGroups: number
}

export interface StatCard {
  label: string
  value: number
  icon: string
  color: string
  description: string
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
    timestamp: Date
  }
}
