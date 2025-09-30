import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/student-groups/[id] - Get specific student group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const studentGroup = await prisma.studentGroup.findUnique({
      where: { id },
      include: {
        studentMemberships: {
          include: {
            student: {
              select: {
                id: true,
                digitalId: true
              }
            }
          }
        },
        _count: {
          select: {
            studentMemberships: true
          }
        }
      }
    })

    if (!studentGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Student group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: studentGroup
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching student group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch student group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// PUT /api/student-groups/[id] - Update student group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const body = await request.json()
    const { groupName, startHour, startMinute, endHour, endMinute, timetable } = body

    // Check if group exists
    const existingGroup = await prisma.studentGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Student group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Check if new group name conflicts with existing groups (if name is being changed)
    if (groupName && groupName !== existingGroup.groupName) {
      const conflictingGroup = await prisma.studentGroup.findFirst({
        where: {
          groupName,
          sessionId: existingGroup.sessionId,
          id: { not: id }
        }
      })

      if (conflictingGroup) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'GROUP_NAME_EXISTS',
            message: 'A student group with this name already exists in the current session',
            timestamp: new Date()
          }
        } as ApiResponse, { status: 409 })
      }
    }

    const updatedGroup = await prisma.studentGroup.update({
      where: { id },
      data: {
        ...(groupName && { groupName }),
        ...(startHour !== undefined && { startHour }),
        ...(startMinute !== undefined && { startMinute }),
        ...(endHour !== undefined && { endHour }),
        ...(endMinute !== undefined && { endMinute }),
        ...(timetable && { timetable })
      },
      include: {
        studentMemberships: {
          include: {
            student: {
              select: {
                id: true,
                digitalId: true
              }
            }
          }
        },
        _count: {
          select: {
            studentMemberships: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedGroup
    } as ApiResponse)

  } catch (error) {
    console.error('Error updating student group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update student group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// DELETE /api/student-groups/[id] - Delete student group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    // Check if group exists
    const existingGroup = await prisma.studentGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            studentMemberships: true
          }
        }
      }
    })

    if (!existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Student group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Delete the group (memberships will be cascade deleted)
    await prisma.studentGroup.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Student group deleted successfully' }
    } as ApiResponse)

  } catch (error) {
    console.error('Error deleting student group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete student group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}