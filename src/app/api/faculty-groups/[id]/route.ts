import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/faculty-groups/[id] - Get specific faculty group
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const facultyGroup = await prisma.facultyGroup.findUnique({
      where: { id },
      include: {
        facultyMemberships: {
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                shortForm: true
              }
            }
          }
        },
        _count: {
          select: {
            facultyMemberships: true
          }
        }
      }
    })

    if (!facultyGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Faculty group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: facultyGroup
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching faculty group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch faculty group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// PUT /api/faculty-groups/[id] - Update faculty group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { groupName, startHour, startMinute, endHour, endMinute, timetable } = body

    // Check if group exists
    const existingGroup = await prisma.facultyGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Faculty group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Check if new group name conflicts with existing groups (if name is being changed)
    if (groupName && groupName !== existingGroup.groupName) {
      const conflictingGroup = await prisma.facultyGroup.findFirst({
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
            message: 'A faculty group with this name already exists in the current session',
            timestamp: new Date()
          }
        } as ApiResponse, { status: 409 })
      }
    }

    const updatedGroup = await prisma.facultyGroup.update({
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
        facultyMemberships: {
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                shortForm: true
              }
            }
          }
        },
        _count: {
          select: {
            facultyMemberships: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedGroup
    } as ApiResponse)

  } catch (error) {
    console.error('Error updating faculty group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update faculty group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// DELETE /api/faculty-groups/[id] - Delete faculty group
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if group exists
    const existingGroup = await prisma.facultyGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            facultyMemberships: true
          }
        }
      }
    })

    if (!existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Faculty group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Delete the group (memberships will be cascade deleted)
    await prisma.facultyGroup.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Faculty group deleted successfully' }
    } as ApiResponse)

  } catch (error) {
    console.error('Error deleting faculty group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete faculty group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}