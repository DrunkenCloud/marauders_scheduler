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
function calculateTotalScheduledDuration(entityId: number, courses: CompiledCourseData[], entityType: 'student' | 'faculty' | 'hall' | 'studentGroup' | 'facultyGroup'): number {
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
    }

    if (isInvolved) {
      const remainingSessions = course.totalSessions - course.scheduledCount
      const sessionDurationMinutes = course.classDuration * course.sessionsPerLecture
      totalDuration += remainingSessions * sessionDurationMinutes
    }
  }

  return totalDuration
}

export async function compileSchedulingData(sessionId: number, courseIds: number[]): Promise<CompiledSchedulingData> {
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

  const compiled: CompiledCourseData[] = courses.map((course) => {
    const studentIdSet = new Set<number>()
    const studentGroupIdSet = new Set<number>()
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

    const facultyIdSet = new Set<number>()
    const facultyGroupIdSet = new Set<number>()
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

    const hallIdSet = new Set<number>()
    const hallGroupIdSet = new Set<number>()
    // Direct compulsory halls
    for (const h of course.compulsoryHalls) {
      hallIdSet.add(h.id)
    }
    // From hall groups (for now, expand to halls and ignore the group entity)
    for (const chg of course.compulsoryHallGroups) {
      if (chg.hallGroup) {
        hallGroupIdSet.add(chg.hallGroup.id)
      }
      const memberships = chg.hallGroup?.hallMemberships ?? []
      for (const membership of memberships) {
        if (membership.hall) hallIdSet.add(membership.hall.id)
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
  const allStudentIds = new Set<number>()
  const allFacultyIds = new Set<number>()
  const allHallIds = new Set<number>()
  const allStudentGroupIds = new Set<number>()
  const allFacultyGroupIds = new Set<number>()

  for (const course of compiled) {
    course.studentIds.forEach(id => allStudentIds.add(id))
    course.facultyIds.forEach(id => allFacultyIds.add(id))
    course.hallIds.forEach(id => allHallIds.add(id))
    course.studentGroupIds.forEach(id => allStudentGroupIds.add(id))
    course.facultyGroupIds.forEach(id => allFacultyGroupIds.add(id))
  }

  // Fetch entity data for workload calculations
  const [students, faculties, halls, studentGroups, facultyGroups] = await Promise.all([
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
    })
  ])

  // Create unified entity dictionary with all data
  const allEntities: { [entityId: number]: EntityData } = {}

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

  const res = {
    sessionId,
    courses: compiled,
    allEntities
  }

  console.log(JSON.stringify(res, null, 2));

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

  return currentWorkload < threshold
}

// Helper function to find a time slot where all entities are available
function findAvailableSlotForAllEntities(
  course: CompiledCourseData,
  day: string,
  duration: number,
  data: CompiledSchedulingData
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
    if (areAllEntitiesAvailable(course, day, startHour, startMinute, duration, data)) {
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
  data: CompiledSchedulingData
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

    // Check if workload allows scheduling on this day
    if (!canScheduleOnDay(entity.workload, day)) {
      return false
    }
  }

  return true
}

// Main recursive scheduling function
export function scheduleCourses(data: CompiledSchedulingData): { success: boolean, message: string, scheduledSlots?: SlotFragment[] } {
  const scheduledSlots: SlotFragment[] = []
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // Base case: check if all courses are fully scheduled
  const unscheduledCourses = data.courses.filter(course => course.scheduledCount < course.totalSessions)

  if (unscheduledCourses.length === 0) {
    return {
      success: true,
      message: 'All courses successfully scheduled',
      scheduledSlots
    }
  }

  // Try to schedule each unscheduled course
  for (const course of unscheduledCourses) {
    const sessionDuration = course.classDuration * course.sessionsPerLecture // Total duration in minutes

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
      console.log(`Course ${course.courseCode} has no entities assigned`)
      continue
    }

    let scheduled = false

    // Try each day of the week
    for (const day of days) {
      if (scheduled) break

      // Find available slot where all entities are free
      const availableSlot = findAvailableSlotForAllEntities(
        course,
        day,
        sessionDuration,
        data
      )

      if (availableSlot) {
        // Create the slot fragment
        const newSlot: SlotFragment = {
          type: 'course',
          startHour: availableSlot.startHour,
          startMinute: availableSlot.startMinute,
          duration: sessionDuration,
          courseId: course.courseId,
          courseCode: course.courseCode,
          studentIds: course.studentIds,
          facultyIds: course.facultyIds,
          hallIds: course.hallIds,
          studentGroupIds: course.studentGroupIds,
          facultyGroupIds: course.facultyGroupIds,
          hallGroupIds: course.hallGroupIds
        }

        scheduledSlots.push(newSlot)

        // Update scheduled count
        course.scheduledCount += 1

        // Update workloads for all entities (keep in minutes)
        for (const entityId of allEntityIds) {
          const entity = data.allEntities[entityId]
          if (entity) {
            entity.workload.currentWorkload[day] += sessionDuration
          }
        }

        scheduled = true
        console.log(`Scheduled ${course.courseCode} on ${day} at ${availableSlot.startHour}:${availableSlot.startMinute.toString().padStart(2, '0')}`)
      }
    }

    if (!scheduled) {
      return {
        success: false,
        message: `Could not schedule course ${course.courseCode} - no available slots found`,
        scheduledSlots
      }
    }
  }

  return {
    success: true,
    message: `Successfully scheduled ${scheduledSlots.length} sessions`,
    scheduledSlots
  }
}


