import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')
    const sessionId = searchParams.get('sessionId')

    if (!entityType || !entityId || !sessionId) {
      return NextResponse.json(
        { error: 'entityType, entityId, and sessionId are required' },
        { status: 400 }
      )
    }

    let courses: any[] = []

    // Get courses based on entity type
    switch (entityType) {
      case 'student':
        // Get courses where this student is enrolled
        const studentEnrollments = await prisma.courseStudentEnrollment.findMany({
          where: { 
            studentId: entityId,
            course: { sessionId }
          },
          include: {
            course: {
              include: {
                compulsoryFaculties: true,
                compulsoryHalls: true,
                compulsoryFacultyGroups: { include: { facultyGroup: true } },
                compulsoryHallGroups: { include: { hallGroup: true } },
                studentEnrollments: { include: { student: true } },
                studentGroupEnrollments: { include: { studentGroup: true } }
              }
            }
          }
        })
        courses = studentEnrollments.map(e => e.course)
        break

      case 'studentGroup':
        // Get courses where this student group is enrolled
        const studentGroupEnrollments = await prisma.courseStudentGroupEnrollment.findMany({
          where: { 
            studentGroupId: entityId,
            course: { sessionId }
          },
          include: {
            course: {
              include: {
                compulsoryFaculties: true,
                compulsoryHalls: true,
                compulsoryFacultyGroups: { include: { facultyGroup: true } },
                compulsoryHallGroups: { include: { hallGroup: true } },
                studentEnrollments: { include: { student: true } },
                studentGroupEnrollments: { include: { studentGroup: true } }
              }
            }
          }
        })
        courses = studentGroupEnrollments.map(e => e.course)
        break

      case 'faculty':
        // Get courses where this faculty is compulsory
        courses = await prisma.course.findMany({
          where: {
            sessionId,
            compulsoryFaculties: {
              some: { id: entityId }
            }
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: { include: { facultyGroup: true } },
            compulsoryHallGroups: { include: { hallGroup: true } },
            studentEnrollments: { include: { student: true } },
            studentGroupEnrollments: { include: { studentGroup: true } }
          }
        })
        break

      case 'facultyGroup':
        // Get courses where this faculty group is compulsory
        const facultyGroupCourses = await prisma.compulsoryFacultyGroup.findMany({
          where: { 
            facultyGroupId: entityId,
            course: { sessionId }
          },
          include: {
            course: {
              include: {
                compulsoryFaculties: true,
                compulsoryHalls: true,
                compulsoryFacultyGroups: { include: { facultyGroup: true } },
                compulsoryHallGroups: { include: { hallGroup: true } },
                studentEnrollments: { include: { student: true } },
                studentGroupEnrollments: { include: { studentGroup: true } }
              }
            }
          }
        })
        courses = facultyGroupCourses.map(fg => fg.course)
        break

      case 'hall':
        // Get courses where this hall is compulsory
        courses = await prisma.course.findMany({
          where: {
            sessionId,
            compulsoryHalls: {
              some: { id: entityId }
            }
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: { include: { facultyGroup: true } },
            compulsoryHallGroups: { include: { hallGroup: true } },
            studentEnrollments: { include: { student: true } },
            studentGroupEnrollments: { include: { studentGroup: true } }
          }
        })
        break

      case 'hallGroup':
        // Get courses where this hall group is compulsory
        const hallGroupCourses = await prisma.compulsoryHallGroup.findMany({
          where: { 
            hallGroupId: entityId,
            course: { sessionId }
          },
          include: {
            course: {
              include: {
                compulsoryFaculties: true,
                compulsoryHalls: true,
                compulsoryFacultyGroups: { include: { facultyGroup: true } },
                compulsoryHallGroups: { include: { hallGroup: true } },
                studentEnrollments: { include: { student: true } },
                studentGroupEnrollments: { include: { studentGroup: true } }
              }
            }
          }
        })
        courses = hallGroupCourses.map(hg => hg.course)
        break

      case 'course':
        // For courses, return all courses in the session
        // (courses don't have enrollment restrictions like other entities)
        courses = await prisma.course.findMany({
          where: { sessionId },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: { include: { facultyGroup: true } },
            compulsoryHallGroups: { include: { hallGroup: true } },
            studentEnrollments: { include: { student: true } },
            studentGroupEnrollments: { include: { studentGroup: true } }
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid entity type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: { courses }
    })
  } catch (error: any) {
    console.error('Error fetching available courses:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch available courses' },
      { status: 500 }
    )
  }
}
