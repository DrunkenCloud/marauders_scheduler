import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/hall-groups/[id]/members - Get all members of a hall group
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const members = await prisma.hallGroupMembership.findMany({
      where: {
        hallGroupId: id
      },
      include: {
        hall: {
          select: {
            id: true,
            name: true,
            Floor: true,
            Building: true,
            shortForm: true,
            startHour: true,
            startMinute: true,
            endHour: true,
            endMinute: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: [
        {
          hall: {
            Building: 'asc'
          }
        },
        {
          hall: {
            Floor: 'asc'
          }
        },
        {
          hall: {
            name: 'asc'
          }
        }
      ]
    })

    return NextResponse.json({
      success: true,
      data: members
    } as ApiResponse)

  } catch (error) {
    console.error('Error fetching group members:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch group members',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// POST /api/hall-groups/[id]/members - Add members to hall group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { hallIds } = body

    if (!hallIds || !Array.isArray(hallIds) || hallIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_HALL_IDS',
          message: 'Hall IDs array is required and must not be empty',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Check if group exists
    const group = await prisma.hallGroup.findUnique({
      where: { id }
    })

    if (!group) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Hall group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Verify all halls exist and belong to the same session
    const halls = await prisma.hall.findMany({
      where: {
        id: { in: hallIds },
        sessionId: group.sessionId
      }
    })

    if (halls.length !== hallIds.length) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_HALLS',
          message: 'Some halls not found or do not belong to the same session',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Create memberships (ignore duplicates)
    const memberships = await Promise.allSettled(
      hallIds.map(hallId =>
        prisma.hallGroupMembership.create({
          data: {
            hallId,
            hallGroupId: id
          },
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
        })
      )
    )

    const successful = memberships
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value)

    const failed = memberships
      .filter(result => result.status === 'rejected')
      .map(result => (result as PromiseRejectedResult).reason)

    return NextResponse.json({
      success: true,
      data: {
        added: successful,
        failed: failed.length,
        message: `Successfully added ${successful.length} members${failed.length > 0 ? `, ${failed.length} already existed` : ''}`
      }
    } as ApiResponse)

  } catch (error) {
    console.error('Error adding group members:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'ADD_MEMBERS_ERROR',
        message: 'Failed to add members to group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}

// DELETE /api/hall-groups/[id]/members - Remove members from hall group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { hallIds } = body

    if (!hallIds || !Array.isArray(hallIds) || hallIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_HALL_IDS',
          message: 'Hall IDs array is required and must not be empty',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Remove memberships
    const result = await prisma.hallGroupMembership.deleteMany({
      where: {
        hallGroupId: id,
        hallId: { in: hallIds }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        removed: result.count,
        message: `Successfully removed ${result.count} members from group`
      }
    } as ApiResponse)

  } catch (error) {
    console.error('Error removing group members:', error)
    return NextResponse.json({
      success: false,
      error: {
        code: 'REMOVE_MEMBERS_ERROR',
        message: 'Failed to remove members from group',
        timestamp: new Date()
      }
    } as ApiResponse, { status: 500 })
  }
}