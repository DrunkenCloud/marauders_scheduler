import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: NextRequest) {
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

    // Thanks to onDelete: Cascade in the schema, deleting related records
    // will happen automatically. But we'll do it explicitly for clarity and to count.
    
    const stats = {
      students: 0,
      studentGroups: 0,
      studentGroupMemberships: 0,
      faculty: 0,
      facultyGroups: 0,
      facultyGroupMemberships: 0,
      halls: 0,
      hallGroups: 0,
      hallGroupMemberships: 0,
      courses: 0,
      compulsoryFacultyGroups: 0,
      compulsoryHallGroups: 0,
      courseStudentEnrollments: 0,
      courseStudentGroupEnrollments: 0
    }

    // Delete in reverse order of dependencies to avoid foreign key issues
    // (though Cascade should handle it)

    // Delete course-related junction tables first
    const courseIds = await prisma.course.findMany({
      where: { sessionId },
      select: { id: true }
    })
    const courseIdList = courseIds.map((c: { id: string }) => c.id)

    if (courseIdList.length > 0) {
      const deletedCourseStudentEnrollments = await prisma.courseStudentEnrollment.deleteMany({
        where: { courseId: { in: courseIdList } }
      })
      stats.courseStudentEnrollments = deletedCourseStudentEnrollments.count

      const deletedCourseStudentGroupEnrollments = await prisma.courseStudentGroupEnrollment.deleteMany({
        where: { courseId: { in: courseIdList } }
      })
      stats.courseStudentGroupEnrollments = deletedCourseStudentGroupEnrollments.count

      const deletedCompulsoryFacultyGroups = await prisma.compulsoryFacultyGroup.deleteMany({
        where: { courseId: { in: courseIdList } }
      })
      stats.compulsoryFacultyGroups = deletedCompulsoryFacultyGroups.count

      const deletedCompulsoryHallGroups = await prisma.compulsoryHallGroup.deleteMany({
        where: { courseId: { in: courseIdList } }
      })
      stats.compulsoryHallGroups = deletedCompulsoryHallGroups.count
    }

    // Delete courses
    const deletedCourses = await prisma.course.deleteMany({
      where: { sessionId }
    })
    stats.courses = deletedCourses.count

    // Delete group memberships
    const studentGroupIds = await prisma.studentGroup.findMany({
      where: { sessionId },
      select: { id: true }
    })
    if (studentGroupIds.length > 0) {
      const deletedStudentGroupMemberships = await prisma.studentGroupMembership.deleteMany({
        where: { studentGroupId: { in: studentGroupIds.map((g: { id: string }) => g.id) } }
      })
      stats.studentGroupMemberships = deletedStudentGroupMemberships.count
    }

    const facultyGroupIds = await prisma.facultyGroup.findMany({
      where: { sessionId },
      select: { id: true }
    })
    if (facultyGroupIds.length > 0) {
      const deletedFacultyGroupMemberships = await prisma.facultyGroupMembership.deleteMany({
        where: { facultyGroupId: { in: facultyGroupIds.map((g: { id: string }) => g.id) } }
      })
      stats.facultyGroupMemberships = deletedFacultyGroupMemberships.count
    }

    const hallGroupIds = await prisma.hallGroup.findMany({
      where: { sessionId },
      select: { id: true }
    })
    if (hallGroupIds.length > 0) {
      const deletedHallGroupMemberships = await prisma.hallGroupMembership.deleteMany({
        where: { hallGroupId: { in: hallGroupIds.map((g: { id: string }) => g.id) } }
      })
      stats.hallGroupMemberships = deletedHallGroupMemberships.count
    }

    // Delete main entities
    const deletedStudents = await prisma.student.deleteMany({
      where: { sessionId }
    })
    stats.students = deletedStudents.count

    const deletedStudentGroups = await prisma.studentGroup.deleteMany({
      where: { sessionId }
    })
    stats.studentGroups = deletedStudentGroups.count

    const deletedFaculty = await prisma.faculty.deleteMany({
      where: { sessionId }
    })
    stats.faculty = deletedFaculty.count

    const deletedFacultyGroups = await prisma.facultyGroup.deleteMany({
      where: { sessionId }
    })
    stats.facultyGroups = deletedFacultyGroups.count

    const deletedHalls = await prisma.hall.deleteMany({
      where: { sessionId }
    })
    stats.halls = deletedHalls.count

    const deletedHallGroups = await prisma.hallGroup.deleteMany({
      where: { sessionId }
    })
    stats.hallGroups = deletedHallGroups.count

    return NextResponse.json({ 
      success: true, 
      message: 'Session cleared successfully',
      stats 
    })
  } catch (error: any) {
    console.error('Clear session error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to clear session' },
      { status: 500 }
    )
  }
}
