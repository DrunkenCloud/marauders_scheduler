import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        session: true,
        compulsoryFaculties: {
          select: {
            id: true,
            name: true,
            shortForm: true
          }
        },
        compulsoryHalls: {
          select: {
            id: true,
            name: true,
            Building: true,
            Floor: true,
            shortForm: true
          }
        },
        compulsoryFacultyGroups: {
          select: {
            facultyGroup: {
              select: {
                id: true,
                groupName: true
              }
            }
          }
        },
        compulsoryHallGroups: {
          select: {
            hallGroup: {
              select: {
                id: true,
                groupName: true
              }
            },
            requiredCount: true
          }
        },
        studentEnrollments: {
          select: {
            student: {
              select: {
                id: true,
                digitalId: true
              }
            }
          }
        },
        studentGroupEnrollments: {
          select: {
            studentGroup: {
              select: {
                id: true,
                groupName: true
              }
            }
          }
        }
      }
    })

    if (!course) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Course not found',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: ApiResponse = {
      success: true,
      data: course
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching course:', error)

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_COURSE_ERROR',
        message: 'Failed to fetch course',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      name,
      code,
      classDuration,
      sessionsPerLecture,
      totalSessions,
      timetable,
      facultyIds,
      hallIds,
      studentIds,
      studentGroupIds,
      facultyGroupIds,
      hallGroupIds,
      hallGroups
    } = body

    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const updateData: any = {}

    if (name !== undefined) {
      if (!name.trim()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Name cannot be empty',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.name = name.trim()
    }

    if (code !== undefined) {
      if (!code.trim()) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Code cannot be empty',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.code = code.trim().toUpperCase()
    }

    if (classDuration !== undefined) {
      const duration = parseInt(classDuration)
      if (isNaN(duration) || duration < 1) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Class duration must be a positive number',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.classDuration = duration
    }

    if (sessionsPerLecture !== undefined) {
      const sessions = parseInt(sessionsPerLecture)
      if (isNaN(sessions) || sessions < 1) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Sessions per lecture must be a positive number',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.sessionsPerLecture = sessions
    }

    if (totalSessions !== undefined) {
      const total = parseInt(totalSessions)
      if (isNaN(total) || total < 1) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Total sessions must be a positive number',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
      }
      updateData.totalSessions = total
    }

    if (timetable !== undefined) {
      updateData.timetable = timetable
    }

    // Handle enrollment updates
    if (facultyIds !== undefined) {
      updateData.compulsoryFaculties = {
        set: facultyIds.map((id: string) => ({ id }))
      }
    }

    if (hallIds !== undefined) {
      updateData.compulsoryHalls = {
        set: hallIds.map((id: string) => ({ id }))
      }
    }

    // For student enrollments, we need to handle them separately due to the junction table
    let studentEnrollmentUpdates = {}
    if (studentIds !== undefined) {
      // Delete existing enrollments and create new ones
      await prisma.courseStudentEnrollment.deleteMany({
        where: { courseId: id }
      })

      if (studentIds.length > 0) {
        studentEnrollmentUpdates = {
          studentEnrollments: {
            create: studentIds.map((studentId: string) => ({
              studentId
            }))
          }
        }
      }
    }

    // Handle student group enrollments
    let studentGroupEnrollmentUpdates = {}
    if (studentGroupIds !== undefined) {
      await prisma.courseStudentGroupEnrollment.deleteMany({
        where: { courseId: id }
      })

      if (studentGroupIds.length > 0) {
        studentGroupEnrollmentUpdates = {
          studentGroupEnrollments: {
            create: studentGroupIds.map((studentGroupId: string) => ({
              studentGroupId
            }))
          }
        }
      }
    }

    // Handle faculty group connections
    let facultyGroupUpdates = {}
    if (facultyGroupIds !== undefined) {
      await prisma.compulsoryFacultyGroup.deleteMany({
        where: { courseId: id }
      })

      if (facultyGroupIds.length > 0) {
        facultyGroupUpdates = {
          compulsoryFacultyGroups: {
            create: facultyGroupIds.map((facultyGroupId: string) => ({
              facultyGroupId
            }))
          }
        }
      }
    }

    // Handle hall group connections
    let hallGroupUpdates = {}
    if (hallGroupIds !== undefined || hallGroups !== undefined) {
      await prisma.compulsoryHallGroup.deleteMany({
        where: { courseId: id }
      })

      const groupsToCreate = hallGroups || hallGroupIds?.map((id: string) => ({ id, requiredCount: 1 })) || []
      
      if (groupsToCreate.length > 0) {
        hallGroupUpdates = {
          compulsoryHallGroups: {
            create: groupsToCreate.map((group: any) => ({
              hallGroupId: group.id || group,
              requiredCount: group.requiredCount || 1
            }))
          }
        }
      }
    }

    const course = await prisma.course.update({
      where: { id },
      data: {
        ...updateData,
        ...studentEnrollmentUpdates,
        ...studentGroupEnrollmentUpdates,
        ...facultyGroupUpdates,
        ...hallGroupUpdates
      },
      include: {
        session: true,
        compulsoryFaculties: {
          select: {
            id: true,
            name: true,
            shortForm: true
          }
        },
        compulsoryHalls: {
          select: {
            id: true,
            name: true,
            Building: true,
            Floor: true,
            shortForm: true
          }
        },
        compulsoryFacultyGroups: {
          select: {
            facultyGroup: {
              select: {
                id: true,
                groupName: true
              }
            }
          }
        },
        compulsoryHallGroups: {
          select: {
            hallGroup: {
              select: {
                id: true,
                groupName: true
              }
            },
            requiredCount: true
          }
        },
        studentEnrollments: {
          select: {
            student: {
              select: {
                id: true,
                digitalId: true
              }
            }
          }
        },
        studentGroupEnrollments: {
          select: {
            studentGroup: {
              select: {
                id: true,
                groupName: true
              }
            }
          }
        }
      }
    })

    const response: ApiResponse = {
      success: true,
      data: course
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error updating course:', error)

    let errorMessage = 'Failed to update course'
    if (error.code === 'P2002') {
      errorMessage = 'A course with this code already exists'
    } else if (error.code === 'P2025') {
      errorMessage = 'Course not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'UPDATE_COURSE_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id || id.trim() === '') {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid course ID',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Check if course has student enrollments
    const studentEnrollmentCount = await prisma.courseStudentEnrollment.count({
      where: { courseId: id }
    })

    const studentGroupEnrollmentCount = await prisma.courseStudentGroupEnrollment.count({
      where: { courseId: id }
    })

    const totalEnrollments = studentEnrollmentCount + studentGroupEnrollmentCount

    if (totalEnrollments > 0) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'CONSTRAINT_ERROR',
          message: `Cannot delete course. Course has ${totalEnrollments} enrollment(s). Please remove enrollments first.`,
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    await prisma.course.delete({
      where: { id }
    })

    const response: ApiResponse = {
      success: true,
      data: { message: 'Course deleted successfully' }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error deleting course:', error)

    let errorMessage = 'Failed to delete course'
    if (error.code === 'P2025') {
      errorMessage = 'Course not found'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'DELETE_COURSE_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: error.code === 'P2025' ? 404 : 500 })
  }
}