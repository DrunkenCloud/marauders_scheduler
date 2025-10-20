import { prisma } from '@/lib/prisma'
import {
  CompiledCourseData,
  EntityWorkload,
  EntityData,
  CompiledSchedulingData,
  SlotFragment
} from '@/types'

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

      // Only count if within working hours
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

// Helper function to calculate current workload from timetable (keep in minutes)
function calculateCurrentWorkload(timetable: any): { [day: string]: number } {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const currentWorkload: { [day: string]: number } = {}

  for (const day of days) {
    const daySchedule: SlotFragment[] = timetable[day] || []
    let totalMinutes = 0

    for (const slot of daySchedule) {
      totalMinutes += slot.duration
    }

    currentWorkload[day] = totalMinutes // Keep in minutes
  }

  return currentWorkload
}

// Helper function to calculate total scheduled duration for an entity across all courses (keep in minutes)
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
    // Direct student enrollments
    for (const enrollment of course.studentEnrollments) {
      if (enrollment.student) studentIdSet.add(enrollment.student.id)
    }
    // From student groups
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
    // Direct compulsory faculties
    for (const f of course.compulsoryFaculties) {
      facultyIdSet.add(f.id)
    }
    // From faculty groups
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
    // Direct compulsory halls
    for (const h of course.compulsoryHalls) {
      hallIdSet.add(h.id)
    }
    // From hall groups - include both the group and expand to individual halls
    for (const chg of course.compulsoryHallGroups) {
      if (chg.hallGroup) {
        hallGroupIdSet.add(chg.hallGroup.id)
        // Also expand to individual halls for scheduling
        const memberships = chg.hallGroup?.hallMemberships ?? []
        for (const membership of memberships) {
          if (membership.hall) hallIdSet.add(membership.hall.id)
        }
      }
    }

    const res = {
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

    return res
  })

  // Fetch all entities that will be involved in scheduling
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

  // Fetch entity data for workload calculations
  const [students, faculties, halls, studentGroups, facultyGroups, hallGroups] = await Promise.all([
    prisma.student.findMany({
      where: { id: { in: Array.from(allStudentIds) } }
    }),
    prisma.faculty.findMany({
      where: { id: { in: Array.from(allFacultyIds) } }
    }),
    prisma.hall.findMany({
      where: { id: { in: Array.from(allHallIds) } }
    }),
    prisma.studentGroup.findMany({
      where: { id: { in: Array.from(allStudentGroupIds) } }
    }),
    prisma.facultyGroup.findMany({
      where: { id: { in: Array.from(allFacultyGroupIds) } }
    }),
    prisma.hallGroup.findMany({
      where: { id: { in: Array.from(allHallGroupIds) } }
    })
  ])

  // Create unified entity dictionary with all data
  const allEntities: { [entityId: string]: EntityData } = {}

  // Add students
  for (const student of students) {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      student.timetable, student.startHour, student.startMinute, student.endHour, student.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(student.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(student.id, compiled, 'student')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeMinutes > 0 ? dailyFreeMinutes[day] / totalFreeMinutes : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    allEntities[student.id] = {
      id: student.id,
      timetable: student.timetable,
      startHour: student.startHour,
      startMinute: student.startMinute,
      endHour: student.endHour,
      endMinute: student.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }

  // Add faculties
  for (const faculty of faculties) {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      faculty.timetable, faculty.startHour, faculty.startMinute, faculty.endHour, faculty.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(faculty.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(faculty.id, compiled, 'faculty')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeMinutes > 0 ? dailyFreeMinutes[day] / totalFreeMinutes : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    allEntities[faculty.id] = {
      id: faculty.id,
      timetable: faculty.timetable,
      startHour: faculty.startHour,
      startMinute: faculty.startMinute,
      endHour: faculty.endHour,
      endMinute: faculty.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }

  // Add halls
  for (const hall of halls) {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      hall.timetable, hall.startHour, hall.startMinute, hall.endHour, hall.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(hall.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(hall.id, compiled, 'hall')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeMinutes > 0 ? dailyFreeMinutes[day] / totalFreeMinutes : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    allEntities[hall.id] = {
      id: hall.id,
      timetable: hall.timetable,
      startHour: hall.startHour,
      startMinute: hall.startMinute,
      endHour: hall.endHour,
      endMinute: hall.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }

  // Add student groups
  for (const group of studentGroups) {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      group.timetable, group.startHour, group.startMinute, group.endHour, group.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(group.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(group.id, compiled, 'studentGroup')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeMinutes > 0 ? dailyFreeMinutes[day] / totalFreeMinutes : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    allEntities[group.id] = {
      id: group.id,
      timetable: group.timetable,
      startHour: group.startHour,
      startMinute: group.startMinute,
      endHour: group.endHour,
      endMinute: group.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }

  // Add faculty groups
  for (const group of facultyGroups) {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      group.timetable, group.startHour, group.startMinute, group.endHour, group.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(group.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(group.id, compiled, 'facultyGroup')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeMinutes > 0 ? dailyFreeMinutes[day] / totalFreeMinutes : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    allEntities[group.id] = {
      id: group.id,
      timetable: group.timetable,
      startHour: group.startHour,
      startMinute: group.startMinute,
      endHour: group.endHour,
      endMinute: group.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }

  // Add hall groups
  for (const group of hallGroups) {
    const { totalFreeMinutes, dailyFreeMinutes } = calculateFreeMinutes(
      group.timetable, group.startHour, group.startMinute, group.endHour, group.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(group.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(group.id, compiled, 'hallGroup')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeMinutes > 0 ? dailyFreeMinutes[day] / totalFreeMinutes : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    allEntities[group.id] = {
      id: group.id,
      timetable: group.timetable,
      startHour: group.startHour,
      startMinute: group.startMinute,
      endHour: group.endHour,
      endMinute: group.endMinute,
      workload: {
        totalFreeMinutes,
        dailyFreeMinutes,
        dailyThresholds,
        currentWorkload,
        totalScheduledDuration
      }
    }
  }

  const res = {
    sessionId,
    courses: compiled,
    allEntities
  }

  return res;
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

  // Check if slot is within working hours
  if (slotStartMinutes < workingStartMinutes || slotEndMinutes > workingEndMinutes) {
    return false
  }

  // Check for conflicts with existing slots
  for (const existingSlot of daySchedule) {
    const existingStartMinutes = existingSlot.startHour * 60 + existingSlot.startMinute
    const existingEndMinutes = existingStartMinutes + existingSlot.duration

    // Check for overlap
    if (!(slotEndMinutes <= existingStartMinutes || slotStartMinutes >= existingEndMinutes)) {
      return false // Overlap found
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

  return currentWorkload <= threshold;
}

// Helper function to find a time slot where all entities are available
function findAvailableSlotForAllEntities(
  course: CompiledCourseData,
  day: string,
  duration: number,
  data: CompiledSchedulingData,
  checkWorkload: boolean = true
): { startHour: number, startMinute: number } | null {
  // Get all entity IDs involved in this course
  const allEntityIds = [
    ...course.studentIds,
    ...course.facultyIds,
    ...course.hallIds,
    ...course.studentGroupIds,
    ...course.facultyGroupIds,
    ...course.hallGroupIds
  ]

  // Find the most restrictive working hours (latest start, earliest end)
  let latestStartMinutes = 0
  let earliestEndMinutes = 24 * 60 // 24 hours in minutes

  for (const entityId of allEntityIds) {
    const entity = data.allEntities[entityId]
    if (!entity) continue

    const entityStartMinutes = entity.startHour * 60 + entity.startMinute
    const entityEndMinutes = entity.endHour * 60 + entity.endMinute

    latestStartMinutes = Math.max(latestStartMinutes, entityStartMinutes)
    earliestEndMinutes = Math.min(earliestEndMinutes, entityEndMinutes)
  }

  // Try every 10-minute interval within the overlapping working hours
  for (let minutes = latestStartMinutes; minutes + duration <= earliestEndMinutes; minutes += 10) {
    const startHour = Math.floor(minutes / 60)
    const startMinute = minutes % 60

    // Check if all entities are available at this time
    if (areAllEntitiesAvailable(course, day, startHour, startMinute, duration, data, checkWorkload)) {
      return { startHour, startMinute }
    }
  }

  return null
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
  // Get all entity IDs involved in this course
  const allEntityIds = [
    ...course.studentIds,
    ...course.facultyIds,
    ...course.hallIds,
    ...course.studentGroupIds,
    ...course.facultyGroupIds,
    ...course.hallGroupIds
  ]

  // Check each entity
  for (const entityId of allEntityIds) {
    const entity = data.allEntities[entityId]
    if (!entity) continue

    // Check if entity is free at this time
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

    // Check if workload allows scheduling on this day (if requested)
    if (checkWorkload && !canScheduleOnDay(entity.workload, day)) {
      return false
    }
  }

  return true
}

// Helper function to check if all entities can schedule on a specific day (workload-wise)
function canAllEntitiesScheduleOnDay(
  entityIds: string[],
  day: string,
  data: CompiledSchedulingData
): boolean {
  for (const entityId of entityIds) {
    const entity = data.allEntities[entityId]
    if (!entity) continue

    if (!canScheduleOnDay(entity.workload, day)) {
      return false
    }
  }
  return true
}

// Helper function to get days a course has already been scheduled on
function getScheduledDaysForCourse(courseId: string, allScheduledSlots: Array<SlotFragment & { day: string }>): Set<string> {
  const scheduledDays = new Set<string>()
  for (const slot of allScheduledSlots) {
    if (slot.courseId === courseId) {
      scheduledDays.add(slot.day)
    }
  }
  return scheduledDays
}

// Simple seeded random number generator (Linear Congruential Generator)
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

// Helper function to shuffle an array with seeded randomness
function shuffleArray<T>(array: T[], rng: SeededRandom): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Helper function to get all possible scheduling options organized by course
function getCourseSchedulingOptionsMap(data: CompiledSchedulingData, allScheduledSlots: Array<SlotFragment & { day: string }>): {
  courseOptionsMap: Map<string, Array<{
    day: string,
    startHour: number,
    startMinute: number,
    duration: number,
    isNewDay: boolean,
    withinWorkload: boolean
  }>>,
  unscheduledCourses: CompiledCourseData[]
} {
  const courseOptionsMap = new Map<string, Array<{
    day: string,
    startHour: number,
    startMinute: number,
    duration: number,
    isNewDay: boolean,
    withinWorkload: boolean
  }>>()

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const unscheduledCourses = data.courses.filter(course => {
    const target = course.targetSessions ?? course.totalSessions
    return course.scheduledCount < target
  })

  for (const course of unscheduledCourses) {
    const sessionDuration = course.classDuration * course.sessionsPerLecture
    const courseOptions: Array<{
      day: string,
      startHour: number,
      startMinute: number,
      duration: number,
      isNewDay: boolean,
      withinWorkload: boolean
    }> = []

    // Check if course has any entities assigned
    const allEntityIds = [
      ...course.studentIds,
      ...course.facultyIds,
      ...course.hallIds,
      ...course.studentGroupIds,
      ...course.facultyGroupIds,
      ...course.hallGroupIds
    ]

    if (allEntityIds.length === 0) {
      continue
    }

    // Get days this course has already been scheduled on
    const scheduledDays = getScheduledDaysForCourse(course.courseId, allScheduledSlots)

    // Find available slots on each day for this course
    for (const day of days) {
      const availableSlot = findAvailableSlotForAllEntities(
        course,
        day,
        sessionDuration,
        data,
        false // Don't check workload constraints in this function
      )

      if (availableSlot) {
        // Check if this slot can be scheduled within workload constraints
        const canScheduleWithinWorkload = canAllEntitiesScheduleOnDay(
          allEntityIds,
          day,
          data
        )

        // Check if this is a new day for this course
        const isNewDay = !scheduledDays.has(day)

        courseOptions.push({
          day,
          startHour: availableSlot.startHour,
          startMinute: availableSlot.startMinute,
          duration: sessionDuration,
          isNewDay,
          withinWorkload: canScheduleWithinWorkload
        })
      }
    }

    // Sort options for this course (day diversity first, then workload, then time)
    courseOptions.sort((a, b) => {
      // Primary: Day diversity (new days first)
      if (a.isNewDay !== b.isNewDay) {
        return a.isNewDay ? -1 : 1
      }

      // Secondary: Workload compliance (within workload first)
      if (a.withinWorkload !== b.withinWorkload) {
        return a.withinWorkload ? -1 : 1
      }

      // Tertiary: Start time (earlier first)
      const aTime = a.startHour * 60 + a.startMinute
      const bTime = b.startHour * 60 + b.startMinute
      return aTime - bTime
    })

    courseOptionsMap.set(course.courseId, courseOptions)
  }

  return { courseOptionsMap, unscheduledCourses }
}



// Main recursive scheduling function
export function scheduleCourses(data: CompiledSchedulingData, seed?: number): { success: boolean, message: string, scheduledSlots?: Array<SlotFragment & { day: string }> } {
  const allScheduledSlots: Array<SlotFragment & { day: string }> = []

  // Create seeded random number generator
  const actualSeed = seed ?? Math.floor(Math.random() * 1000000)
  const rng = new SeededRandom(actualSeed)

  console.log(`🎲 Using random seed: ${actualSeed} ${seed ? '(provided)' : '(generated)'}`)

  function scheduleRecursively(): boolean {
    // Base case: check if all courses have reached their target or are fully scheduled
    const unscheduledCourses = data.courses.filter(course => {
      const target = course.targetSessions ?? course.totalSessions
      return course.scheduledCount < target
    })

    if (unscheduledCourses.length === 0) {
      console.log('🎉 All courses successfully scheduled!')
      console.log('📋 Final scheduled courses:')
      allScheduledSlots.forEach((slot, index) => {
        console.log(`${index + 1}. ${slot.courseCode} - ${slot.day} ${slot.startHour}:${slot.startMinute.toString().padStart(2, '0')}-${Math.floor((slot.startHour * 60 + slot.startMinute + slot.duration) / 60)}:${((slot.startHour * 60 + slot.startMinute + slot.duration) % 60).toString().padStart(2, '0')} (${slot.duration}min)`)
      })
      return true
    }

    // Get course options map and unscheduled courses
    const { courseOptionsMap, unscheduledCourses: currentUnscheduledCourses } = getCourseSchedulingOptionsMap(data, allScheduledSlots)

    // Early exit: check if any course has insufficient slots for remaining sessions
    for (const course of currentUnscheduledCourses) {
      const options = courseOptionsMap.get(course.courseId) || []
      const target = course.targetSessions ?? course.totalSessions
      const remainingSessions = target - course.scheduledCount

      if (options.length < remainingSessions) {
        return false
      }
    }

    // Shuffle the unscheduled courses for randomness
    const shuffledCourses = shuffleArray(currentUnscheduledCourses, rng)

    // Log course options summary
    let totalWithinWorkload = 0
    let totalNewDays = 0
    let totalRequiredSessions = 0
    let totalAvailableSlots = 0

    for (const course of currentUnscheduledCourses) {
      const options = courseOptionsMap.get(course.courseId) || []
      const target = course.targetSessions ?? course.totalSessions
      const remainingSessions = target - course.scheduledCount

      const withinWorkloadCount = options.filter(opt => opt.withinWorkload).length
      const newDayCount = options.filter(opt => opt.isNewDay).length

      totalWithinWorkload += withinWorkloadCount
      totalNewDays += newDayCount
      totalRequiredSessions += remainingSessions
      totalAvailableSlots += options.length
    }

    // Try each shuffled course
    for (const course of shuffledCourses) {
      const options = courseOptionsMap.get(course.courseId) || []

      // Try each sorted option for this course
      for (const option of options) {
        const { day, startHour, startMinute, duration, isNewDay, withinWorkload } = option

        const dayIndicator = isNewDay ? '🆕' : '🔄'
        const workloadIndicator = withinWorkload ? '✅' : '⚠️'

        // Create the slot
        const newSlot = {
          type: 'course' as const,
          startHour,
          startMinute,
          duration,
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

        // Get all entity IDs for this course
        const allEntityIds = [
          ...course.studentIds,
          ...course.facultyIds,
          ...course.hallIds,
          ...course.studentGroupIds,
          ...course.facultyGroupIds,
          ...course.hallGroupIds
        ]

        // Save current state for backtracking
        const originalScheduledCount = course.scheduledCount
        const originalWorkloads: { [entityId: string]: { [day: string]: number } } = {}
        const originalTimetables: { [entityId: string]: any } = {}

        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            originalWorkloads[entityId] = { ...entity.workload.currentWorkload }
            // Deep copy the timetable for this day
            originalTimetables[entityId] = {
              ...entity.timetable,
              [day]: [...(entity.timetable[day] || [])]
            }
          }
        }

        // Apply the scheduling
        course.scheduledCount += 1
        allScheduledSlots.push(newSlot)

        // Update workloads AND timetables
        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            // Update workload
            entity.workload.currentWorkload[day] += duration

            // Add slot to entity's timetable
            if (!entity.timetable[day]) {
              entity.timetable[day] = []
            }

            // Create timetable slot format
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

            // Sort slots by start time
            entity.timetable[day].sort((a: any, b: any) => {
              const aTime = a.startHour * 60 + a.startMinute
              const bTime = b.startHour * 60 + b.startMinute
              return aTime - bTime
            })
          }
        }

        const target = course.targetSessions ?? course.totalSessions

        // Recursively try to schedule remaining courses
        if (scheduleRecursively()) {
          return true // Success path
        }

        // Backtrack: undo the changes
        course.scheduledCount = originalScheduledCount
        allScheduledSlots.pop()

        // Restore workloads AND timetables
        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            // Restore workload
            if (originalWorkloads[entityId]) {
              entity.workload.currentWorkload = originalWorkloads[entityId]
            }
            // Restore timetable
            if (originalTimetables[entityId]) {
              entity.timetable = originalTimetables[entityId]
            }
          }
        }

      }
    }

    return false // No valid scheduling found
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

// Helper function to update entity timetables with scheduled slots
export async function updateEntityTimetables(
  scheduledSlots: Array<SlotFragment & { day: string }>,
  sessionId: string
): Promise<void> {
  // Group slots by entity and entity type
  const entityUpdates: { [entityType: string]: { [entityId: string]: Array<SlotFragment & { day: string }> } } = {
    student: {},
    faculty: {},
    hall: {},
    studentGroup: {},
    facultyGroup: {},
    hallGroup: {}
  }

  // Organize slots by entity
  for (const slot of scheduledSlots) {
    // Add to students
    for (const studentId of slot.studentIds || []) {
      if (!entityUpdates.student[studentId]) entityUpdates.student[studentId] = []
      entityUpdates.student[studentId].push(slot)
    }

    // Add to faculties
    for (const facultyId of slot.facultyIds || []) {
      if (!entityUpdates.faculty[facultyId]) entityUpdates.faculty[facultyId] = []
      entityUpdates.faculty[facultyId].push(slot)
    }

    // Add to halls
    for (const hallId of slot.hallIds || []) {
      if (!entityUpdates.hall[hallId]) entityUpdates.hall[hallId] = []
      entityUpdates.hall[hallId].push(slot)
    }

    // Add to student groups
    for (const groupId of slot.studentGroupIds || []) {
      if (!entityUpdates.studentGroup[groupId]) entityUpdates.studentGroup[groupId] = []
      entityUpdates.studentGroup[groupId].push(slot)
    }

    // Add to faculty groups
    for (const groupId of slot.facultyGroupIds || []) {
      if (!entityUpdates.facultyGroup[groupId]) entityUpdates.facultyGroup[groupId] = []
      entityUpdates.facultyGroup[groupId].push(slot)
    }

    // Add to hall groups
    for (const groupId of slot.hallGroupIds || []) {
      if (!entityUpdates.hallGroup[groupId]) entityUpdates.hallGroup[groupId] = []
      entityUpdates.hallGroup[groupId].push(slot)
    }
  }

  // Update each entity's timetable
  for (const [entityType, entities] of Object.entries(entityUpdates)) {
    for (const [entityId, slots] of Object.entries(entities)) {
      if (slots.length === 0) continue

      // Get current timetable
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

      // Add new slots to timetable
      for (const slot of slots) {
        const { day } = slot
        if (!updatedTimetable[day]) updatedTimetable[day] = []

        // Convert SlotFragment to timetable slot format
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

      // Sort slots by start time for each day
      for (const day of Object.keys(updatedTimetable)) {
        updatedTimetable[day].sort((a: any, b: any) => {
          const aTime = a.startHour * 60 + a.startMinute
          const bTime = b.startHour * 60 + b.startMinute
          return aTime - bTime
        })
      }

      // Update the entity's timetable in the database
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

  // Update course scheduled counts
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