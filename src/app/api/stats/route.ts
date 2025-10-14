import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponse, DashboardStats } from '@/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_SESSION_ID',
          message: 'Valid session ID is required',
          timestamp: new Date()
        }
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Get counts for all entities in the session
    const [
      studentsCount,
      facultyCount,
      hallsCount,
      coursesCount,
      studentGroupsCount,
      facultyGroupsCount,
      hallGroupsCount
    ] = await Promise.all([
      prisma.student.count({ where: { sessionId: sessionId } }),
      prisma.faculty.count({ where: { sessionId: sessionId } }),
      prisma.hall.count({ where: { sessionId: sessionId } }),
      prisma.course.count({ where: { sessionId: sessionId } }),
      prisma.studentGroup.count({ where: { sessionId: sessionId } }),
      prisma.facultyGroup.count({ where: { sessionId: sessionId } }),
      prisma.hallGroup.count({ where: { sessionId: sessionId } })
    ])

    const stats: DashboardStats = {
      students: studentsCount,
      faculty: facultyCount,
      halls: hallsCount,
      courses: coursesCount,
      studentGroups: studentGroupsCount,
      facultyGroups: facultyGroupsCount,
      hallGroups: hallGroupsCount
    }

    const response: ApiResponse<DashboardStats> = {
      success: true,
      data: stats
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    
    const response: ApiResponse = {
      success: false,
      error: {
        code: 'FETCH_STATS_ERROR',
        message: 'Failed to fetch dashboard statistics',
        timestamp: new Date()
      }
    }

    return NextResponse.json(response, { status: 500 })
  }
}