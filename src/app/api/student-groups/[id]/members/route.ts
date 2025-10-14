import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/types'

// GET /api/student-groups/[id]/members - Get all members of a student group
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const members = await prisma.studentGroupMembership.findMany({
      where: {
        studentGroupId: id
      },
      include: {
        student: {
          select: {
            id: true,
            digitalId: true,
            startHour: true,
            startMinute: true,
            endHour: true,
            endMinute: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: {
        student: {
          digitalId: 'asc'
        }
      }
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

// POST /api/student-groups/[id]/members - Add members to student group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STUDENT_IDS',
          message: 'Student IDs array is required and must not be empty',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Check if group exists
    const group = await prisma.studentGroup.findUnique({
      where: { id }
    })

    if (!group) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'GROUP_NOT_FOUND',
          message: 'Student group not found',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 404 })
    }

    // Verify all students exist and belong to the same session
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        sessionId: group.sessionId
      }
    })

    if (students.length !== studentIds.length) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STUDENTS',
          message: 'Some students not found or do not belong to the same session',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Create memberships (ignore duplicates)
    const memberships = await Promise.allSettled(
      studentIds.map(studentId =>
        prisma.studentGroupMembership.create({
          data: {
            studentId,
            studentGroupId: id
          },
          include: {
            student: {
              select: {
                id: true,
                digitalId: true
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

// DELETE /api/student-groups/[id]/members - Remove members from student group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { studentIds } = body

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_STUDENT_IDS',
          message: 'Student IDs array is required and must not be empty',
          timestamp: new Date()
        }
      } as ApiResponse, { status: 400 })
    }

    // Remove memberships
    const result = await prisma.studentGroupMembership.deleteMany({
      where: {
        studentGroupId: id,
        studentId: { in: studentIds }
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