import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    if (!sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID is required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    const where = {
      sessionId: sessionId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } }
        ]
      })
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        select: {
          id: true,
          name: true,
          code: true,
          sessionId: true,
          classDuration: true,
          sessionsPerLecture: true,
          totalSessions: true,
          scheduledCount: true,
          timetable: true,
          createdAt: true,
          updatedAt: true,
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
              }
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
      }),
      prisma.course.count({ where })
    ])

    const response: ApiResponse = {
      success: true,
      data: {
        courses,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching courses:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_COURSES_ERROR',
        message: 'Failed to fetch courses',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      code, 
      sessionId, 
      classDuration = 50, 
      sessionsPerLecture = 1, 
      totalSessions = 3,
      timetable = {},
      facultyIds = [],
      hallIds = [],
      studentIds = [],
      studentGroupIds = [],
      facultyGroupIds = [],
      hallGroupIds = [],
      hallGroups = []
    } = body

    if (!name || !code || !sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, Code, and Session ID are required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Validate scheduling parameters
    if (classDuration < 1 || sessionsPerLecture < 1 || totalSessions < 1) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Class duration, sessions per lecture, and total sessions must be positive numbers',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Initialize empty timetable if not provided
    const defaultTimetable = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Sunday: []
    }

    const course = await prisma.course.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        sessionId: sessionId,
        classDuration: parseInt(classDuration),
        sessionsPerLecture: parseInt(sessionsPerLecture),
        totalSessions: parseInt(totalSessions),
        timetable: timetable || defaultTimetable,
        // Connect faculty
        compulsoryFaculties: {
          connect: facultyIds.map((id: string) => ({ id }))
        },
        // Connect halls
        compulsoryHalls: {
          connect: hallIds.map((id: string) => ({ id }))
        },
        // Create student enrollments
        studentEnrollments: {
          create: studentIds.map((studentId: string) => ({
            studentId
          }))
        },
        // Create student group enrollments
        studentGroupEnrollments: {
          create: studentGroupIds.map((studentGroupId: string) => ({
            studentGroupId
          }))
        },
        // Create faculty group connections
        compulsoryFacultyGroups: {
          create: facultyGroupIds.map((facultyGroupId: string) => ({
            facultyGroupId
          }))
        },
        // Create hall group connections
        compulsoryHallGroups: {
          create: (hallGroups.length > 0 ? hallGroups : hallGroupIds.map((id: string) => ({ id }))).map((group: any) => ({
            hallGroupId: group.id || group
          }))
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        sessionId: true,
        classDuration: true,
        sessionsPerLecture: true,
        totalSessions: true,
        scheduledCount: true,
        timetable: true,
        createdAt: true,
        updatedAt: true,
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
            }
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

    return NextResponse.json(response, { status: 201 })
  } catch (error: any) {
    console.error('Error creating course:', error)
    
    let errorMessage = 'Failed to create course'
    if (error.code === 'P2002') {
      errorMessage = 'A course with this code already exists'
    }

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'CREATE_COURSE_ERROR',
        message: errorMessage,
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}