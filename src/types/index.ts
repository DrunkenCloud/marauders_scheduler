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
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  createdAt: string
  updatedAt: string
  session: {
    id: string
    name: string
  }
  studentGroupMemberships: Array<{
    studentGroup: {
      id: string
      groupName: string
    }
  }>
}

// Faculty Types
export interface Faculty {
  id: string
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
    id: string
    name: string
  }
  facultyGroupMemberships: Array<{
    facultyGroup: {
      id: string
      groupName: string
    }
  }>
  coursesTaught: Array<{
    id: string
    name: string
    code: string
  }>
}

// Hall Types
export interface Hall {
  id: string
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
    id: string
    name: string
  }
  hallGroupMemberships: Array<{
    hallGroup: {
      id: string
      groupName: string
    }
  }>
  coursesTaught: Array<{
    id: string
    name: string
    code: string
  }>
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
  session: {
    id: string
    name: string
  }
  compulsoryFaculties: Array<{
    id: string
    name: string
    shortForm: string | null
  }>
  compulsoryHalls: Array<{
    id: string
    name: string
    Building: string
    Floor: string
    shortForm: string | null
  }>
  studentEnrollments: Array<{
    student: {
      id: string
      digitalId: number
    }
  }>
  studentGroupEnrollments: Array<{
    studentGroup: {
      id: string
      groupName: string
    }
  }>
  compulsoryFacultyGroups?: Array<{
    facultyGroup: {
      id: string
      groupName: string
    }
  }>
  compulsoryHallGroups?: Array<{
    hallGroup: {
      id: string
      groupName: string
    }
  }>
}

// Group Types
export interface StudentGroup {
  id: string
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
      id: string
      digitalId: number
    }
  }>
}

export interface FacultyGroup {
  id: string
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
      id: string
      name: string
      shortForm?: string
    }
  }>
}

export interface HallGroup {
  id: string
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
      id: string
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
  type: 'course' | 'blocker'  // slot type
  startHour: number     // 0-23
  startMinute: number   // 0-59
  duration: number      // minutes
  courseId?: string     // for course slots
  courseCode?: string   // for course slots
  blockerReason?: string // for blocker slots
  hallIds?: string[]    // assigned halls
  facultyIds?: string[] // assigned faculties
  hallGroupIds?: string[] // assigned hall groups
  facultyGroupIds?: string[] // assigned faculty groups
  studentIds?: string[] // assigned students
  studentGroupIds?: string[] // assigned student groups
}

// Scheduling Algorithm Types
export interface CompiledCourseData {
  courseId: string
  courseCode: string
  classDuration: number
  sessionsPerLecture: number
  totalSessions: number
  scheduledCount: number
  targetSessions?: number // Optional: limit sessions to schedule in this run
  studentIds: string[]
  facultyIds: string[]
  hallIds: string[]
  studentGroupIds: string[]
  facultyGroupIds: string[]
  hallGroupIds: string[]
}

export interface EntityWorkload {
  totalFreeMinutes: number
  dailyFreeMinutes: { [day: string]: number }
  dailyThresholds: { [day: string]: number }
  currentWorkload: { [day: string]: number }
  totalScheduledDuration: number
}

export interface EntityData {
  id: string
  timetable: any
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  workload: EntityWorkload
}

export interface CompiledSchedulingData {
  sessionId: string
  courses: CompiledCourseData[]
  allEntities: { [entityId: string]: EntityData }
}

export interface SlotFragment {
  duration: number
  type: 'course' | 'blocker'
  startHour: number
  startMinute: number
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

// Additional Timetable Types
export interface TimeSlot {
  startHour: number    // 0-23
  startMinute: number  // 0-59
  duration: number     // minutes (e.g., 20, 30, 50, 60)
}

export interface AvailableSlot {
  day: string
  startSlotIndex: number
  slots: TimetableSlot[]
  totalDuration: number
}

export interface DaySchedule {
  [day: string]: TimetableSlot[]  // Array of slots only (no free slots)
}

export interface EntityTimetable {
  entityId: string
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