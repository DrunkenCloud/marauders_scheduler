import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sourceSessionId, targetSessionId } = body

    if (!sourceSessionId || !targetSessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Both sourceSessionId and targetSessionId are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    if (sourceSessionId === targetSessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Source and target sessions cannot be the same',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Verify both sessions exist
    const [sourceSession, targetSession] = await Promise.all([
      prisma.session.findUnique({ where: { id: sourceSessionId } }),
      prisma.session.findUnique({ where: { id: targetSessionId } })
    ])

    if (!sourceSession || !targetSession) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SESSION_NOT_FOUND',
          message: 'One or both sessions not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    // Use a transaction to copy all data
    await prisma.$transaction(async (tx) => {
      // sourceSessionId and targetSessionId are already strings

      // Delete existing data in target session
      await Promise.all([
        tx.courseStudentEnrollment.deleteMany({
          where: {
            course: { sessionId: targetSessionId }
          }
        }),
        tx.courseStudentGroupEnrollment.deleteMany({
          where: {
            course: { sessionId: targetSessionId }
          }
        }),
        tx.compulsoryFacultyGroup.deleteMany({
          where: {
            course: { sessionId: targetSessionId }
          }
        }),
        tx.compulsoryHallGroup.deleteMany({
          where: {
            course: { sessionId: targetSessionId }
          }
        }),
        tx.studentGroupMembership.deleteMany({
          where: {
            studentGroup: { sessionId: targetSessionId }
          }
        }),
        tx.facultyGroupMembership.deleteMany({
          where: {
            facultyGroup: { sessionId: targetSessionId }
          }
        }),
        tx.hallGroupMembership.deleteMany({
          where: {
            hallGroup: { sessionId: targetSessionId }
          }
        })
      ])

      await Promise.all([
        tx.student.deleteMany({ where: { sessionId: targetSessionId } }),
        tx.faculty.deleteMany({ where: { sessionId: targetSessionId } }),
        tx.hall.deleteMany({ where: { sessionId: targetSessionId } }),
        tx.course.deleteMany({ where: { sessionId: targetSessionId } }),
        tx.studentGroup.deleteMany({ where: { sessionId: targetSessionId } }),
        tx.facultyGroup.deleteMany({ where: { sessionId: targetSessionId } }),
        tx.hallGroup.deleteMany({ where: { sessionId: targetSessionId } })
      ])

      // Copy students
      const sourceStudents = await tx.student.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          studentGroupMemberships: true,
          courseEnrollments: true
        }
      })

      const studentIdMap = new Map<string, string>()
      for (const student of sourceStudents) {
        const newStudent = await tx.student.create({
          data: {
            digitalId: student.digitalId,
            timetable: student.timetable as any,
            sessionId: targetSessionId
          }
        })
        studentIdMap.set(student.id, newStudent.id)
      }

      // Copy faculty
      const sourceFaculty = await tx.faculty.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          facultyGroupMemberships: true
        }
      })

      const facultyIdMap = new Map<string, string>()
      for (const faculty of sourceFaculty) {
        const newFaculty = await tx.faculty.create({
          data: {
            name: faculty.name,
            shortForm: faculty.shortForm,
            timetable: faculty.timetable as any,
            sessionId: targetSessionId
          }
        })
        facultyIdMap.set(faculty.id, newFaculty.id)
      }

      // Copy halls
      const sourceHalls = await tx.hall.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          hallGroupMemberships: true
        }
      })

      const hallIdMap = new Map<string, string>()
      for (const hall of sourceHalls) {
        const newHall = await tx.hall.create({
          data: {
            name: hall.name,
            Floor: hall.Floor,
            Building: hall.Building,
            shortForm: hall.shortForm,
            timetable: hall.timetable as any,
            sessionId: targetSessionId
          }
        })
        hallIdMap.set(hall.id, newHall.id)
      }

      // Copy courses
      const sourceCourses = await tx.course.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          compulsoryFaculties: true,
          compulsoryHalls: true
        }
      })

      const courseIdMap = new Map<string, string>()
      for (const course of sourceCourses) {
        const newCourse = await tx.course.create({
          data: {
            name: course.name,
            code: course.code,
            timetable: course.timetable as any,
            classDuration: course.classDuration,
            sessionsPerLecture: course.sessionsPerLecture,
            totalSessions: course.totalSessions,
            sessionId: targetSessionId
          }
        })
        courseIdMap.set(course.id, newCourse.id)

        // Connect compulsory faculty
        for (const faculty of course.compulsoryFaculties) {
          const newFacultyId = facultyIdMap.get(faculty.id)
          if (newFacultyId) {
            await tx.course.update({
              where: { id: newCourse.id },
              data: {
                compulsoryFaculties: {
                  connect: { id: newFacultyId }
                }
              }
            })
          }
        }

        // Connect compulsory halls
        for (const hall of course.compulsoryHalls) {
          const newHallId = hallIdMap.get(hall.id)
          if (newHallId) {
            await tx.course.update({
              where: { id: newCourse.id },
              data: {
                compulsoryHalls: {
                  connect: { id: newHallId }
                }
              }
            })
          }
        }
      }

      // Copy student groups
      const sourceStudentGroups = await tx.studentGroup.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          studentMemberships: true
        }
      })

      const studentGroupIdMap = new Map<string, string>()
      for (const group of sourceStudentGroups) {
        const newGroup = await tx.studentGroup.create({
          data: {
            groupName: group.groupName,
            timetable: group.timetable as any,
            sessionId: targetSessionId
          }
        })
        studentGroupIdMap.set(group.id, newGroup.id)

        // Copy memberships
        for (const membership of group.studentMemberships) {
          const newStudentId = studentIdMap.get(membership.studentId)
          if (newStudentId) {
            await tx.studentGroupMembership.create({
              data: {
                studentId: newStudentId,
                studentGroupId: newGroup.id
              }
            })
          }
        }
      }

      // Copy faculty groups
      const sourceFacultyGroups = await tx.facultyGroup.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          facultyMemberships: true
        }
      })

      const facultyGroupIdMap = new Map<string, string>()
      for (const group of sourceFacultyGroups) {
        const newGroup = await tx.facultyGroup.create({
          data: {
            groupName: group.groupName,
            timetable: group.timetable as any,
            sessionId: targetSessionId
          }
        })
        facultyGroupIdMap.set(group.id, newGroup.id)

        // Copy memberships
        for (const membership of group.facultyMemberships) {
          const newFacultyId = facultyIdMap.get(membership.facultyId)
          if (newFacultyId) {
            await tx.facultyGroupMembership.create({
              data: {
                facultyId: newFacultyId,
                facultyGroupId: newGroup.id
              }
            })
          }
        }
      }

      // Copy hall groups
      const sourceHallGroups = await tx.hallGroup.findMany({
        where: { sessionId: sourceSessionId },
        include: {
          hallMemberships: true
        }
      })

      for (const group of sourceHallGroups) {
        const newGroup = await tx.hallGroup.create({
          data: {
            groupName: group.groupName,
            timetable: group.timetable as any,
            sessionId: targetSessionId
          }
        })

        // Copy memberships
        for (const membership of group.hallMemberships) {
          const newHallId = hallIdMap.get(membership.hallId)
          if (newHallId) {
            await tx.hallGroupMembership.create({
              data: {
                hallId: newHallId,
                hallGroupId: newGroup.id
              }
            })
          }
        }
      }

      // Copy course enrollments
      for (const student of sourceStudents) {
        const newStudentId = studentIdMap.get(student.id)
        if (newStudentId) {
          for (const enrollment of student.courseEnrollments) {
            const newCourseId = courseIdMap.get(enrollment.courseId)
            if (newCourseId) {
              await tx.courseStudentEnrollment.create({
                data: {
                  studentId: newStudentId,
                  courseId: newCourseId
                }
              })
            }
          }
        }
      }
    })

    const response: ApiResponse = {
      success: true,
      data: {
        message: `Successfully copied all data from session "${sourceSession.name}" to session "${targetSession.name}"`
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error copying session data:', error)

    let errorMessage = 'Failed to copy session data'
    if (error.code === 'P2002') {
      errorMessage = 'Duplicate data conflict during copy operation'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'COPY_SESSION_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}