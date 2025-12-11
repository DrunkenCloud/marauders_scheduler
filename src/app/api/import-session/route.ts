import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, data } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const stats = {
      studentGroups: 0,
      students: 0,
      faculty: 0,
      facultyGroups: 0,
      halls: 0,
      hallGroups: 0,
      courses: 0,
      memberships: 0,
      courseRelations: 0
    }

    // Map old IDs to new IDs
    const studentGroupIdMap = new Map<string, string>()
    const studentIdMap = new Map<string, string>()
    const facultyIdMap = new Map<string, string>()
    const facultyGroupIdMap = new Map<string, string>()
    const hallIdMap = new Map<string, string>()
    const hallGroupIdMap = new Map<string, string>()
    const courseIdMap = new Map<string, string>()

    // Import student groups (handle both 'studentGroups' and 'classes' from old format)
    const studentGroupsData = data.studentGroups || data.classes || []
    if (Array.isArray(studentGroupsData)) {
      for (const group of studentGroupsData) {
        // Handle old format where classes have year, class, section
        const groupName = group.groupName || 
                         (group.year && group.class && group.section 
                           ? `Year ${group.year} ${group.class} ${group.section}` 
                           : 'Unnamed Group')
        
        const newGroup = await prisma.studentGroup.create({
          data: {
            sessionId,
            groupName,
            timetable: group.timetable || {},
            startHour: group.startHour || 8,
            startMinute: group.startMinute || 10,
            endHour: group.endHour || 15,
            endMinute: group.endMinute || 30
          }
        })
        studentGroupIdMap.set(group.id, newGroup.id)
        stats.studentGroups++
      }
    }

    // Import students
    if (data.students && Array.isArray(data.students)) {
      for (const student of data.students) {
        const newStudent = await prisma.student.create({
          data: {
            sessionId,
            digitalId: student.digitalId,
            timetable: student.timetable || {},
            startHour: student.startHour || 8,
            startMinute: student.startMinute || 10,
            endHour: student.endHour || 15,
            endMinute: student.endMinute || 30
          }
        })
        studentIdMap.set(student.id, newStudent.id)
        stats.students++
      }
    }

    // Import faculty
    if (data.faculty && Array.isArray(data.faculty)) {
      for (const fac of data.faculty) {
        const newFaculty = await prisma.faculty.create({
          data: {
            sessionId,
            name: fac.name,
            shortForm: fac.shortForm,
            timetable: fac.timetable || {},
            startHour: fac.startHour || 8,
            startMinute: fac.startMinute || 10,
            endHour: fac.endHour || 17,
            endMinute: fac.endMinute || 0
          }
        })
        facultyIdMap.set(fac.id, newFaculty.id)
        stats.faculty++
      }
    }

    // Import faculty groups
    if (data.facultyGroups && Array.isArray(data.facultyGroups)) {
      for (const group of data.facultyGroups) {
        const newGroup = await prisma.facultyGroup.create({
          data: {
            sessionId,
            groupName: group.groupName,
            timetable: group.timetable || {},
            startHour: group.startHour || 8,
            startMinute: group.startMinute || 10,
            endHour: group.endHour || 17,
            endMinute: group.endMinute || 0
          }
        })
        facultyGroupIdMap.set(group.id, newGroup.id)
        stats.facultyGroups++
      }
    }

    // Import halls
    if (data.halls && Array.isArray(data.halls)) {
      for (const hall of data.halls) {
        const newHall = await prisma.hall.create({
          data: {
            sessionId,
            name: hall.name,
            Floor: hall.Floor || '',
            Building: hall.Building || '',
            shortForm: hall.shortForm,
            timetable: hall.timetable || {},
            startHour: hall.startHour || 8,
            startMinute: hall.startMinute || 10,
            endHour: hall.endHour || 20,
            endMinute: hall.endMinute || 0
          }
        })
        hallIdMap.set(hall.id, newHall.id)
        stats.halls++
      }
    }

    // Import hall groups
    if (data.hallGroups && Array.isArray(data.hallGroups)) {
      for (const group of data.hallGroups) {
        const newGroup = await prisma.hallGroup.create({
          data: {
            sessionId,
            groupName: group.groupName,
            timetable: group.timetable || {},
            startHour: group.startHour || 8,
            startMinute: group.startMinute || 10,
            endHour: group.endHour || 20,
            endMinute: group.endMinute || 0
          }
        })
        hallGroupIdMap.set(group.id, newGroup.id)
        stats.hallGroups++
      }
    }

    // Import courses
    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        const newCourse = await prisma.course.create({
          data: {
            sessionId,
            name: course.name || course.courseName || 'Unnamed Course',
            code: course.code || course.courseCode || 'UNKNOWN',
            timetable: course.timetable || {},
            classDuration: course.classDuration || 50,
            sessionsPerLecture: course.sessionsPerLecture || 1,
            totalSessions: course.totalSessions || course.hoursPerWeek || 3,
            scheduledCount: course.scheduledCount || 0
          }
        })
        courseIdMap.set(course.id, newCourse.id)
        stats.courses++

        // If course has a classId (old format), create a student group enrollment
        if (course.classId) {
          const newStudentGroupId = studentGroupIdMap.get(course.classId)
          if (newStudentGroupId) {
            await prisma.courseStudentGroupEnrollment.create({
              data: {
                courseId: newCourse.id,
                studentGroupId: newStudentGroupId
              }
            })
            stats.courseRelations++
          }
        }

        // Connect compulsory faculties
        if (course.compulsoryFaculties && Array.isArray(course.compulsoryFaculties)) {
          for (const fac of course.compulsoryFaculties) {
            const newFacultyId = facultyIdMap.get(fac.id)
            if (newFacultyId) {
              await prisma.course.update({
                where: { id: newCourse.id },
                data: {
                  compulsoryFaculties: {
                    connect: { id: newFacultyId }
                  }
                }
              })
              stats.courseRelations++
            }
          }
        }

        // Connect compulsory halls
        if (course.compulsoryHalls && Array.isArray(course.compulsoryHalls)) {
          for (const hall of course.compulsoryHalls) {
            const newHallId = hallIdMap.get(hall.id)
            if (newHallId) {
              await prisma.course.update({
                where: { id: newCourse.id },
                data: {
                  compulsoryHalls: {
                    connect: { id: newHallId }
                  }
                }
              })
              stats.courseRelations++
            }
          }
        }

        // Connect faculty groups
        if (course.compulsoryFacultyGroups && Array.isArray(course.compulsoryFacultyGroups)) {
          for (const fg of course.compulsoryFacultyGroups) {
            const newFacultyGroupId = facultyGroupIdMap.get(fg.facultyGroupId)
            if (newFacultyGroupId) {
              await prisma.compulsoryFacultyGroup.create({
                data: {
                  courseId: newCourse.id,
                  facultyGroupId: newFacultyGroupId
                }
              })
              stats.courseRelations++
            }
          }
        }

        // Connect hall groups
        if (course.compulsoryHallGroups && Array.isArray(course.compulsoryHallGroups)) {
          for (const hg of course.compulsoryHallGroups) {
            const newHallGroupId = hallGroupIdMap.get(hg.hallGroupId)
            if (newHallGroupId) {
              await prisma.compulsoryHallGroup.create({
                data: {
                  courseId: newCourse.id,
                  hallGroupId: newHallGroupId
                }
              })
              stats.courseRelations++
            }
          }
        }

        // Connect student enrollments
        if (course.studentEnrollments && Array.isArray(course.studentEnrollments)) {
          for (const enrollment of course.studentEnrollments) {
            const newStudentId = studentIdMap.get(enrollment.studentId)
            if (newStudentId) {
              await prisma.courseStudentEnrollment.create({
                data: {
                  courseId: newCourse.id,
                  studentId: newStudentId
                }
              })
              stats.courseRelations++
            }
          }
        }

        // Connect student group enrollments
        if (course.studentGroupEnrollments && Array.isArray(course.studentGroupEnrollments)) {
          for (const enrollment of course.studentGroupEnrollments) {
            const newStudentGroupId = studentGroupIdMap.get(enrollment.studentGroupId)
            if (newStudentGroupId) {
              await prisma.courseStudentGroupEnrollment.create({
                data: {
                  courseId: newCourse.id,
                  studentGroupId: newStudentGroupId
                }
              })
              stats.courseRelations++
            }
          }
        }
      }
    }

    // Handle old format allocations (faculty-to-course assignments)
    if (data.allocations && Array.isArray(data.allocations)) {
      for (const alloc of data.allocations) {
        const newFacultyId = facultyIdMap.get(alloc.facultyId)
        const newCourseId = courseIdMap.get(alloc.courseId)
        
        if (newFacultyId && newCourseId) {
          // Connect faculty to course
          await prisma.course.update({
            where: { id: newCourseId },
            data: {
              compulsoryFaculties: {
                connect: { id: newFacultyId }
              }
            }
          })
          stats.courseRelations++
        }
      }
    }

    // Import group memberships
    if (data.studentGroupMemberships && Array.isArray(data.studentGroupMemberships)) {
      for (const membership of data.studentGroupMemberships) {
        const newStudentId = studentIdMap.get(membership.studentId)
        const newStudentGroupId = studentGroupIdMap.get(membership.studentGroupId)
        if (newStudentId && newStudentGroupId) {
          await prisma.studentGroupMembership.create({
            data: {
              studentId: newStudentId,
              studentGroupId: newStudentGroupId
            }
          })
          stats.memberships++
        }
      }
    }

    if (data.facultyGroupMemberships && Array.isArray(data.facultyGroupMemberships)) {
      for (const membership of data.facultyGroupMemberships) {
        const newFacultyId = facultyIdMap.get(membership.facultyId)
        const newFacultyGroupId = facultyGroupIdMap.get(membership.facultyGroupId)
        if (newFacultyId && newFacultyGroupId) {
          await prisma.facultyGroupMembership.create({
            data: {
              facultyId: newFacultyId,
              facultyGroupId: newFacultyGroupId
            }
          })
          stats.memberships++
        }
      }
    }

    if (data.hallGroupMemberships && Array.isArray(data.hallGroupMemberships)) {
      for (const membership of data.hallGroupMemberships) {
        const newHallId = hallIdMap.get(membership.hallId)
        const newHallGroupId = hallGroupIdMap.get(membership.hallGroupId)
        if (newHallId && newHallGroupId) {
          await prisma.hallGroupMembership.create({
            data: {
              hallId: newHallId,
              hallGroupId: newHallGroupId
            }
          })
          stats.memberships++
        }
      }
    }

    return NextResponse.json({ success: true, stats })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import data' },
      { status: 500 }
    )
  }
}
