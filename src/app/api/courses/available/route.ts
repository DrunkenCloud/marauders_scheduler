import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, EntityType } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType') as EntityType
    const entityId = searchParams.get('entityId')
    const sessionId = searchParams.get('sessionId')

    if (!entityType || !entityId || !sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Entity type, entity ID, and session ID are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const entityIdNum = parseInt(entityId)
    const sessionIdNum = parseInt(sessionId)

    let availableCourses: any[] = []

    switch (entityType) {
      case EntityType.STUDENT:
        // Get courses the student is enrolled in
        availableCourses = await prisma.course.findMany({
          where: {
            sessionId: sessionIdNum,
            OR: [
              {
                studentEnrollments: {
                  some: { studentId: entityIdNum }
                }
              },
              {
                studentGroupEnrollments: {
                  some: {
                    studentGroup: {
                      studentMemberships: {
                        some: { studentId: entityIdNum }
                      }
                    }
                  }
                }
              }
            ]
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: {
              include: { facultyGroup: true }
            },
            compulsoryHallGroups: {
              include: { hallGroup: true }
            }
          }
        })
        break

      case EntityType.FACULTY:
        // Get courses the faculty teaches
        availableCourses = await prisma.course.findMany({
          where: {
            sessionId: sessionIdNum,
            OR: [
              {
                compulsoryFaculties: {
                  some: { id: entityIdNum }
                }
              },
              {
                compulsoryFacultyGroups: {
                  some: {
                    facultyGroup: {
                      facultyMemberships: {
                        some: { facultyId: entityIdNum }
                      }
                    }
                  }
                }
              }
            ]
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: {
              include: { facultyGroup: true }
            },
            compulsoryHallGroups: {
              include: { hallGroup: true }
            }
          }
        })
        break

      case EntityType.HALL:
        // Get courses that use this hall
        availableCourses = await prisma.course.findMany({
          where: {
            sessionId: sessionIdNum,
            OR: [
              {
                compulsoryHalls: {
                  some: { id: entityIdNum }
                }
              },
              {
                compulsoryHallGroups: {
                  some: {
                    hallGroup: {
                      hallMemberships: {
                        some: { hallId: entityIdNum }
                      }
                    }
                  }
                }
              }
            ]
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: {
              include: { facultyGroup: true }
            },
            compulsoryHallGroups: {
              include: { hallGroup: true }
            }
          }
        })
        break

      case EntityType.STUDENT_GROUP:
        // Get courses the student group is enrolled in
        availableCourses = await prisma.course.findMany({
          where: {
            sessionId: sessionIdNum,
            studentGroupEnrollments: {
              some: { studentGroupId: entityIdNum }
            }
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: {
              include: { facultyGroup: true }
            },
            compulsoryHallGroups: {
              include: { hallGroup: true }
            }
          }
        })
        break

      case EntityType.FACULTY_GROUP:
        // Get courses the faculty group teaches
        availableCourses = await prisma.course.findMany({
          where: {
            sessionId: sessionIdNum,
            compulsoryFacultyGroups: {
              some: { facultyGroupId: entityIdNum }
            }
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: {
              include: { facultyGroup: true }
            },
            compulsoryHallGroups: {
              include: { hallGroup: true }
            }
          }
        })
        break

      case EntityType.HALL_GROUP:
        // Get courses that use this hall group
        availableCourses = await prisma.course.findMany({
          where: {
            sessionId: sessionIdNum,
            compulsoryHallGroups: {
              some: { hallGroupId: entityIdNum }
            }
          },
          include: {
            compulsoryFaculties: true,
            compulsoryHalls: true,
            compulsoryFacultyGroups: {
              include: { facultyGroup: true }
            },
            compulsoryHallGroups: {
              include: { hallGroup: true }
            }
          }
        })
        break

      default:
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'INVALID_ENTITY_TYPE',
            message: 'Invalid entity type',
            timestamp: new Date()
          }
        }
        return NextResponse.json(response, { status: 400 })
    }

    // Filter courses that still need scheduling (scheduledCount < totalSessions)
    const coursesNeedingScheduling = availableCourses.filter(course => 
      course.scheduledCount < course.totalSessions
    )

    const response: ApiResponse = {
      success: true,
      data: {
        courses: coursesNeedingScheduling
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching available courses:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_COURSES_ERROR',
        message: 'Failed to fetch available courses',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}