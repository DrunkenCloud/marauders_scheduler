import {
  EntityType,
  ValidationResult,
  TimetableSlot,
  DaySchedule,
  EntityTimetable,
  SLOTS_PER_DAY
} from '@/types'

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
export type DayOfWeek = typeof DAYS_OF_WEEK[number]

export { SLOTS_PER_DAY }

/** Initialize an empty timetable for an entity */
export function initializeEmptyTimetable(entityId: string, entityType: EntityType): EntityTimetable {
  const schedule: DaySchedule = {}
  DAYS_OF_WEEK.forEach(day => { schedule[day] = [] })
  return { entityId, entityType, schedule, isComplete: false }
}

/** Convert raw DB timetable JSON → EntityTimetable */
export function convertRawTimetableToEntityTimetable(
  rawTimetable: any,
  entityId: string,
  entityType: EntityType
): EntityTimetable {
  const schedule: DaySchedule = {}
  DAYS_OF_WEEK.forEach(day => { schedule[day] = [] })

  if (rawTimetable && typeof rawTimetable === 'object') {
    DAYS_OF_WEEK.forEach(day => {
      const dayData = rawTimetable[day]
      if (Array.isArray(dayData)) {
        schedule[day] = dayData
          .map((slot: any): TimetableSlot | null => {
            if (!slot || typeof slot !== 'object' || !('type' in slot)) return null
            return {
              type: slot.type || 'course',
              slotNumber: slot.slotNumber ?? 0,
              slotSpan: slot.slotSpan ?? 1,
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
          })
          .filter((s): s is TimetableSlot => s !== null)
      }
    })
  }

  return { entityId, entityType, schedule, isComplete: false }
}

/** Convert EntityTimetable → raw JSON for DB storage */
export function convertEntityTimetableToRaw(timetable: EntityTimetable): any {
  const raw: any = {}
  DAYS_OF_WEEK.forEach(day => {
    raw[day] = (timetable.schedule[day] || []).map(slot => ({
      type: slot.type,
      slotNumber: slot.slotNumber,
      slotSpan: slot.slotSpan,
      courseId: slot.courseId,
      courseCode: slot.courseCode,
      blockerReason: slot.blockerReason,
      hallIds: slot.hallIds || [],
      facultyIds: slot.facultyIds || [],
      hallGroupIds: slot.hallGroupIds || [],
      facultyGroupIds: slot.facultyGroupIds || [],
      studentIds: slot.studentIds || [],
      studentGroupIds: slot.studentGroupIds || []
    }))
  })
  return raw
}

/** Get all slot numbers occupied on a given day (accounting for slotSpan) */
export function getOccupiedSlots(timetable: EntityTimetable, day: DayOfWeek): Set<number> {
  const occupied = new Set<number>()
  for (const slot of timetable.schedule[day] || []) {
    for (let i = 0; i < slot.slotSpan; i++) {
      occupied.add(slot.slotNumber + i)
    }
  }
  return occupied
}

/** Get free slot numbers for a day */
export function getFreeSlots(timetable: EntityTimetable, day: DayOfWeek): number[] {
  const occupied = getOccupiedSlots(timetable, day)
  const free: number[] = []
  for (let i = 0; i < SLOTS_PER_DAY; i++) {
    if (!occupied.has(i)) free.push(i)
  }
  return free
}

/** Check if a slot range is available (no overlap with existing slots) */
export function isSlotAvailable(
  timetable: EntityTimetable,
  day: DayOfWeek,
  slotNumber: number,
  slotSpan: number
): boolean {
  const occupied = getOccupiedSlots(timetable, day)
  for (let i = 0; i < slotSpan; i++) {
    if (occupied.has(slotNumber + i)) return false
  }
  return true
}

/** Add a slot to a timetable (sorted by slotNumber) */
export function addSlot(timetable: EntityTimetable, day: DayOfWeek, slot: TimetableSlot): EntityTimetable {
  const newTimetable = { ...timetable, schedule: { ...timetable.schedule } }
  newTimetable.schedule[day] = [...(timetable.schedule[day] || []), slot]
    .sort((a, b) => a.slotNumber - b.slotNumber)
  return newTimetable
}

/** Remove a slot by index */
export function removeSlot(timetable: EntityTimetable, day: DayOfWeek, slotIndex: number): EntityTimetable {
  const newTimetable = { ...timetable, schedule: { ...timetable.schedule } }
  newTimetable.schedule[day] = [...(timetable.schedule[day] || [])]
  if (slotIndex >= 0 && slotIndex < newTimetable.schedule[day].length) {
    newTimetable.schedule[day].splice(slotIndex, 1)
  }
  return newTimetable
}

/** Get all slots across all days */
export function getAllSlots(timetable: EntityTimetable): { day: DayOfWeek; slot: TimetableSlot; index: number }[] {
  const result: { day: DayOfWeek; slot: TimetableSlot; index: number }[] = []
  DAYS_OF_WEEK.forEach(day => {
    (timetable.schedule[day] || []).forEach((slot, index) => {
      result.push({ day, slot, index })
    })
  })
  return result
}

/** Validate a timetable */
export function validateTimetable(timetable: EntityTimetable): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  DAYS_OF_WEEK.forEach(day => {
    if (!timetable.schedule[day]) {
      errors.push(`Missing schedule for ${day}`)
      return
    }

    const occupied = new Set<number>()
    for (const slot of timetable.schedule[day]) {
      if (slot.slotNumber < 0 || slot.slotNumber >= SLOTS_PER_DAY) {
        errors.push(`Invalid slotNumber ${slot.slotNumber} on ${day}`)
      }
      if (!slot.slotSpan || slot.slotSpan < 1) {
        errors.push(`Invalid slotSpan on ${day} slot ${slot.slotNumber}`)
      }
      if (slot.slotNumber + slot.slotSpan > SLOTS_PER_DAY) {
        errors.push(`Slot ${slot.slotNumber} with span ${slot.slotSpan} exceeds day boundary on ${day}`)
      }
      for (let i = 0; i < slot.slotSpan; i++) {
        const n = slot.slotNumber + i
        if (occupied.has(n)) {
          errors.push(`Overlapping slots at position ${n} on ${day}`)
        }
        occupied.add(n)
      }
      if (slot.type === 'course' && !slot.courseCode && !slot.courseId) {
        warnings.push(`Course slot on ${day} slot ${slot.slotNumber} missing course info`)
      }
      if (slot.type === 'blocker' && !slot.blockerReason) {
        warnings.push(`Blocker on ${day} slot ${slot.slotNumber} missing reason`)
      }
    }
  })

  return { isValid: errors.length === 0, errors, warnings }
}
