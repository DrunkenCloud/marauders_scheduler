import {
  EntityType,
  ValidationResult,
  EntityTiming,
  TimetableSlot,
  SlotFragment,
  TimeSlot,
  AvailableSlot,
  DaySchedule,
  EntityTimetable
} from '@/types'



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
  entityType: EntityType
): EntityTimetable {
  const schedule: DaySchedule = {}

  // Initialize each day with empty arrays (no free slots anymore)
  DAYS_OF_WEEK.forEach(day => {
    schedule[day] = []
  })

  return {
    entityId,
    entityType,
    schedule,
    isComplete: false // No longer auto-complete for students
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
      return [
        slot.type,
        slot.startHour,
        slot.startMinute,
        slot.duration,
        slot.courseId || null,
        slot.courseCode || '',
        slot.blockerReason || '',
        slot.hallIds || [],
        slot.facultyIds || [],
        slot.hallGroupIds || [],
        slot.facultyGroupIds || [],
        slot.studentIds || [],
        slot.studentGroupIds || []
      ]
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
    schedule[day] = dayData
      .map((slot: any) => {
        // Handle object format (direct TimetableSlot objects)
        if (slot && typeof slot === 'object' && !Array.isArray(slot) && 'type' in slot) {
          const timetableSlot: TimetableSlot = {
            type: slot.type || 'course',
            startHour: slot.startHour || 8,
            startMinute: slot.startMinute || 0,
            duration: slot.duration || DEFAULT_SLOT_DURATION,
            courseId: slot.courseId || undefined,
            courseCode: slot.courseCode || undefined,
            blockerReason: slot.blockerReason || undefined,
            hallIds: Array.isArray(slot.hallIds) ? slot.hallIds : [],
            facultyIds: Array.isArray(slot.facultyIds) ? slot.facultyIds : [],
            hallGroupIds: Array.isArray(slot.hallGroupIds) ? slot.hallGroupIds : [],
            facultyGroupIds: Array.isArray(slot.facultyGroupIds) ? slot.facultyGroupIds : [],
            studentIds: Array.isArray(slot.studentIds) ? slot.studentIds : [],
            studentGroupIds: Array.isArray(slot.studentGroupIds) ? slot.studentGroupIds : []
          }
          return timetableSlot
        }

        // Handle array format (legacy)
        if (Array.isArray(slot)) {
          // Skip old free slots [0]
          if (slot.length === 1 && slot[0] === 0) {
            return null
          }

          // Handle current array format (13 elements)
          if (slot.length >= 13) {
            const timetableSlot: TimetableSlot = {
              type: slot[0] || 'course',
              startHour: slot[1] || 8,
              startMinute: slot[2] || 0,
              duration: slot[3] || DEFAULT_SLOT_DURATION,
              courseId: slot[4] || undefined,
              courseCode: slot[5] || undefined,
              blockerReason: slot[6] || undefined,
              hallIds: Array.isArray(slot[7]) ? slot[7] : [],
              facultyIds: Array.isArray(slot[8]) ? slot[8] : [],
              hallGroupIds: Array.isArray(slot[9]) ? slot[9] : [],
              facultyGroupIds: Array.isArray(slot[10]) ? slot[10] : [],
              studentIds: Array.isArray(slot[11]) ? slot[11] : [],
              studentGroupIds: Array.isArray(slot[12]) ? slot[12] : []
            }
            return timetableSlot
          }

          // Handle older array format (7+ elements)
          if (slot.length >= 7) {
            const timetableSlot: TimetableSlot = {
              type: slot[0] || 'course',
              startHour: slot[1] || 8,
              startMinute: slot[2] || 0,
              duration: slot[3] || DEFAULT_SLOT_DURATION,
              courseId: slot[4] || undefined,
              courseCode: slot[5] || undefined,
              blockerReason: slot[6] || undefined,
              hallIds: Array.isArray(slot[7]) ? slot[7] : [],
              facultyIds: Array.isArray(slot[8]) ? slot[8] : [],
              hallGroupIds: Array.isArray(slot[9]) ? slot[9] : [],
              facultyGroupIds: Array.isArray(slot[10]) ? slot[10] : [],
              studentIds: Array.isArray(slot[11]) ? slot[11] : [],
              studentGroupIds: Array.isArray(slot[12]) ? slot[12] : []
            }
            return timetableSlot
          }

          // Handle very old format (4+ elements)
          if (slot.length >= 4) {
            const timetableSlot: TimetableSlot = {
              type: 'course',
              startHour: typeof slot[1] === 'string' ? parseInt(slot[1].split(':')[0]) : (slot[1] || 8),
              startMinute: typeof slot[1] === 'string' ? parseInt(slot[1].split(':')[1]) : (slot[2] || 0),
              duration: typeof slot[1] === 'string' ? (slot[2] || DEFAULT_SLOT_DURATION) : (slot[3] || DEFAULT_SLOT_DURATION),
              courseCode: typeof slot[1] === 'string' ? (slot[3] || undefined) : (slot[4] || undefined),
              hallIds: Array.isArray(slot[5]) ? slot[5] : (slot[5] ? [slot[5]] : []),
              facultyIds: Array.isArray(slot[6]) ? slot[6] : (slot[6] ? [slot[6]] : []),
              hallGroupIds: [],
              facultyGroupIds: [],
              studentIds: [],
              studentGroupIds: []
            }
            return timetableSlot
          }
        }
        return null
      })
      .filter((slot: TimetableSlot | null) => slot !== null) as TimetableSlot[]
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

  // Entity-specific validation - no longer needed since we don't have free slots

  // Validate slot data integrity
  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    daySlots.forEach((slot, index) => {
      if (typeof slot === 'object' && 'type' in slot) {
        const tSlot = slot as TimetableSlot

        // Validate all slots have required data
        if (tSlot.startHour === undefined || tSlot.startMinute === undefined) {
          errors.push(`Slot on ${day}, position ${index + 1} missing start time`)
        }
        if (!tSlot.duration || tSlot.duration <= 0) {
          errors.push(`Slot on ${day}, position ${index + 1} has invalid duration`)
        }

        // Validate course slots
        if (tSlot.type === 'course') {
          if (!tSlot.courseCode && !tSlot.courseId) {
            warnings.push(`Course slot on ${day}, position ${index + 1} missing course information`)
          }
        }

        // Validate blocker slots
        if (tSlot.type === 'blocker') {
          if (!tSlot.blockerReason) {
            warnings.push(`Blocker slot on ${day}, position ${index + 1} missing reason`)
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
      type: fragment.type,
      startHour: currentHour,
      startMinute: currentMinute,
      duration: fragmentDuration,
      courseId: fragment.courseId || slot.courseId,
      courseCode: fragment.courseCode || slot.courseCode,
      blockerReason: fragment.blockerReason || slot.blockerReason,
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
    type: firstSlot.type,
    startHour: firstSlot.startHour,
    startMinute: firstSlot.startMinute,
    duration: totalDuration,
    courseId: firstSlot.courseId,
    courseCode: firstSlot.courseCode,
    blockerReason: firstSlot.blockerReason,
    hallIds: firstSlot.hallIds,
    facultyIds: firstSlot.facultyIds,
    hallGroupIds: firstSlot.hallGroupIds,
    facultyGroupIds: firstSlot.facultyGroupIds,
    studentIds: firstSlot.studentIds,
    studentGroupIds: firstSlot.studentGroupIds
  }
}

/**
 * Find available time gaps for scheduling
 */
export function findAvailableTimeGaps(
  timetable: EntityTimetable,
  entityTiming: EntityTiming,
  requiredDuration: number
): AvailableSlot[] {
  const availableSlots: AvailableSlot[] = []

  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []

    // Sort slots by start time
    const sortedSlots = [...daySlots].sort((a, b) => {
      const aTime = a.startHour * 60 + a.startMinute
      const bTime = b.startHour * 60 + b.startMinute
      return aTime - bTime
    })

    const dayStartMinutes = entityTiming.startHour * 60 + entityTiming.startMinute
    const dayEndMinutes = entityTiming.endHour * 60 + entityTiming.endMinute

    let currentTime = dayStartMinutes

    // Check gaps between slots
    for (const slot of sortedSlots) {
      const slotStart = slot.startHour * 60 + slot.startMinute
      const slotEnd = slotStart + slot.duration

      // Check if there's a gap before this slot
      if (slotStart - currentTime >= requiredDuration) {
        const gapStart = currentTime
        const gapDuration = slotStart - currentTime

        availableSlots.push({
          day,
          startSlotIndex: 0, // Not applicable for gaps
          slots: [{
            type: 'course',
            startHour: Math.floor(gapStart / 60),
            startMinute: gapStart % 60,
            duration: gapDuration
          }],
          totalDuration: gapDuration
        })
      }

      currentTime = Math.max(currentTime, slotEnd)
    }

    // Check if there's a gap at the end of the day
    if (dayEndMinutes - currentTime >= requiredDuration) {
      const gapStart = currentTime
      const gapDuration = dayEndMinutes - currentTime

      availableSlots.push({
        day,
        startSlotIndex: 0, // Not applicable for gaps
        slots: [{
          type: 'course',
          startHour: Math.floor(gapStart / 60),
          startMinute: gapStart % 60,
          duration: gapDuration
        }],
        totalDuration: gapDuration
      })
    }
  })

  return availableSlots
}

/**
 * Check if a specific time period is available
 */
export function isTimeAvailable(
  timetable: EntityTimetable,
  day: DayOfWeek,
  startHour: number,
  startMinute: number,
  duration: number
): boolean {
  const daySlots = timetable.schedule[day] || []
  const requestedStart = startHour * 60 + startMinute
  const requestedEnd = requestedStart + duration

  // Check if any existing slot conflicts with the requested time
  for (const slot of daySlots) {
    const slotStart = slot.startHour * 60 + slot.startMinute
    const slotEnd = slotStart + slot.duration

    // Check for overlap
    if (requestedStart < slotEnd && requestedEnd > slotStart) {
      return false // Conflict found
    }
  }

  return true // No conflicts
}

/**
 * Get all slots from timetable
 */
export function getAllSlots(timetable: EntityTimetable): { day: DayOfWeek; slot: TimetableSlot; index: number }[] {
  const allSlots: { day: DayOfWeek; slot: TimetableSlot; index: number }[] = []

  DAYS_OF_WEEK.forEach(day => {
    const daySlots = timetable.schedule[day] || []
    daySlots.forEach((slot, index) => {
      allSlots.push({
        day,
        slot,
        index
      })
    })
  })

  return allSlots
}

/**
 * Add a new slot to a timetable
 */
export function addSlot(
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
    const aTime = a.startHour * 60 + a.startMinute
    const bTime = b.startHour * 60 + b.startMinute
    return aTime - bTime
  })

  return newTimetable
}

/**
 * Remove a slot from a timetable
 */
export function removeSlot(
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