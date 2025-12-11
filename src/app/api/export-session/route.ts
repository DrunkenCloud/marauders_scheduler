import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Export student groups
    const studentGroups = await prisma.studentGroup.findMany({
      where: { sessionId }
    })

    // Export students
    const students = await prisma.student.findMany({
      where: { sessionId }
    })

    // Export faculty
    const faculty = await prisma.faculty.findMany({
      where: { sessionId }
    })

    // Export faculty groups
    const facultyGroups = await prisma.facultyGroup.findMany({
      where: { sessionId }
    })

    // Export halls
    const halls = await prisma.hall.findMany({
      where: { sessionId }
    })

    // Export hall groups
    const hallGroups = await prisma.hallGroup.findMany({
      where: { sessionId }
    })

    // Export courses with all relationships
    const courses = await prisma.course.findMany({
      where: { sessionId },
      include: {
        compulsoryFaculties: { select: { id: true } },
        compulsoryHalls: { select: { id: true } },
        compulsoryFacultyGroups: { select: { facultyGroupId: true } },
        compulsoryHallGroups: { select: { hallGroupId: true } },
        studentEnrollments: { select: { studentId: true } },
        studentGroupEnrollments: { select: { studentGroupId: true } }
      }
    })

    // Export group memberships
    const studentGroupMemberships = await prisma.studentGroupMembership.findMany({
      where: { studentGroup: { sessionId } }
    })

    const facultyGroupMemberships = await prisma.facultyGroupMembership.findMany({
      where: { facultyGroup: { sessionId } }
    })

    const hallGroupMemberships = await prisma.hallGroupMembership.findMany({
      where: { hallGroup: { sessionId } }
    })

    const exportData = {
      session: {
        id: session.id,
        name: session.name,
        exportedAt: new Date().toISOString()
      },
      studentGroups,
      students,
      faculty,
      facultyGroups,
      halls,
      hallGroups,
      courses,
      studentGroupMemberships,
      facultyGroupMemberships,
      hallGroupMemberships
    }

    return NextResponse.json(exportData)
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to export data' },
      { status: 500 }
    )
  }
}
