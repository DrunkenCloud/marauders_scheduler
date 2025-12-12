import { prisma } from '@/lib/prisma'
import {
  CompiledCourseData,
  EntityWorkload,
  EntityData,
  CompiledSchedulingData,
  SlotFragment
} from '@/types'

// Helper function to deep clone timetable
function deepCloneTimetable(timetable: any): any {
  const cloned: any = {}
  for (const day in timetable) {
    cloned[day] = timetable[day].map((slot: any) => ({ ...slot }))
  }
  return cloned
}

// Helper function to calculate free minutes from timetable
function calculateFreeMinutes(timetable: any, startHour: number, startMinute: number, endHour: number, endMinute: number): { totalFreeMinutes: number, dailyFreeMinutes: { [day: string]: number } } {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const dailyFreeMinutes: { [day: string]: number } = {}
  let totalFreeMinutes = 0

  const startTimeMinutes = startHour * 60 + startMinute
  const endTimeMinutes = endHour * 60 + endMinute
  const totalDayMinutes = endTimeMinutes - startTimeMinutes

  for (const day of days) {
    const daySchedule: SlotFragment[] = timetable[day] || []
    let occupiedMinutes = 0

    for (const slot of daySchedule) {
      const slotStartMinutes = slot.startHour * 60 + slot.startMinute
      const slotEndMinutes = slotStartMinutes + slot.duration

      if (slotStartMinutes >= startTimeMinutes && slotEndMinutes <= endTimeMinutes) {
        occupiedMinutes += slot.duration
      }
    }

    const freeMinutes = totalDayMinutes - occupiedMinutes
    dailyFreeMinutes[day] = Math.max(0, freeMinutes)
    totalFreeMinutes += dailyFreeMinutes[day]
  }

  return { totalFreeMinutes, dailyFreeMinutes }
}

// Helper function to calculate current workload from timetable
function calculateCurrentWorkload(timetable: any): { [day: string]: number } {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const currentWorkload: { [day: string]: number } = {}

  for (const day of days) {
    const daySchedule: SlotFragment[] = timetable[day] || []
    let totalMinutes = 0

    for (const slot of daySchedule) {
      totalMinutes += slot.duration
    }

    currentWorkload[day] = totalMinutes
  }

  return currentWorkload
}

// Helper function to calculate total scheduled duration for an entity
function calculateTotalScheduledDuration(entityId: string, courses: CompiledCourseData[], entityType: 'student' | 'faculty' | 'hall' | 'studentGroup' | 'facultyGroup' | 'hallGroup'): number {
  let totalDuration = 0

  for (const course of courses) {
    let isInvolved = false

    switch (entityType) {
      case 'student':
        isInvolved = course.studentIds.includes(entityId)
        break
      case 'faculty':
        isInvolved = course.facultyIds.includes(entityId)
        break
      case 'hall':
        isInvolved = course.hallIds.includes(entityId)
        break
      case 'studentGroup':
        isInvolved = course.studentGroupIds.includes(entityId)
        break
      case 'facultyGroup':
        isInvolved = course.facultyGroupIds.includes(entityId)
        break
      case 'hallGroup':
        isInvolved = course.hallGroupIds.includes(entityId)
        break
    }

    if (isInvolved) {
      const remainingSessions = course.totalSessions - course.scheduledCount
      const sessionDurationMinutes = course.classDuration * course.sessionsPerLecture
      totalDuration += remainingSessions * sessionDurationMinutes
    }
  }

  return totalDuration
}

export async function compileSchedulingData(sessionId: string, courseIds: string[]): Promise<CompiledSchedulingData> {
  const courses = await prisma.course.findMany({
    where: {
      sessionId,
      id: { in: courseIds }
    },
    include: {
      compulsoryFaculties: true,
      compulsoryHalls: true,
      compulsoryFacultyGroups: {
        include: {
          facultyGroup: {
            include: {
              facultyMemberships: {
                include: { faculty: true }
              }
            }
          }
        }
      },
      compulsoryHallGroups: {
        include: {
          hallGroup: {
            include: {
              hallMemberships: {
                include: { hall: true }
              }
            }
          }
        }
      },
      studentEnrollments: {
        include: { student: true }
      },
      studentGroupEnrollments: {
        include: {
          studentGroup: {
            include: {
              studentMemberships: {
                include: { student: true }
              }
            }
          }
        }
      }
    }
  })

  const compiled: CompiledCourseData[] = courses.map((course: any) => {
    const studentIdSet = new Set<string>()
    const studentGroupIdSet = new Set<string>()
    
    for (const enrollment of course.studentEnrollments) {
      if (enrollment.student) studentIdSet.add(enrollment.student.id)
    }
    
    for (const groupEnrollment of course.studentGroupEnrollments) {
      if (groupEnrollment.studentGroup) {
        studentGroupIdSet.add(groupEnrollment.studentGroup.id)
      }
      const memberships = groupEnrollment.studentGroup?.studentMemberships ?? []
      for (const membership of memberships) {
        if (membership.student) studentIdSet.add(membership.student.id)
      }
    }

    const facultyIdSet = new Set<string>()
    const facultyGroupIdSet = new Set<string>()
    
    for (const f of course.compulsoryFaculties) {
      facultyIdSet.add(f.id)
    }
    
    for (const cfg of course.compulsoryFacultyGroups) {
      if (cfg.facultyGroup) {
        facultyGroupIdSet.add(cfg.facultyGroup.id)
      }
      const memberships = cfg.facultyGroup?.facultyMemberships ?? []
      for (const membership of memberships) {
        if (membership.faculty) facultyIdSet.add(membership.faculty.id)
      }
    }

    const hallIdSet = new Set<string>()
    const hallGroupIdSet = new Set<string>()
    
    for (const h of course.compulsoryHalls) {
      hallIdSet.add(h.id)
    }
    
    for (const chg of course.compulsoryHallGroups) {
      if (chg.hallGroup) {
        hallGroupIdSet.add(chg.hallGroup.id)
        const memberships = chg.hallGroup?.hallMemberships ?? []
        for (const membership of memberships) {
          if (membership.hall) hallIdSet.add(membership.hall.id)
        }
      }
    }

    return {
      courseId: course.id,
      courseCode: course.code,
      classDuration: course.classDuration,
      sessionsPerLecture: course.sessionsPerLecture,
      totalSessions: course.totalSessions,
      scheduledCount: course.scheduledCount,
      studentIds: Array.from(studentIdSet),
      facultyIds: Array.from(facultyIdSet),
      hallIds: Array.from(hallIdSet),
      studentGroupIds: Array.from(studentGroupIdSet),
      facultyGroupIds: Array.from(facultyGroupIdSet),
      hallGroupIds: Array.from(hallGroupIdSet)
    }
  })

  const allStudentIds = new Set<string>()
  const allFacultyIds = new Set<string>()
  const allHallIds = new Set<string>()
  const allStudentGroupIds = new Set<string>()
  const allFacultyGroupIds = new Set<string>()
  const allHallGroupIds = new Set<string>()

  for (const course of compiled) {
    course.studentIds.forEach(id => allStudentIds.add(id))
    course.facultyIds.forEach(id => allFacultyIds.add(id))
    course.hallIds.forEach(id => allHallIds.add(id))
    course.studentGroupIds.forEach(id => allStudentGroupIds.add(id))
    course.facultyGroupIds.forEach(id => allFacultyGroupIds.add(id))
    course.hallGroupIds.forEach(id => allHallGroupIds.add(id))
  }

  const [students, faculties, halls, studentGroups, facultyGroups, hallGroups] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: Array.from(allStudentIds) } } }),
    prisma.faculty.findMany({ where: { id: { in: Array.from(allFacultyIds) } } }),
    prisma.hall.findMany({ where: { id: { in: Array.from(allHallIds) } } }),
    prisma.studentGroup.findMany({ where: { id: { in: Array.from(allStudentGroupIds) } } }),
    prisma.facultyGroup.findMany({ where: { id: { in: Array.from(allFacultyGroupIds) } } }),
    prisma.hallGroup.findMany({ where: { id: { in: Array.from(allHallGroupIds) } } })
  ])

  const allEntities: { [entityId: string]: EntityData } = {}

  const processEntity = (entity: any, entityType: string) => {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      entity.timetable, entity.startHour, entity.startMinute, entity.endHour, entity.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(entity.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(entity.id, compiled, entityType as any)

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      // FIX: Handle zero totalFreeMinutes more intelligently
      if (totalFreeMinutes === 0) {
        // If no free time, entity can't schedule anything
        dailyThresholds[day] = 0
      } else {
        const dayPercentage = dailyFreeMinutes[day] / totalFreeMinutes
        dailyThresholds[day] = totalScheduledDuration * (1 - dayPercentage)
      }
    }

    allEntities[entity.id] = {
      id: entity.id,
      timetable: entity.timetable,
      startHour: entity.startHour,
      startMinute: entity.startMinute,
      endHour: entity.endHour,
      endMinute: entity.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }


  students.forEach(s => processEntity(s, 'student'))
  faculties.forEach(f => processEntity(f, 'faculty'))
  halls.forEach(h => processEntity(h, 'hall'))
  studentGroups.forEach(g => processEntity(g, 'studentGroup'))
  facultyGroups.forEach(g => processEntity(g, 'facultyGroup'))
  hallGroups.forEach(g => processEntity(g, 'hallGroup'))

  return {
    sessionId,
    courses: compiled,
    allEntities
  }
}

// Helper function to check if an entity is free during a specific time slot
function isEntityFree(
  timetable: any,
  day: string,
  startHour: number,
  startMinute: number,
  duration: number,
  workingStartHour: number,
  workingStartMinute: number,
  workingEndHour: number,
  workingEndMinute: number
): boolean {
  const daySchedule: SlotFragment[] = timetable[day] || []

  const slotStartMinutes = startHour * 60 + startMinute
  const slotEndMinutes = slotStartMinutes + duration
  const workingStartMinutes = workingStartHour * 60 + workingStartMinute
  const workingEndMinutes = workingEndHour * 60 + workingEndMinute

  if (slotStartMinutes < workingStartMinutes || slotEndMinutes > workingEndMinutes) {
    return false
  }

  for (const existingSlot of daySchedule) {
    const existingStartMinutes = existingSlot.startHour * 60 + existingSlot.startMinute
    const existingEndMinutes = existingStartMinutes + existingSlot.duration

    if (!(slotEndMinutes <= existingStartMinutes || slotStartMinutes >= existingEndMinutes)) {
      return false
    }
  }

  return true
}

// Helper function to check if workload allows scheduling on a specific day
function canScheduleOnDay(
  entityWorkload: EntityWorkload,
  day: string
): boolean {
  const currentWorkload = entityWorkload.currentWorkload[day] || 0
  const threshold = entityWorkload.dailyThresholds[day] || 0

  return currentWorkload <= threshold
}

// Helper function to check if all entities are available for a time slot
function areAllEntitiesAvailable(
  course: CompiledCourseData,
  day: string,
  startHour: number,
  startMinute: number,
  duration: number,
  data: CompiledSchedulingData,
  checkWorkload: boolean = true
): boolean {
  const allEntityIds = [
    ...course.studentIds,
    ...course.facultyIds,
    ...course.hallIds,
    ...course.studentGroupIds,
    ...course.facultyGroupIds,
    ...course.hallGroupIds
  ]

  for (const entityId of allEntityIds) {
    const entity = data.allEntities[entityId]
    if (!entity) continue

    if (!isEntityFree(
      entity.timetable,
      day,
      startHour,
      startMinute,
      duration,
      entity.startHour,
      entity.startMinute,
      entity.endHour,
      entity.endMinute
    )) {
      return false
    }

    if (checkWorkload && !canScheduleOnDay(entity.workload, day)) {
      return false
    }
  }

  return true
}

// Simple seeded random number generator
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed % 2147483647
    if (this.seed <= 0) this.seed += 2147483646
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }
}

// Helper function to shuffle an array
function shuffleArray<T>(array: T[], rng: SeededRandom): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// FIX: Find available time slots dynamically (not pre-calculated)
function findAvailableSlots(
  course: CompiledCourseData,
  duration: number,
  data: CompiledSchedulingData,
  scheduledDays: Set<string>
): Array<{ day: string, startHour: number, startMinute: number, isNewDay: boolean, withinWorkload: boolean }> {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const slots: Array<{ day: string, startHour: number, startMinute: number, isNewDay: boolean, withinWorkload: boolean }> = []

  const allEntityIds = [
    ...course.studentIds,
    ...course.facultyIds,
    ...course.hallIds,
    ...course.studentGroupIds,
    ...course.facultyGroupIds,
    ...course.hallGroupIds
  ]

  if (allEntityIds.length === 0) return slots

  // Find overlapping working hours
  let latestStartMinutes = 0
  let earliestEndMinutes = 24 * 60

  for (const entityId of allEntityIds) {
    const entity = data.allEntities[entityId]
    if (!entity) continue

    const entityStartMinutes = entity.startHour * 60 + entity.startMinute
    const entityEndMinutes = entity.endHour * 60 + entity.endMinute

    latestStartMinutes = Math.max(latestStartMinutes, entityStartMinutes)
    earliestEndMinutes = Math.min(earliestEndMinutes, entityEndMinutes)
  }

  for (const day of days) {
    const isNewDay = !scheduledDays.has(day)
    
    // Try every 10-minute interval
    for (let minutes = latestStartMinutes; minutes + duration <= earliestEndMinutes; minutes += 10) {
      const startHour = Math.floor(minutes / 60)
      const startMinute = minutes % 60

      // FIX: Verify slot is STILL available at this moment
      if (areAllEntitiesAvailable(course, day, startHour, startMinute, duration, data, false)) {
        const withinWorkload = areAllEntitiesAvailable(course, day, startHour, startMinute, duration, data, true)
        
        slots.push({
          day,
          startHour,
          startMinute,
          isNewDay,
          withinWorkload
        })
      }
    }
  }

  // Sort: new days first, workload compliant first, earlier times first
  slots.sort((a, b) => {
    if (a.isNewDay !== b.isNewDay) return a.isNewDay ? -1 : 1
    if (a.withinWorkload !== b.withinWorkload) return a.withinWorkload ? -1 : 1
    const aTime = a.startHour * 60 + a.startMinute
    const bTime = b.startHour * 60 + b.startMinute
    return aTime - bTime
  })

  return slots
}

// FIX: Enhanced constraint checking with forward checking
function canSatisfyRemainingCourses(
  data: CompiledSchedulingData,
  scheduledDaysMap: Map<string, Set<string>>
): boolean {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  
  for (const course of data.courses) {
    const target = course.targetSessions ?? course.totalSessions
    const remaining = target - course.scheduledCount
    
    if (remaining <= 0) continue

    const sessionDuration = course.classDuration * course.sessionsPerLecture
    const scheduledDays = scheduledDaysMap.get(course.courseId) || new Set()
    
    // Find how many slots are available for this course
    const availableSlots = findAvailableSlots(course, sessionDuration, data, scheduledDays)
    
    // FIX: Better feasibility check
    if (availableSlots.length < remaining) {
      return false
    }

    // Additional check: ensure we have enough unique days if needed
    const uniqueDaysAvailable = new Set(availableSlots.map(s => s.day)).size
    const workloadCompliantSlots = availableSlots.filter(s => s.withinWorkload).length
    
    // If we need diversity and don't have enough days, fail
    if (remaining > 1 && uniqueDaysAvailable < Math.min(remaining, days.length)) {
      // Check if workload violations are acceptable
      if (workloadCompliantSlots < remaining && availableSlots.length >= remaining) {
        // We have enough slots but violate workload - this might be acceptable
        continue
      }
      return false
    }
  }

  return true
}

// Main recursive scheduling function
export function scheduleCourses(data: CompiledSchedulingData, seed?: number): { success: boolean, message: string, scheduledSlots?: Array<SlotFragment & { day: string }> } {
  const allScheduledSlots: Array<SlotFragment & { day: string }> = []
  const scheduledDaysMap = new Map<string, Set<string>>() // Track which days each course is scheduled on

  // Initialize scheduled days map
  for (const course of data.courses) {
    scheduledDaysMap.set(course.courseId, new Set())
  }

  const actualSeed = seed ?? Math.floor(Math.random() * 1000000)
  const rng = new SeededRandom(actualSeed)

  // FIX: Memoization for failed states
  const failedStates = new Set<string>()

  function getStateKey(): string {
    const courseParts = data.courses.map(c => {
      const scheduledDays = scheduledDaysMap.get(c.courseId) || new Set()
      const dayString = Array.from(scheduledDays).sort().join('|')
      return `${c.courseId}:${c.scheduledCount}:${dayString}`
    })
    
    return courseParts.join(',')
  }

  function scheduleRecursively(depth: number = 0): boolean {
    // Check memoization
    const stateKey = getStateKey()
    if (failedStates.has(stateKey)) {
      return false
    }

    // Base case
    const unscheduledCourses = data.courses.filter(course => {
      const target = course.targetSessions ?? course.totalSessions
      return course.scheduledCount < target
    })

    if (unscheduledCourses.length === 0) {
      console.log('✅ All courses successfully scheduled!')
      return true
    }

    // FIX: Forward checking - fail early if remaining courses can't be satisfied
    if (!canSatisfyRemainingCourses(data, scheduledDaysMap)) {
      failedStates.add(stateKey)
      return false
    }

    // FIX: Use Most Constrained Variable heuristic - choose course with fewest available slots
    // This improves scheduling success by tackling the hardest courses first
    const coursesWithSlotCounts = unscheduledCourses.map(course => {
      const sessionDuration = course.classDuration * course.sessionsPerLecture
      const scheduledDays = scheduledDaysMap.get(course.courseId) || new Set()
      const availableSlots = findAvailableSlots(course, sessionDuration, data, scheduledDays)
      
      return {
        course,
        availableSlotCount: availableSlots.length
      }
    })

    // Sort by fewest available slots first (most constrained)
    coursesWithSlotCounts.sort((a, b) => a.availableSlotCount - b.availableSlotCount)

    for (const { course } of coursesWithSlotCounts) {
      const sessionDuration = course.classDuration * course.sessionsPerLecture
      const scheduledDays = scheduledDaysMap.get(course.courseId) || new Set()
      
      // FIX: Find slots dynamically right before trying
      const availableSlots = findAvailableSlots(course, sessionDuration, data, scheduledDays)

      if (availableSlots.length === 0) continue

      for (const slot of availableSlots) {
        const { day, startHour, startMinute } = slot

        const newSlot = {
          type: 'course' as const,
          startHour,
          startMinute,
          duration: sessionDuration,
          courseId: course.courseId,
          courseCode: course.courseCode,
          studentIds: course.studentIds,
          facultyIds: course.facultyIds,
          hallIds: course.hallIds,
          studentGroupIds: course.studentGroupIds,
          facultyGroupIds: course.facultyGroupIds,
          hallGroupIds: course.hallGroupIds,
          day
        }

        const allEntityIds = [
          ...course.studentIds,
          ...course.facultyIds,
          ...course.hallIds,
          ...course.studentGroupIds,
          ...course.facultyGroupIds,
          ...course.hallGroupIds
        ]

        // FIX: Save complete state for backtracking
        const originalScheduledCount = course.scheduledCount
        const originalWorkloads: { [entityId: string]: { [day: string]: number } } = {}
        const originalTimetables: { [entityId: string]: any } = {}

        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            originalWorkloads[entityId] = { ...entity.workload.currentWorkload }
            // FIX: Deep clone entire timetable
            originalTimetables[entityId] = deepCloneTimetable(entity.timetable)
          }
        }

        // Apply scheduling
        course.scheduledCount += 1
        allScheduledSlots.push(newSlot)
        scheduledDays.add(day)

        // Update workloads and timetables
        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            entity.workload.currentWorkload[day] += sessionDuration

            if (!entity.timetable[day]) {
              entity.timetable[day] = []
            }

            const timetableSlot = {
              type: newSlot.type,
              startHour: newSlot.startHour,
              startMinute: newSlot.startMinute,
              duration: newSlot.duration,
              courseId: newSlot.courseId,
              courseCode: newSlot.courseCode,
              hallIds: newSlot.hallIds || [],
              facultyIds: newSlot.facultyIds || [],
              hallGroupIds: newSlot.hallGroupIds || [],
              facultyGroupIds: newSlot.facultyGroupIds || [],
              studentIds: newSlot.studentIds || [],
              studentGroupIds: newSlot.studentGroupIds || []
            }

            entity.timetable[day].push(timetableSlot)

            entity.timetable[day].sort((a: any, b: any) => {
              const aTime = a.startHour * 60 + a.startMinute
              const bTime = b.startHour * 60 + b.startMinute
              return aTime - bTime
            })
          }
        }

        // Recurse
        if (scheduleRecursively(depth + 1)) {
          return true
        }

        // FIX: Backtrack with proper state restoration
        course.scheduledCount = originalScheduledCount
        allScheduledSlots.pop()
        scheduledDays.delete(day)

        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            if (originalWorkloads[entityId]) {
              entity.workload.currentWorkload = originalWorkloads[entityId]
            }
            if (originalTimetables[entityId]) {
              entity.timetable = originalTimetables[entityId]
            }
          }
        }
      }
    }

    // Mark this state as failed
    failedStates.add(stateKey)
    return false
  }

  const success = scheduleRecursively()

  if (success) {
    return {
      success: true,
      message: `Successfully scheduled all courses! Total sessions: ${allScheduledSlots.length}`,
      scheduledSlots: allScheduledSlots
    }
  } else {
    return {
      success: false,
      message: `Could not schedule all courses. Scheduled ${allScheduledSlots.length} sessions before getting stuck.`,
      scheduledSlots: allScheduledSlots
    }
  }
}

// Update entity timetables with scheduled slots
export async function updateEntityTimetables(
  scheduledSlots: Array<SlotFragment & { day: string }>,
  sessionId: string
): Promise<void> {
  const entityUpdates: { [entityType: string]: { [entityId: string]: Array<SlotFragment & { day: string }> } } = {
    student: {},
    faculty: {},
    hall: {},
    studentGroup: {},
    facultyGroup: {},
    hallGroup: {}
  }

  for (const slot of scheduledSlots) {
    for (const studentId of slot.studentIds || []) {
      if (!entityUpdates.student[studentId]) entityUpdates.student[studentId] = []
      entityUpdates.student[studentId].push(slot)
    }

    for (const facultyId of slot.facultyIds || []) {
      if (!entityUpdates.faculty[facultyId]) entityUpdates.faculty[facultyId] = []
      entityUpdates.faculty[facultyId].push(slot)
    }

    for (const hallId of slot.hallIds || []) {
      if (!entityUpdates.hall[hallId]) entityUpdates.hall[hallId] = []
      entityUpdates.hall[hallId].push(slot)
    }

    for (const groupId of slot.studentGroupIds || []) {
      if (!entityUpdates.studentGroup[groupId]) entityUpdates.studentGroup[groupId] = []
      entityUpdates.studentGroup[groupId].push(slot)
    }

    for (const groupId of slot.facultyGroupIds || []) {
      if (!entityUpdates.facultyGroup[groupId]) entityUpdates.facultyGroup[groupId] = []
      entityUpdates.facultyGroup[groupId].push(slot)
    }

    for (const groupId of slot.hallGroupIds || []) {
      if (!entityUpdates.hallGroup[groupId]) entityUpdates.hallGroup[groupId] = []
      entityUpdates.hallGroup[groupId].push(slot)
    }
  }

  for (const [entityType, entities] of Object.entries(entityUpdates)) {
    for (const [entityId, slots] of Object.entries(entities)) {
      if (slots.length === 0) continue

      let currentEntity: any
      switch (entityType) {
        case 'student':
          currentEntity = await prisma.student.findUnique({ where: { id: entityId } })
          break
        case 'faculty':
          currentEntity = await prisma.faculty.findUnique({ where: { id: entityId } })
          break
        case 'hall':
          currentEntity = await prisma.hall.findUnique({ where: { id: entityId } })
          break
        case 'studentGroup':
          currentEntity = await prisma.studentGroup.findUnique({ where: { id: entityId } })
          break
        case 'facultyGroup':
          currentEntity = await prisma.facultyGroup.findUnique({ where: { id: entityId } })
          break
        case 'hallGroup':
          currentEntity = await prisma.hallGroup.findUnique({ where: { id: entityId } })
          break
      }

      if (!currentEntity) continue

      const updatedTimetable = { ...currentEntity.timetable }

      for (const slot of slots) {
        const { day } = slot
        if (!updatedTimetable[day]) updatedTimetable[day] = []

        const timetableSlot = {
          type: slot.type,
          startHour: slot.startHour,
          startMinute: slot.startMinute,
          duration: slot.duration,
          courseId: slot.courseId,
          courseCode: slot.courseCode,
          blockerReason: slot.blockerReason,
          hallIds: slot.hallIds || [],
          facultyIds: slot.facultyIds || [],
          hallGroupIds: slot.hallGroupIds || [],
          facultyGroupIds: slot.facultyGroupIds || [],
          studentIds: slot.studentIds || [],
          studentGroupIds: slot.studentGroupIds || []
        }

        updatedTimetable[day].push(timetableSlot)
      }

      for (const day of Object.keys(updatedTimetable)) {
        updatedTimetable[day].sort((a: any, b: any) => {
          const aTime = a.startHour * 60 + a.startMinute
          const bTime = b.startHour * 60 + b.startMinute
          return aTime - bTime
        })
      }

      switch (entityType) {
        case 'student':
          await prisma.student.update({
            where: { id: entityId },
            data: { timetable: updatedTimetable }
          })
          break
        case 'faculty':
          await prisma.faculty.update({
            where: { id: entityId },
            data: { timetable: updatedTimetable }
          })
          break
        case 'hall':
          await prisma.hall.update({
            where: { id: entityId },
            data: { timetable: updatedTimetable }
          })
          break
        case 'studentGroup':
          await prisma.studentGroup.update({
            where: { id: entityId },
            data: { timetable: updatedTimetable }
          })
          break
        case 'facultyGroup':
          await prisma.facultyGroup.update({
            where: { id: entityId },
            data: { timetable: updatedTimetable }
          })
          break
        case 'hallGroup':
          await prisma.hallGroup.update({
            where: { id: entityId },
            data: { timetable: updatedTimetable }
          })
          break
      }
    }
  }

  const courseUpdates: { [courseId: string]: number } = {}
  for (const slot of scheduledSlots) {
    if (slot.courseId) {
      courseUpdates[slot.courseId] = (courseUpdates[slot.courseId] || 0) + 1
    }
  }

  for (const [courseId, additionalCount] of Object.entries(courseUpdates)) {
    await prisma.course.update({
      where: { id: courseId },
      data: {
        scheduledCount: {
          increment: additionalCount
        }
      }
    })
  }
}