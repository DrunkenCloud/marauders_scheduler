import { prisma } from '@/lib/prisma'

export interface CompiledCourseData {
  courseId: number
  courseCode: string
  classDuration: number
  sessionsPerLecture: number
  totalSessions: number
  scheduledCount: number
  studentIds: number[]
  facultyIds: number[]
  hallIds: number[]
  studentGroupIds: number[]
  facultyGroupIds: number[]
  hallGroupIds: number[]
}

export interface EntityWorkload {
  totalFreeHours: number
  dailyFreeHours: { [day: string]: number }
  dailyThresholds: { [day: string]: number }
  currentWorkload: { [day: string]: number }
  totalScheduledDuration: number
}

export interface CompiledSchedulingData {
  sessionId: number
  courses: CompiledCourseData[]
  studentWorkloads: { [studentId: number]: EntityWorkload }
  facultyWorkloads: { [facultyId: number]: EntityWorkload }
  hallWorkloads: { [hallId: number]: EntityWorkload }
  studentGroupWorkloads: { [groupId: number]: EntityWorkload }
  facultyGroupWorkloads: { [groupId: number]: EntityWorkload }
}

interface SlotFragment {
  duration: number
  type: 'course' | 'blocker'
  startHour: number
  startMinute: number
  courseId?: number
  courseCode?: string
  blockerReason?: string
  hallIds?: number[]
  facultyIds?: number[]
  hallGroupIds?: number[]
  facultyGroupIds?: number[]
  studentIds?: number[]
  studentGroupIds?: number[]
}

// Helper function to calculate free hours from timetable
function calculateFreeHours(timetable: any, startHour: number, startMinute: number, endHour: number, endMinute: number): { totalFreeHours: number, dailyFreeHours: { [day: string]: number } } {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const dailyFreeHours: { [day: string]: number } = {}
  let totalFreeHours = 0

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
    const freeHours = freeMinutes / 60
    dailyFreeHours[day] = Math.max(0, freeHours)
    totalFreeHours += dailyFreeHours[day]
  }

  return { totalFreeHours, dailyFreeHours }
}

// Helper function to parse time string to minutes
function parseTimeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to calculate current workload from timetable
function calculateCurrentWorkload(timetable: any): { [day: string]: number } {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  const currentWorkload: { [day: string]: number } = {}

  for (const day of days) {
    const daySchedule = timetable[day] || []
    let totalMinutes = 0

    for (const slot of daySchedule) {
      if (slot.length >= 2) {
        const [startTime, endTime] = slot
        const startMinutes = parseTimeToMinutes(startTime)
        const endMinutes = parseTimeToMinutes(endTime)
        totalMinutes += (endMinutes - startMinutes)
      }
    }

    currentWorkload[day] = totalMinutes / 60 // Convert to hours
  }

  return currentWorkload
}

// Helper function to calculate total scheduled duration for an entity across all courses
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
      const sessionDurationHours = (course.classDuration * course.sessionsPerLecture) / 60
      totalDuration += remainingSessions * sessionDurationHours
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

  // Calculate workloads for each entity type
  const studentWorkloads: { [studentId: number]: EntityWorkload } = {}
  for (const student of students) {
    const { totalFreeHours, dailyFreeHours } = calculateFreeHours(
      student.timetable, student.startHour, student.startMinute, student.endHour, student.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(student.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(student.id, compiled, 'student')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeHours > 0 ? dailyFreeHours[day] / totalFreeHours : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    studentWorkloads[student.id] = {
      totalFreeHours,
      dailyFreeHours,
      dailyThresholds,
      currentWorkload,
      totalScheduledDuration
    }
  }

  const facultyWorkloads: { [facultyId: number]: EntityWorkload } = {}
  for (const faculty of faculties) {
    const { totalFreeHours, dailyFreeHours } = calculateFreeHours(
      faculty.timetable, faculty.startHour, faculty.startMinute, faculty.endHour, faculty.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(faculty.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(faculty.id, compiled, 'faculty')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeHours > 0 ? dailyFreeHours[day] / totalFreeHours : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    facultyWorkloads[faculty.id] = {
      totalFreeHours,
      dailyFreeHours,
      dailyThresholds,
      currentWorkload,
      totalScheduledDuration
    }
  }

  const hallWorkloads: { [hallId: number]: EntityWorkload } = {}
  for (const hall of halls) {
    const { totalFreeHours, dailyFreeHours } = calculateFreeHours(
      hall.timetable, hall.startHour, hall.startMinute, hall.endHour, hall.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(hall.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(hall.id, compiled, 'hall')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeHours > 0 ? dailyFreeHours[day] / totalFreeHours : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    hallWorkloads[hall.id] = {
      totalFreeHours,
      dailyFreeHours,
      dailyThresholds,
      currentWorkload,
      totalScheduledDuration
    }
  }

  const studentGroupWorkloads: { [groupId: number]: EntityWorkload } = {}
  for (const group of studentGroups) {
    const { totalFreeHours, dailyFreeHours } = calculateFreeHours(
      group.timetable, group.startHour, group.startMinute, group.endHour, group.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(group.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(group.id, compiled, 'studentGroup')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeHours > 0 ? dailyFreeHours[day] / totalFreeHours : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    studentGroupWorkloads[group.id] = {
      totalFreeHours,
      dailyFreeHours,
      dailyThresholds,
      currentWorkload,
      totalScheduledDuration
    }
  }

  const facultyGroupWorkloads: { [groupId: number]: EntityWorkload } = {}
  for (const group of facultyGroups) {
    const { totalFreeHours, dailyFreeHours } = calculateFreeHours(
      group.timetable, group.startHour, group.startMinute, group.endHour, group.endMinute
    )
    const currentWorkload = calculateCurrentWorkload(group.timetable)
    const totalScheduledDuration = calculateTotalScheduledDuration(group.id, compiled, 'facultyGroup')

    const dailyThresholds: { [day: string]: number } = {}
    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
      const dayPercentage = totalFreeHours > 0 ? dailyFreeHours[day] / totalFreeHours : 0.2
      dailyThresholds[day] = totalScheduledDuration * dayPercentage
    }

    facultyGroupWorkloads[group.id] = {
      totalFreeHours,
      dailyFreeHours,
      dailyThresholds,
      currentWorkload,
      totalScheduledDuration
    }
  }

  const res = {
    sessionId,
    courses: compiled,
    studentWorkloads,
    facultyWorkloads,
    hallWorkloads,
    studentGroupWorkloads,
    facultyGroupWorkloads
  }

  console.log(JSON.stringify(res, null, 2));

  return res;
}

// Placeholder for the recursive scheduler to be implemented next
export function scheduleCourses(_: CompiledSchedulingData) {
  // TODO: Implement recursive scheduling based on compiled data
  return { message: 'Scheduling algorithm not yet implemented' }
}


