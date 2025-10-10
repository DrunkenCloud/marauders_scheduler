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
}

export interface CompiledSchedulingData {
  sessionId: number
  courses: CompiledCourseData[]
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
    // Direct student enrollments
    for (const enrollment of course.studentEnrollments) {
      if (enrollment.student) studentIdSet.add(enrollment.student.id)
    }
    // From student groups
    for (const groupEnrollment of course.studentGroupEnrollments) {
      const memberships = groupEnrollment.studentGroup?.studentMemberships ?? []
      for (const membership of memberships) {
        if (membership.student) studentIdSet.add(membership.student.id)
      }
    }

    const facultyIdSet = new Set<number>()
    // Direct compulsory faculties
    for (const f of course.compulsoryFaculties) {
      facultyIdSet.add(f.id)
    }
    // From faculty groups
    for (const cfg of course.compulsoryFacultyGroups) {
      const memberships = cfg.facultyGroup?.facultyMemberships ?? []
      for (const membership of memberships) {
        if (membership.faculty) facultyIdSet.add(membership.faculty.id)
      }
    }

    const hallIdSet = new Set<number>()
    // Direct compulsory halls
    for (const h of course.compulsoryHalls) {
      hallIdSet.add(h.id)
    }
    // From hall groups (for now, expand to halls and ignore the group entity)
    for (const chg of course.compulsoryHallGroups) {
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
        hallIds: Array.from(hallIdSet)
      }

    console.log(JSON.stringify(res, null, 2));

    return res
  })

  return { sessionId, courses: compiled }
}

// Placeholder for the recursive scheduler to be implemented next
export function scheduleCourses(_: CompiledSchedulingData) {
  // TODO: Implement recursive scheduling based on compiled data
  return { message: 'Scheduling algorithm not yet implemented' }
}


