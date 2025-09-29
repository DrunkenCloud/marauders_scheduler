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

// Timetable Types
export interface TimetableSlot {
  status: number        // 0 = free, 1+ = occupied
  startTime: string     // "08:10"
  duration: number      // minutes
  courseCode?: string   // when occupied
  courseType?: string   // "LAB", "LECTURE", etc.
  hallId?: number      // assigned hall
  facultyId?: number   // assigned faculty
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

// Session Types
export interface SessionConfig {
  id: number
  name: string
  details?: string
  createdAt: Date
  updatedAt: Date
}

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

// Course Requirements
export interface CourseRequirements {
  courseCode: string
  classDuration: number      // minutes per session (e.g., 50)
  sessionsPerLecture: number // number of consecutive sessions needed (e.g., 2)
  totalSessions: number      // total sessions per week
}

// Validation Types
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
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