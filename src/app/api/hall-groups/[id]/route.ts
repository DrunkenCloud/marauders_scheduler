import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/hall-groups/[id] - Get specific hall group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    const hallGroup = await prisma.hallGroup.findUnique({
      where: { id },
      include: {
        hallMemberships: {
          include: {
            hall: {
              select: {
                id: true,
                name: true,
                Floor: true,
                Building: true,
                shortForm: true
              }
            }
          }
        },
        _count: {
          select: {
            hallMemberships: true
          }
        }
      }
    })

    if (!hallGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Hall group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: hallGroup
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching hall group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch hall group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// PUT /api/hall-groups/[id] - Update hall group
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
    const existingGroup = await prisma.hallGroup.findUnique({
      where: { id }
    })

    if (!existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Hall group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Check if new group name conflicts with existing groups (if name is being changed)
    if (groupName && groupName !== existingGroup.groupName) {
      const conflictingGroup = await prisma.hallGroup.findFirst({
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
            message: 'A hall group with this name already exists in the current session',
            timestamp: new Date()
          }
        } as ApiResponse, { status: 409 })
      }
    }

    const updatedGroup = await prisma.hallGroup.update({
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
        hallMemberships: {
          include: {
            hall: {
              select: {
                id: true,
                name: true,
                Floor: true,
                Building: true,
                shortForm: true
              }
            }
          }
        },
        _count: {
          select: {
            hallMemberships: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedGroup
    } as ApiResponse)

  } catch (error) {
    console.error('Error updating hall group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update hall group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// DELETE /api/hall-groups/[id] - Delete hall group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    // Check if group exists
    const existingGroup = await prisma.hallGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            hallMemberships: true
          }
        }
      }
    })

    if (!existingGroup) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Hall group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Delete the group (memberships will be cascade deleted)
    await prisma.hallGroup.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      data: { message: 'Hall group deleted successfully' }
    } as ApiResponse)

  } catch (error) {
    console.error('Error deleting hall group:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete hall group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}