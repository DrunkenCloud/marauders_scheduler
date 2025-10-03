import { EntityType, ValidationResult, EntityTiming } from '@/types'

// Timetable slot types
export interface TimetableSlot {
  status: number        // 0 = free, 1+ = occupied
  startHour: number     // 0-23
  startMinute: number   // 0-59
  duration: number      // minutes
  courseCode?: string   // when occupied
  courseType?: string   // "LAB", "LECTURE", etc.
  hallIds?: number[]    // assigned halls
  facultyIds?: number[] // assigned faculties
  hallGroupIds?: number[] // assigned hall groups
  facultyGroupIds?: number[] // assigned faculty groups
  studentIds?: number[] // assigned students
  studentGroupIds?: number[] // assigned student groups
}

export interface SlotFragment {
  duration: number
  status: number
  startHour: number
  startMinute: number
  courseCode?: string
  courseType?: string
  hallIds?: number[]
  facultyIds?: number[]
  hallGroupIds?: number[]
  facultyGroupIds?: number[]
  studentIds?: number[]
  studentGroupIds?: number[]
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



// Days of the week
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
export type DayOfWeek = typeof DAYS_OF_WEEK[number]

// Default slot duration in minutes
export const DEFAULT_SLOT_DURATION = 50

/**
 * Generate time slots based on entity timing constraints
 */
export function generateTimeSlots(timing: EntityTiming, slotDuration: number = DEFAULT_SLOT_DURATION): TimeSlot[] {
  const slots: TimeSlot[] = []
  
  // Convert timing to minutes from midnight
  const startMinutes = timing.startHour * 60 + timing.startMinute
  const endMinutes = timing.endHour * 60 + timing.endMinute
  
  // Generate slots
  for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += slotDuration) {
    const hours = Math.floor(currentMinutes / 60)
    const minutes = currentMinutes % 60
    
    slots.push({
      startHour: hours,
      startMinute: minutes,
      duration: slotDuration
    })
  }
  
  return slots
}

/**
 * Initialize empty timetable for an entity
 */
export function initializeEmptyTimetable(
  entityId: number, 
  entityType: EntityType, 
  timing: EntityTiming,
  slotDuration: number = DEFAULT_SLOT_DURATION
): EntityTimetable {
  const timeSlots = generateTimeSlots(timing, slotDuration)
  const schedule: DaySchedule = {}
  
  // Initialize each day with free slots
  DAYS_OF_WEEK.forEach(day => {
    if (entityType === EntityType.STUDENT) {
      // Students need all slots defined (complete timetable)
      schedule[day] = timeSlots.map(() => [0])
    } else {
      // Faculty, halls, groups can have partial timetables (only occupied slots)
      schedule[day] = []
    }
  })
  
  return {
    entityId,
    entityType,
    schedule,
    isComplete: entityType === EntityType.STUDENT
  }
}

/**
 * Convert slot-based format to legacy format for database storage
 */
export function convertToLegacyFormat(timetable: EntityTimetable): Record<string, any[]> {
  const legacy: Record<string, any[]> = {}
  
  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    legacy[day] = daySlots.map(slot => {
      if (Array.isArray(slot) && slot.length === 1 && slot[0] === 0) {
        // Free slot - keep as [0]
        return [0]
      } else if (typeof slot === 'object' && 'status' in slot) {
        // Occupied slot - convert to array format
        const tSlot = slot as TimetableSlot
        if (tSlot.status === 0) {
          return [0]
        } else {
          return [
            tSlot.status,
            tSlot.startHour,
            tSlot.startMinute,
            tSlot.duration,
            tSlot.courseCode || '',
            tSlot.courseType || '',
            tSlot.hallIds || [],
            tSlot.facultyIds || [],
            tSlot.hallGroupIds || [],
            tSlot.facultyGroupIds || [],
            tSlot.studentIds || [],
            tSlot.studentGroupIds || []
          ]
        }
      }
      return [0] // fallback
    })
  })
  
  return legacy
}

/**
 * Convert legacy format from database to slot-based format
 */
export function convertFromLegacyFormat(
  legacyTimetable: any,
  entityId: number,
  entityType: EntityType
): EntityTimetable {
  const schedule: DaySchedule = {}
  
  DAYS_OF_WEEK.forEach(day => {
    const dayData = legacyTimetable[day] || []
    schedule[day] = dayData.map((slot: any) => {
      if (Array.isArray(slot)) {
        if (slot.length === 1 && slot[0] === 0) {
          // Free slot
          return [0]
        } else if (slot.length >= 4) {
          // Occupied slot - handle both old and new formats
          const timetableSlot: TimetableSlot = {
            status: slot[0] || 1,
            startHour: typeof slot[1] === 'string' ? parseInt(slot[1].split(':')[0]) : (slot[1] || 8),
            startMinute: typeof slot[1] === 'string' ? parseInt(slot[1].split(':')[1]) : (slot[2] || 10),
            duration: typeof slot[1] === 'string' ? (slot[2] || DEFAULT_SLOT_DURATION) : (slot[3] || DEFAULT_SLOT_DURATION),
            courseCode: typeof slot[1] === 'string' ? (slot[3] || undefined) : (slot[4] || undefined),
            courseType: typeof slot[1] === 'string' ? (slot[4] || undefined) : (slot[5] || undefined),
            // Handle legacy single ID format and new array format
            hallIds: Array.isArray(slot[5]) ? slot[5] : (slot[5] ? [slot[5]] : []),
            facultyIds: Array.isArray(slot[6]) ? slot[6] : (slot[6] ? [slot[6]] : []),
            hallGroupIds: Array.isArray(slot[7]) ? slot[7] : [],
            facultyGroupIds: Array.isArray(slot[8]) ? slot[8] : [],
            studentIds: Array.isArray(slot[9]) ? slot[9] : [],
            studentGroupIds: Array.isArray(slot[10]) ? slot[10] : []
          }
          return timetableSlot
        }
      }
      return [0] // fallback to free slot
    })
  })
  
  return {
    entityId,
    entityType,
    schedule,
    isComplete: entityType === EntityType.STUDENT
  }
}

/**
 * Validate timetable based on entity-specific rules
 */
export function validateTimetable(timetable: EntityTimetable): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check if all days are present
  DAYS_OF_WEEK.forEach(day => {
    if (!timetable.schedule[day]) {
      errors.push(`Missing schedule for ${day}`)
    }
  })
  
  // Entity-specific validation
  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    daySlots.forEach((slot, index) => {
      if (Array.isArray(slot) && slot.length === 1 && slot[0] === 0) {
        warnings.push(`${timetable.entityType} timetable for ${day}, slot ${index + 1} is marked as free (consider removing for partial timetables)`)
      }
    })
  })
  
  // Validate slot data integrity
  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    daySlots.forEach((slot, index) => {
      if (typeof slot === 'object' && 'status' in slot) {
        const tSlot = slot as TimetableSlot
        
        // Validate occupied slots have required data
        if (tSlot.status > 0) {
          if (tSlot.startHour === undefined || tSlot.startMinute === undefined) {
            errors.push(`Occupied slot on ${day}, position ${index + 1} missing start time`)
          }
          if (!tSlot.duration || tSlot.duration <= 0) {
            errors.push(`Occupied slot on ${day}, position ${index + 1} has invalid duration`)
          }
          if (!tSlot.courseCode) {
            warnings.push(`Occupied slot on ${day}, position ${index + 1} missing course code`)
          }
        }
        
        // Validate time format
        if (tSlot.startHour < 0 || tSlot.startHour > 23) {
          errors.push(`Invalid start hour "${tSlot.startHour}" on ${day}, position ${index + 1}`)
        }
        if (tSlot.startMinute < 0 || tSlot.startMinute > 59) {
          errors.push(`Invalid start minute "${tSlot.startMinute}" on ${day}, position ${index + 1}`)
        }
      }
    })
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Fragment a slot into smaller pieces
 */
export function fragmentSlot(slot: TimetableSlot, fragments: SlotFragment[]): TimetableSlot[] {
  if (fragments.length === 0) return [slot]
  
  const result: TimetableSlot[] = []
  let currentHour = slot.startHour
  let currentMinute = slot.startMinute
  let remainingDuration = slot.duration
  
  fragments.forEach(fragment => {
    if (remainingDuration <= 0) return
    
    const fragmentDuration = Math.min(fragment.duration, remainingDuration)
    
    result.push({
      status: fragment.status,
      startHour: currentHour,
      startMinute: currentMinute,
      duration: fragmentDuration,
      courseCode: fragment.courseCode || slot.courseCode,
      courseType: fragment.courseType || slot.courseType,
      hallIds: fragment.hallIds || slot.hallIds,
      facultyIds: fragment.facultyIds || slot.facultyIds,
      hallGroupIds: fragment.hallGroupIds || slot.hallGroupIds,
      facultyGroupIds: fragment.facultyGroupIds || slot.facultyGroupIds,
      studentIds: fragment.studentIds || slot.studentIds,
      studentGroupIds: fragment.studentGroupIds || slot.studentGroupIds
    })
    
    // Calculate next start time
    const totalMinutes = currentHour * 60 + currentMinute + fragmentDuration
    currentHour = Math.floor(totalMinutes / 60)
    currentMinute = totalMinutes % 60
    
    remainingDuration -= fragmentDuration
  })
  
  return result
}

/**
 * Merge consecutive slots into a single slot
 */
export function mergeSlots(slots: TimetableSlot[]): TimetableSlot {
  if (slots.length === 0) {
    throw new Error('Cannot merge empty slot array')
  }
  
  if (slots.length === 1) {
    return slots[0]
  }
  
  // Sort slots by start time
  const sortedSlots = [...slots].sort((a, b) => {
    const aTime = a.startHour * 60 + a.startMinute
    const bTime = b.startHour * 60 + b.startMinute
    return aTime - bTime
  })
  
  const firstSlot = sortedSlots[0]
  const totalDuration = sortedSlots.reduce((sum, slot) => sum + slot.duration, 0)
  
  return {
    status: firstSlot.status,
    startHour: firstSlot.startHour,
    startMinute: firstSlot.startMinute,
    duration: totalDuration,
    courseCode: firstSlot.courseCode,
    courseType: firstSlot.courseType,
    hallIds: firstSlot.hallIds,
    facultyIds: firstSlot.facultyIds,
    hallGroupIds: firstSlot.hallGroupIds,
    facultyGroupIds: firstSlot.facultyGroupIds,
    studentIds: firstSlot.studentIds,
    studentGroupIds: firstSlot.studentGroupIds
  }
}

/**
 * Find consecutive free slots for scheduling
 */
export function findConsecutiveFreeSlots(
  timetable: EntityTimetable, 
  requiredDuration: number, 
  sessionCount: number = 1
): AvailableSlot[] {
  const availableSlots: AvailableSlot[] = []
  
  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    let consecutiveSlots: TimetableSlot[] = []
    let startIndex = 0
    
    daySlots.forEach((slot, index) => {
      const isSlotFree = Array.isArray(slot) && slot.length === 1 && slot[0] === 0
      
      if (isSlotFree) {
        if (consecutiveSlots.length === 0) {
          startIndex = index
        }
        // Create a temporary slot for calculation
        const tempSlot: TimetableSlot = {
          status: 0,
          startHour: 8, // This would need to be calculated properly
          startMinute: 10,
          duration: DEFAULT_SLOT_DURATION
        }
        consecutiveSlots.push(tempSlot)
      } else {
        // Check if we have enough consecutive slots
        if (consecutiveSlots.length > 0) {
          const totalDuration = consecutiveSlots.reduce((sum, s) => sum + s.duration, 0)
          if (totalDuration >= requiredDuration * sessionCount) {
            availableSlots.push({
              day,
              startSlotIndex: startIndex,
              slots: consecutiveSlots,
              totalDuration
            })
          }
        }
        consecutiveSlots = []
      }
    })
    
    // Check final consecutive slots
    if (consecutiveSlots.length > 0) {
      const totalDuration = consecutiveSlots.reduce((sum, s) => sum + s.duration, 0)
      if (totalDuration >= requiredDuration * sessionCount) {
        availableSlots.push({
          day,
          startSlotIndex: startIndex,
          slots: consecutiveSlots,
          totalDuration
        })
      }
    }
  })
  
  return availableSlots
}

/**
 * Check if a specific time slot is available
 */
export function isSlotAvailable(timetable: EntityTimetable, day: DayOfWeek, slotIndex: number): boolean {
  const daySlots = timetable.schedule[day] || []
  const slot = daySlots[slotIndex]
  
  if (!slot) return true // Empty slot is available
  
  return Array.isArray(slot) && slot.length === 1 && slot[0] === 0
}

/**
 * Get occupied slots for partial timetables (faculty, halls, groups)
 */
export function getOccupiedSlots(timetable: EntityTimetable): { day: DayOfWeek; slot: TimetableSlot; index: number }[] {
  const occupiedSlots: { day: DayOfWeek; slot: TimetableSlot; index: number }[] = []
  
  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    daySlots.forEach((slot, index) => {
      if (typeof slot === 'object' && 'status' in slot && slot.status > 0) {
        occupiedSlots.push({
          day,
          slot: slot as TimetableSlot,
          index
        })
      }
    })
  })
  
  return occupiedSlots
}

/**
 * Add a new occupied slot to a partial timetable
 */
export function addOccupiedSlot(
  timetable: EntityTimetable, 
  day: DayOfWeek, 
  slot: TimetableSlot
): EntityTimetable {
  const newTimetable = { ...timetable }
  newTimetable.schedule = { ...timetable.schedule }
  newTimetable.schedule[day] = [...(timetable.schedule[day] || [])]
  
  // Add the slot and sort by start time
  newTimetable.schedule[day].push(slot)
  newTimetable.schedule[day].sort((a, b) => {
    if (typeof a === 'object' && 'startHour' in a && typeof b === 'object' && 'startHour' in b) {
      const aTime = a.startHour * 60 + a.startMinute
      const bTime = b.startHour * 60 + b.startMinute
      return aTime - bTime
    }
    return 0
  })
  
  return newTimetable
}

/**
 * Remove an occupied slot from a partial timetable
 */
export function removeOccupiedSlot(
  timetable: EntityTimetable, 
  day: DayOfWeek, 
  slotIndex: number
): EntityTimetable {
  const newTimetable = { ...timetable }
  newTimetable.schedule = { ...timetable.schedule }
  newTimetable.schedule[day] = [...(timetable.schedule[day] || [])]
  
  if (slotIndex >= 0 && slotIndex < newTimetable.schedule[day].length) {
    newTimetable.schedule[day].splice(slotIndex, 1)
  }
  
  return newTimetable
}