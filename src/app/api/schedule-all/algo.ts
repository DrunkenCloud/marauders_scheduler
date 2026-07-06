import { prisma } from '@/lib/prisma'
import {
  CompiledCourseData,
  EntityWorkload,
  EntityData,
  CompiledSchedulingData,
  SlotFragment,
  SLOTS_PER_DAY
} from '@/types'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const

// Count free slots per day (slots not occupied by any existing slot)
function calculateFreeSlots(timetable: any): { totalFreeSlots: number; dailyFreeSlots: { [day: string]: number } } {
  const dailyFreeSlots: { [day: string]: number } = {}
  let totalFreeSlots = 0

  for (const day of DAYS) {
    const daySchedule: any[] = timetable[day] || []
    const occupied = new Set<number>()
    for (const slot of daySchedule) {
      const span = slot.slotSpan ?? 1
      for (let i = 0; i < span; i++) occupied.add(slot.slotNumber + i)
    }
    const free = SLOTS_PER_DAY - occupied.size
    dailyFreeSlots[day] = Math.max(0, free)
    totalFreeSlots += dailyFreeSlots[day]
  }

  return { totalFreeSlots, dailyFreeSlots }
}

// Count slots currently used per day
function calculateCurrentWorkload(timetable: any): { [day: string]: number } {
  const workload: { [day: string]: number } = {}
  for (const day of DAYS) {
    const daySchedule: any[] = timetable[day] || []
    let used = 0
    for (const slot of daySchedule) used += slot.slotSpan ?? 1
    workload[day] = used
  }
  return workload
}

// Total slots still needed by this entity across all its courses
function calculateTotalScheduledSlots(
  entityId: string,
  courses: CompiledCourseData[],
  entityType: string
): number {
  let total = 0
  for (const course of courses) {
    let involved = false
    switch (entityType) {
      case 'student': involved = course.studentIds.includes(entityId); break
      case 'faculty': involved = course.facultyIds.includes(entityId); break
      case 'hall': involved = course.hallIds.includes(entityId); break
      case 'studentGroup': involved = course.studentGroupIds.includes(entityId); break
      case 'facultyGroup': involved = course.facultyGroupIds.includes(entityId); break
      case 'hallGroup': involved = course.hallGroupIds.includes(entityId); break
    }
    if (involved) {
      const remaining = course.totalSessions - course.scheduledCount
      total += remaining * course.sessionsPerLecture // sessionsPerLecture = slotSpan
    }
  }
  return total
}

export async function compileSchedulingData(sessionId: string, courseIds: string[]): Promise<CompiledSchedulingData> {
  const courses = await prisma.course.findMany({
    where: { sessionId, id: { in: courseIds } },
    include: {
      compulsoryFaculties: true,
      compulsoryHalls: true,
      compulsoryFacultyGroups: { include: { facultyGroup: { include: { facultyMemberships: { include: { faculty: true } } } } } },
      compulsoryHallGroups: { include: { hallGroup: { include: { hallMemberships: { include: { hall: true } } } } } },
      studentEnrollments: { include: { student: true } },
      studentGroupEnrollments: { include: { studentGroup: { include: { studentMemberships: { include: { student: true } } } } } }
    }
  })

  const compiled: CompiledCourseData[] = courses.map((course: any) => {
    const studentIdSet = new Set<string>()
    const studentGroupIdSet = new Set<string>()
    for (const e of course.studentEnrollments) if (e.student) studentIdSet.add(e.student.id)
    for (const ge of course.studentGroupEnrollments) {
      if (ge.studentGroup) studentGroupIdSet.add(ge.studentGroup.id)
      for (const m of ge.studentGroup?.studentMemberships ?? []) if (m.student) studentIdSet.add(m.student.id)
    }

    const facultyIdSet = new Set<string>()
    const facultyGroupIdSet = new Set<string>()
    for (const f of course.compulsoryFaculties) facultyIdSet.add(f.id)
    for (const cfg of course.compulsoryFacultyGroups) {
      if (cfg.facultyGroup) facultyGroupIdSet.add(cfg.facultyGroup.id)
      for (const m of cfg.facultyGroup?.facultyMemberships ?? []) if (m.faculty) facultyIdSet.add(m.faculty.id)
    }

    const hallIdSet = new Set<string>()
    const hallGroupIdSet = new Set<string>()
    for (const h of course.compulsoryHalls) hallIdSet.add(h.id)
    for (const chg of course.compulsoryHallGroups) {
      if (chg.hallGroup) {
        hallGroupIdSet.add(chg.hallGroup.id)
        for (const m of chg.hallGroup?.hallMemberships ?? []) if (m.hall) hallIdSet.add(m.hall.id)
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

  // Collect all entity IDs
  const allStudentIds = new Set<string>()
  const allFacultyIds = new Set<string>()
  const allHallIds = new Set<string>()
  const allStudentGroupIds = new Set<string>()
  const allFacultyGroupIds = new Set<string>()
  const allHallGroupIds = new Set<string>()
  for (const c of compiled) {
    c.studentIds.forEach(id => allStudentIds.add(id))
    c.facultyIds.forEach(id => allFacultyIds.add(id))
    c.hallIds.forEach(id => allHallIds.add(id))
    c.studentGroupIds.forEach(id => allStudentGroupIds.add(id))
    c.facultyGroupIds.forEach(id => allFacultyGroupIds.add(id))
    c.hallGroupIds.forEach(id => allHallGroupIds.add(id))
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
    const { totalFreeSlots, dailyFreeSlots } = calculateFreeSlots(entity.timetable)
    const currentWorkload = calculateCurrentWorkload(entity.timetable)
    const totalScheduledSlots = calculateTotalScheduledSlots(entity.id, compiled, entityType)

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of DAYS) {
      if (totalFreeSlots === 0) {
        dailyThresholds[day] = 0
      } else {
        const dayPct = dailyFreeSlots[day] / totalFreeSlots
        dailyThresholds[day] = totalScheduledSlots * (1 - dayPct)
      }
    }

    allEntities[entity.id] = {
      id: entity.id,
      timetable: entity.timetable,
      workload: { totalFreeSlots, dailyFreeSlots, dailyThresholds, currentWorkload, totalScheduledSlots }
    }
  }

  students.forEach(e => processEntity(e, 'student'))
  faculties.forEach(e => processEntity(e, 'faculty'))
  halls.forEach(e => processEntity(e, 'hall'))
  studentGroups.forEach(e => processEntity(e, 'studentGroup'))
  facultyGroups.forEach(e => processEntity(e, 'facultyGroup'))
  hallGroups.forEach(e => processEntity(e, 'hallGroup'))

  return { sessionId, courses: compiled, allEntities }
}

// Check if an entity has a specific slot range free
function isEntitySlotFree(timetable: any, day: string, slotNumber: number, slotSpan: number): boolean {
  const daySchedule: any[] = timetable[day] || []
  const occupied = new Set<number>()
  for (const slot of daySchedule) {
    const span = slot.slotSpan ?? 1
    for (let i = 0; i < span; i++) occupied.add(slot.slotNumber + i)
  }
  for (let i = 0; i < slotSpan; i++) {
    if (occupied.has(slotNumber + i)) return false
  }
  return true
}

function canScheduleOnDay(workload: EntityWorkload, day: string): boolean {
  const current = workload.currentWorkload[day] || 0
  const threshold = workload.dailyThresholds[day] || 0
  return current <= threshold
}

function areAllEntitiesAvailable(
  course: CompiledCourseData,
  day: string,
  slotNumber: number,
  slotSpan: number,
  data: CompiledSchedulingData,
  checkWorkload: boolean = true
): boolean {
  const allIds = [
    ...course.studentIds, ...course.facultyIds, ...course.hallIds,
    ...course.studentGroupIds, ...course.facultyGroupIds, ...course.hallGroupIds
  ]
  for (const entityId of allIds) {
    const entity = data.allEntities[entityId]
    if (!entity) continue
    if (!isEntitySlotFree(entity.timetable, day, slotNumber, slotSpan)) return false
    if (checkWorkload && !canScheduleOnDay(entity.workload, day)) return false
  }
  return true
}

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

function shuffleArray<T>(array: T[], rng: SeededRandom): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function findAvailableSlots(
  course: CompiledCourseData,
  slotSpan: number,
  data: CompiledSchedulingData,
  scheduledDays: Set<string>
): Array<{ day: string; slotNumber: number; isNewDay: boolean; withinWorkload: boolean }> {
  const slots: Array<{ day: string; slotNumber: number; isNewDay: boolean; withinWorkload: boolean }> = []

  for (const day of DAYS) {
    const isNewDay = !scheduledDays.has(day)
    // Try each possible starting slot
    for (let slotNumber = 0; slotNumber + slotSpan <= SLOTS_PER_DAY; slotNumber++) {
      if (areAllEntitiesAvailable(course, day, slotNumber, slotSpan, data, false)) {
        const withinWorkload = areAllEntitiesAvailable(course, day, slotNumber, slotSpan, data, true)
        slots.push({ day, slotNumber, isNewDay, withinWorkload })
      }
    }
  }

  slots.sort((a, b) => {
    if (a.isNewDay !== b.isNewDay) return a.isNewDay ? -1 : 1
    if (a.withinWorkload !== b.withinWorkload) return a.withinWorkload ? -1 : 1
    return a.slotNumber - b.slotNumber
  })

  return slots
}

function canSatisfyRemainingCourses(data: CompiledSchedulingData, scheduledDaysMap: Map<string, Set<string>>): boolean {
  for (const course of data.courses) {
    const target = course.targetSessions ?? course.totalSessions
    const remaining = target - course.scheduledCount
    if (remaining <= 0) continue

    const slotSpan = course.sessionsPerLecture
    const scheduledDays = scheduledDaysMap.get(course.courseId) || new Set()
    const available = findAvailableSlots(course, slotSpan, data, scheduledDays)

    if (available.length < remaining) return false

    const uniqueDays = new Set(available.map(s => s.day)).size
    const workloadOk = available.filter(s => s.withinWorkload).length
    if (remaining > 1 && uniqueDays < Math.min(remaining, DAYS.length)) {
      if (!(workloadOk < remaining && available.length >= remaining)) return false
    }
  }
  return true
}

function deepCloneTimetable(timetable: any): any {
  const cloned: any = {}
  for (const day in timetable) {
    cloned[day] = timetable[day].map((slot: any) => ({ ...slot }))
  }
  return cloned
}

export async function scheduleCourses(data: CompiledSchedulingData, seed?: number): Promise<{
  success: boolean
  message: string
  scheduledSlots?: Array<SlotFragment & { day: string }>
  failureDetails?: any[]
}> {
  const allScheduledSlots: Array<SlotFragment & { day: string }> = []
  const scheduledDaysMap = new Map<string, Set<string>>()
  for (const course of data.courses) scheduledDaysMap.set(course.courseId, new Set())

  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 1000000))
  const failedStates = new Set<string>()
  const courseFailureTracking = new Map<string, { attemptCount: number; lastAvailableSlots: number }>()

  function getStateKey(): string {
    return data.courses.map(c => {
      const days = Array.from(scheduledDaysMap.get(c.courseId) || new Set()).sort().join('|')
      return `${c.courseId}:${c.scheduledCount}:${days}`
    }).join(',')
  }

  function scheduleRecursively(depth: number = 0): boolean {
    const stateKey = getStateKey()
    if (failedStates.has(stateKey)) return false

    const unscheduled = data.courses.filter(c => c.scheduledCount < (c.targetSessions ?? c.totalSessions))
    if (unscheduled.length === 0) return true

    if (!canSatisfyRemainingCourses(data, scheduledDaysMap)) {
      failedStates.add(stateKey)
      return false
    }

    // MCV: sort by fewest available slots
    const withCounts = unscheduled.map(course => {
      const slotSpan = course.sessionsPerLecture
      const scheduledDays = scheduledDaysMap.get(course.courseId) || new Set()
      return { course, count: findAvailableSlots(course, slotSpan, data, scheduledDays).length }
    })
    withCounts.sort((a, b) => a.count - b.count)

    // Group by count and shuffle within groups
    const grouped: { [k: number]: typeof withCounts } = {}
    for (const item of withCounts) {
      if (!grouped[item.count]) grouped[item.count] = []
      grouped[item.count].push(item)
    }
    const shuffled: typeof withCounts = []
    for (const count of Object.keys(grouped).map(Number).sort((a, b) => a - b)) {
      shuffled.push(...shuffleArray(grouped[count], rng))
    }

    for (const { course } of shuffled) {
      const slotSpan = course.sessionsPerLecture
      const scheduledDays = scheduledDaysMap.get(course.courseId)!
      const available = findAvailableSlots(course, slotSpan, data, scheduledDays)

      if (!courseFailureTracking.has(course.courseId)) {
        courseFailureTracking.set(course.courseId, { attemptCount: 0, lastAvailableSlots: available.length })
      }
      courseFailureTracking.get(course.courseId)!.attemptCount++
      courseFailureTracking.get(course.courseId)!.lastAvailableSlots = available.length

      if (available.length === 0) continue

      for (const { day, slotNumber } of available) {
        const allIds = [
          ...course.studentIds, ...course.facultyIds, ...course.hallIds,
          ...course.studentGroupIds, ...course.facultyGroupIds, ...course.hallGroupIds
        ]

        // Save state for backtracking
        const origCount = course.scheduledCount
        const origWorkloads: { [id: string]: { [day: string]: number } } = {}
        const origTimetables: { [id: string]: any } = {}
        for (const id of allIds) {
          const entity = data.allEntities[id]
          if (entity) {
            origWorkloads[id] = { ...entity.workload.currentWorkload }
            origTimetables[id] = deepCloneTimetable(entity.timetable)
          }
        }

        const newSlot = {
          type: 'course' as const,
          slotNumber,
          slotSpan,
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

        // Apply
        course.scheduledCount++
        allScheduledSlots.push(newSlot)
        scheduledDays.add(day)

        for (const id of allIds) {
          const entity = data.allEntities[id]
          if (entity) {
            entity.workload.currentWorkload[day] = (entity.workload.currentWorkload[day] || 0) + slotSpan
            if (!entity.timetable[day]) entity.timetable[day] = []
            entity.timetable[day].push({
              type: 'course',
              slotNumber,
              slotSpan,
              courseId: course.courseId,
              courseCode: course.courseCode,
              hallIds: course.hallIds,
              facultyIds: course.facultyIds,
              hallGroupIds: course.hallGroupIds,
              facultyGroupIds: course.facultyGroupIds,
              studentIds: course.studentIds,
              studentGroupIds: course.studentGroupIds
            })
            entity.timetable[day].sort((a: any, b: any) => a.slotNumber - b.slotNumber)
          }
        }

        if (scheduleRecursively(depth + 1)) return true

        // Backtrack
        course.scheduledCount = origCount
        allScheduledSlots.pop()
        scheduledDays.delete(day)
        for (const id of allIds) {
          const entity = data.allEntities[id]
          if (entity) {
            entity.workload.currentWorkload = origWorkloads[id]
            entity.timetable = origTimetables[id]
          }
        }
      }
    }

    failedStates.add(stateKey)
    return false
  }

  const success = scheduleRecursively()

  const failureDetails = Array.from(courseFailureTracking.entries())
    .filter(([courseId]) => {
      const course = data.courses.find(c => c.courseId === courseId)
      return course && course.scheduledCount < (course.targetSessions ?? course.totalSessions)
    })
    .map(([courseId, tracking]) => {
      const course = data.courses.find(c => c.courseId === courseId)!
      return {
        courseId,
        courseCode: course.courseCode,
        courseName: course.courseCode,
        attemptCount: tracking.attemptCount,
        remainingSessions: (course.targetSessions ?? course.totalSessions) - course.scheduledCount,
        lastAvailableSlots: tracking.lastAvailableSlots,
        entities: {
          students: course.studentIds.map(id => ({ id, digitalId: 0 })),
          faculties: course.facultyIds.map(id => ({ id, name: id })),
          halls: course.hallIds.map(id => ({ id, name: id })),
          studentGroups: course.studentGroupIds.map(id => ({ id, groupName: id })),
          facultyGroups: course.facultyGroupIds.map(id => ({ id, groupName: id })),
          hallGroups: course.hallGroupIds.map(id => ({ id, groupName: id }))
        }
      }
    })

  return {
    success,
    message: success ? 'All courses scheduled successfully' : 'Could not schedule all courses',
    scheduledSlots: allScheduledSlots,
    failureDetails
  }
}
