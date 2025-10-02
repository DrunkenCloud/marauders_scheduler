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
  HALL_GROUP = 'hallGroup'
}

// Common UI Types
export type ViewMode = 'list' | 'create' | 'edit'

// Entity Timing Types
export interface EntityTiming {
  startHour: number    // 0-23
  startMinute: number  // 0-59
  endHour: number      // 0-23
  endMinute: number    // 0-59
}

export interface SessionTiming {
  startTime: string
  endTime: string
}

// Session Types
export interface SessionConfig {
  id: number
  name: string
  details?: string
  createdAt: Date
  updatedAt: Date
}

// Student Types
export interface Student {
  id: number
  digitalId: number
  timetable: any
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  studentGroupMemberships: Array<{
    studentGroup: {
      id: number
      groupName: string
    }
  }>
}

// Faculty Types
export interface Faculty {
  id: number
  name: string
  shortForm: string | null
  timetable: any
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  facultyGroupMemberships: Array<{
    facultyGroup: {
      id: number
      groupName: string
    }
  }>
  coursesTaught: Array<{
    id: number
    name: string
    code: string
  }>
}

// Hall Types
export interface Hall {
  id: number
  name: string
  Floor: string
  Building: string
  shortForm: string | null
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  timetable: any
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  hallGroupMemberships: Array<{
    hallGroup: {
      id: number
      groupName: string
    }
  }>
  coursesTaught: Array<{
    id: number
    name: string
    code: string
  }>
}

// Course Types
export interface Course {
  id: number
  name: string
  code: string
  classDuration: number
  sessionsPerLecture: number
  totalSessions: number
  timetable: any
  createdAt: string
  updatedAt: string
  session: {
    id: number
    name: string
  }
  compulsoryFaculties: Array<{
    id: number
    name: string
    shortForm: string | null
  }>
  compulsoryHalls: Array<{
    id: number
    name: string
    Building: string
    Floor: string
    shortForm: string | null
  }>
  studentEnrollments: Array<{
    student: {
      id: number
      digitalId: number
    }
  }>
  studentGroupEnrollments: Array<{
    studentGroup: {
      id: number
      groupName: string
    }
  }>
}

// Group Types
export interface StudentGroup {
  id: number
  groupName: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  _count: {
    studentMemberships: number
  }
  studentMemberships?: Array<{
    student: {
      id: number
      digitalId: number
    }
  }>
}

export interface FacultyGroup {
  id: number
  groupName: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  _count: {
    facultyMemberships: number
  }
  facultyMemberships?: Array<{
    faculty: {
      id: number
      name: string
      shortForm?: string
    }
  }>
}

export interface HallGroup {
  id: number
  groupName: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  _count: {
    hallMemberships: number
  }
  hallMemberships?: Array<{
    hall: {
      id: number
      name: string
      Floor: string
      Building: string
      shortForm?: string
    }
  }>
}

// Form Data Types
export interface StudentGroupFormData {
  groupName: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export interface FacultyGroupFormData {
  groupName: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export interface HallGroupFormData {
  groupName: string
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

// Timetable Types
export interface TimetableSlot {
  status: number        // 0 = free, 1+ = occupied
  startHour: number     // 0-23
  startMinute: number   // 0-59
  duration: number      // minutes
  courseCode?: string   // when occupied
  hallIds?: number[]    // assigned halls
  facultyIds?: number[] // assigned faculties
  hallGroupIds?: number[] // assigned hall groups
  facultyGroupIds?: number[] // assigned faculty groups
  studentIds?: number[] // assigned students
  studentGroupIds?: number[] // assigned student groups
}

export interface DaySchedule {
  [day: string]: (TimetableSlot | [number])[]  // Array of slots, free slots as [0]
}

export interface EntityTimetable {
  entityId: number
  entityType: EntityType
  schedule: DaySchedule
  isComplete: boolean    // true for students, can be false for others
}

// Course Requirements
export interface CourseRequirements {
  courseCode: string
  classDuration: number      // minutes per session (e.g., 50)
  sessionsPerLecture: number // number of consecutive sessions needed (e.g., 2)
  totalSessions: number      // total sessions per week
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