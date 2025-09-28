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
      prisma.session.findUnique({ where: { id: parseInt(sourceSessionId) } }),
      prisma.session.findUnique({ where: { id: parseInt(targetSessionId) } })
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
      const sourceSessionIdInt = parseInt(sourceSessionId)
      const targetSessionIdInt = parseInt(targetSessionId)

      // Delete existing data in target session
      await Promise.all([
        tx.courseStudentEnrollment.deleteMany({
          where: {
            course: { sessionId: targetSessionIdInt }
          }
        }),
        tx.courseStudentGroupEnrollment.deleteMany({
          where: {
            course: { sessionId: targetSessionIdInt }
          }
        }),
        tx.compulsoryFacultyGroup.deleteMany({
          where: {
            course: { sessionId: targetSessionIdInt }
          }
        }),
        tx.compulsoryHallGroup.deleteMany({
          where: {
            course: { sessionId: targetSessionIdInt }
          }
        }),
        tx.studentGroupMembership.deleteMany({
          where: {
            studentGroup: { sessionId: targetSessionIdInt }
          }
        }),
        tx.facultyGroupMembership.deleteMany({
          where: {
            facultyGroup: { sessionId: targetSessionIdInt }
          }
        }),
        tx.hallGroupMembership.deleteMany({
          where: {
            hallGroup: { sessionId: targetSessionIdInt }
          }
        })
      ])

      await Promise.all([
        tx.student.deleteMany({ where: { sessionId: targetSessionIdInt } }),
        tx.faculty.deleteMany({ where: { sessionId: targetSessionIdInt } }),
        tx.hall.deleteMany({ where: { sessionId: targetSessionIdInt } }),
        tx.course.deleteMany({ where: { sessionId: targetSessionIdInt } }),
        tx.studentGroup.deleteMany({ where: { sessionId: targetSessionIdInt } }),
        tx.facultyGroup.deleteMany({ where: { sessionId: targetSessionIdInt } }),
        tx.hallGroup.deleteMany({ where: { sessionId: targetSessionIdInt } })
      ])

      // Copy students
      const sourceStudents = await tx.student.findMany({
        where: { sessionId: sourceSessionIdInt },
        include: {
          studentGroupMemberships: true,
          courseEnrollments: true
        }
      })

      const studentIdMap = new Map<number, number>()
      for (const student of sourceStudents) {
        const newStudent = await tx.student.create({
          data: {
            digitalId: student.digitalId,
            timetable: student.timetable,
            sessionId: targetSessionIdInt
          }
        })
        studentIdMap.set(student.id, newStudent.id)
      }

      // Copy faculty
      const sourceFaculty = await tx.faculty.findMany({
        where: { sessionId: sourceSessionIdInt },
        include: {
          facultyGroupMemberships: true
        }
      })

      const facultyIdMap = new Map<number, number>()
      for (const faculty of sourceFaculty) {
        const newFaculty = await tx.faculty.create({
          data: {
            name: faculty.name,
            shortForm: faculty.shortForm,
            timetable: faculty.timetable,
            sessionId: targetSessionIdInt
          }
        })
        facultyIdMap.set(faculty.id, newFaculty.id)
      }

      // Copy halls
      const sourceHalls = await tx.hall.findMany({
        where: { sessionId: sourceSessionIdInt },
        include: {
          hallGroupMemberships: true
        }
      })

      const hallIdMap = new Map<number, number>()
      for (const hall of sourceHalls) {
        const newHall = await tx.hall.create({
          data: {
            name: hall.name,
            Floor: hall.Floor,
            Building: hall.Building,
            shortForm: hall.shortForm,
            timetable: hall.timetable,
            sessionId: targetSessionIdInt
          }
        })
        hallIdMap.set(hall.id, newHall.id)
      }

      // Copy courses
      const sourceCourses = await tx.course.findMany({
        where: { sessionId: sourceSessionIdInt },
        include: {
          compulsoryFaculties: true,
          compulsoryHalls: true
        }
      })

      const courseIdMap = new Map<number, number>()
      for (const course of sourceCourses) {
        const newCourse = await tx.course.create({
          data: {
            name: course.name,
            code: course.code,
            timetable: course.timetable,
            classDuration: course.classDuration,
            sessionsPerLecture: course.sessionsPerLecture,
            totalSessions: course.totalSessions,
            sessionId: targetSessionIdInt
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
        where: { sessionId: sourceSessionIdInt },
        include: {
          studentMemberships: true
        }
      })

      const studentGroupIdMap = new Map<number, number>()
      for (const group of sourceStudentGroups) {
        const newGroup = await tx.studentGroup.create({
          data: {
            groupName: group.groupName,
            timetable: group.timetable,
            sessionId: targetSessionIdInt
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
        where: { sessionId: sourceSessionIdInt },
        include: {
          facultyMemberships: true
        }
      })

      const facultyGroupIdMap = new Map<number, number>()
      for (const group of sourceFacultyGroups) {
        const newGroup = await tx.facultyGroup.create({
          data: {
            groupName: group.groupName,
            timetable: group.timetable,
            sessionId: targetSessionIdInt
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
        where: { sessionId: sourceSessionIdInt },
        include: {
          hallMemberships: true
        }
      })

      for (const group of sourceHallGroups) {
        const newGroup = await tx.hallGroup.create({
          data: {
            groupName: group.groupName,
            timetable: group.timetable,
            sessionId: targetSessionIdInt
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