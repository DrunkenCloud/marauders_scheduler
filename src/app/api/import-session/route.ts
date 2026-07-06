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

    // Import student groups (handle both 'studentGroups' and 'classes' from old format)
    const studentGroupsData = data.studentGroups || data.classes || []
    if (Array.isArray(studentGroupsData)) {
      for (const group of studentGroupsData) {
        // Handle old format where classes have year, class, section
        const groupName = group.groupName || 
                         (group.year && group.class && group.section 
                           ? `Year ${group.year} ${group.class} ${group.section}` 
                           : 'Unnamed Group')
        
        // Determine if this is a first year group
        const year = group.year || 1
        const isFirstYear = year === 1
        
        // Create base timetable with blockers
        const timetable: any = group.timetable || {}
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        
        // Initialize days if not present
        days.forEach(day => {
          if (!timetable[day]) {
            timetable[day] = []
          }
        })
        
        // // Add blockers based on year
        // if (isFirstYear) {
        //   // First year blockers
        //   days.forEach(day => {
        //     // Lunch break from 11:50 for 1 hour
        //     timetable[day].push({
        //       type: 'blocker',
        //       startHour: 11,
        //       startMinute: 50,
        //       duration: 60,
        //       blockerReason: 'Lunch Break'
        //     })
            
        //     // // Break from 9:50 for 20 mins
        //     // timetable[day].push({
        //     //   type: 'blocker',
        //     //   startHour: 9,
        //     //   startMinute: 50,
        //     //   duration: 20,
        //     //   blockerReason: 'Break'
        //     // })
            
        //     // Break from 2:30 for 10 mins
        //     timetable[day].push({
        //       type: 'blocker',
        //       startHour: 14,
        //       startMinute: 30,
        //       duration: 10,
        //       blockerReason: 'Break'
        //     })
        //   })
          
        //   // Monday: EAA blockers
        //   timetable['Monday'].push({
        //     type: 'blocker',
        //     startHour: 13,
        //     startMinute: 40,
        //     duration: 50,
        //     blockerReason: 'EAA'
        //   })
        //   timetable['Monday'].push({
        //     type: 'blocker',
        //     startHour: 14,
        //     startMinute: 40,
        //     duration: 50,
        //     blockerReason: 'EAA'
        //   })
          
        //   // Wednesday: Self Learning blockers
        //   timetable['Wednesday'].push({
        //     type: 'blocker',
        //     startHour: 13,
        //     startMinute: 40,
        //     duration: 50,
        //     blockerReason: 'Self Learning'
        //   })
        //   timetable['Wednesday'].push({
        //     type: 'blocker',
        //     startHour: 12,
        //     startMinute: 50,
        //     duration: 50,
        //     blockerReason: 'Self Learning'
        //   })
        //   timetable['Wednesday'].push({
        //     type: 'blocker',
        //     startHour: 14,
        //     startMinute: 40,
        //     duration: 50,
        //     blockerReason: 'Self Learning'
        //   })
        // } else {
        //   // // Other years blockers
        //   days.forEach(day => {
        //     // Lunch break from 12:40 for 1 hour
        //     timetable[day].push({
        //       type: 'blocker',
        //       startHour: 12,
        //       startMinute: 40,
        //       duration: 60,
        //       blockerReason: 'Lunch Break'
        //     })
            
        //     // Break from 10:40 for 20 mins
        //     timetable[day].push({
        //       type: 'blocker',
        //       startHour: 10,
        //       startMinute: 40,
        //       duration: 20,
        //       blockerReason: 'Break'
        //     })
            
        //     // Break from 2:30 for 10 mins
        //     timetable[day].push({
        //       type: 'blocker',
        //       startHour: 14,
        //       startMinute: 30,
        //       duration: 10,
        //       blockerReason: 'Break'
        //     })
        //   })
          
        //   // Wednesday: Self Learning blockers
        //   timetable['Wednesday'].push({
        //     type: 'blocker',
        //     startHour: 13,
        //     startMinute: 40,
        //     duration: 50,
        //     blockerReason: 'Self Learning'
        //   })
        //   timetable['Wednesday'].push({
        //     type: 'blocker',
        //     startHour: 14,
        //     startMinute: 40,
        //     duration: 50,
        //     blockerReason: 'Self Learning'
        //   })
        //   timetable['Wednesday'].push({
        //     type: 'blocker',
        //     startHour: 11,
        //     startMinute: 50,
        //     duration: 50,
        //     blockerReason: 'Self Learning'
        //   })
        // }
        
        const newGroup = await prisma.studentGroup.create({
          data: {
            sessionId,
            groupName,
            timetable
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
            timetable: student.timetable || {}
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
            timetable: fac.timetable || {}
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
            timetable: group.timetable || {}
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
            timetable: hall.timetable || {}
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
            timetable: group.timetable || {}
          }
        })
        hallGroupIdMap.set(group.id, newGroup.id)
        stats.hallGroups++
      }
    }

    // Helper function to connect course relationships
    const connectCourseRelationships = async (courseId: string, sourceCourse: any) => {
      // Connect compulsory faculties
      if (sourceCourse.compulsoryFaculties && Array.isArray(sourceCourse.compulsoryFaculties)) {
        for (const fac of sourceCourse.compulsoryFaculties) {
          const newFacultyId = facultyIdMap.get(fac.id)
          if (newFacultyId) {
            await prisma.course.update({
              where: { id: courseId },
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
      if (sourceCourse.compulsoryHalls && Array.isArray(sourceCourse.compulsoryHalls)) {
        for (const hall of sourceCourse.compulsoryHalls) {
          const newHallId = hallIdMap.get(hall.id)
          if (newHallId) {
            await prisma.course.update({
              where: { id: courseId },
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
      if (sourceCourse.compulsoryFacultyGroups && Array.isArray(sourceCourse.compulsoryFacultyGroups)) {
        for (const fg of sourceCourse.compulsoryFacultyGroups) {
          const newFacultyGroupId = facultyGroupIdMap.get(fg.facultyGroupId)
          if (newFacultyGroupId) {
            await prisma.compulsoryFacultyGroup.create({
              data: {
                courseId,
                facultyGroupId: newFacultyGroupId
              }
            })
            stats.courseRelations++
          }
        }
      }

      // Connect hall groups
      if (sourceCourse.compulsoryHallGroups && Array.isArray(sourceCourse.compulsoryHallGroups)) {
        for (const hg of sourceCourse.compulsoryHallGroups) {
          const newHallGroupId = hallGroupIdMap.get(hg.hallGroupId)
          if (newHallGroupId) {
            await prisma.compulsoryHallGroup.create({
              data: {
                courseId,
                hallGroupId: newHallGroupId
              }
            })
            stats.courseRelations++
          }
        }
      }

      // Connect student enrollments
      if (sourceCourse.studentEnrollments && Array.isArray(sourceCourse.studentEnrollments)) {
        for (const enrollment of sourceCourse.studentEnrollments) {
          const newStudentId = studentIdMap.get(enrollment.studentId)
          if (newStudentId) {
            await prisma.courseStudentEnrollment.create({
              data: {
                courseId,
                studentId: newStudentId
              }
            })
            stats.courseRelations++
          }
        }
      }

      // Connect student group enrollments
      if (sourceCourse.studentGroupEnrollments && Array.isArray(sourceCourse.studentGroupEnrollments)) {
        for (const enrollment of sourceCourse.studentGroupEnrollments) {
          const newStudentGroupId = studentGroupIdMap.get(enrollment.studentGroupId)
          if (newStudentGroupId) {
            await prisma.courseStudentGroupEnrollment.create({
              data: {
                courseId,
                studentGroupId: newStudentGroupId
              }
            })
            stats.courseRelations++
          }
        }
      }
    }

    // Import courses. A course serves a LIST of classes that attend as one combined
    // session (proff_choosing sends one class; a marauders re-export can send several
    // after a manual split) — so it's a single scheduler course enrolling all its
    // classes, not one course per class. Lab / lab_theory still split into a practical
    // + a "-T" theory course, each enrolling the same class list.
    // offeringMap: sourceCourseId -> created marauders course ids (variants)
    const offeringMap = new Map<string, string[]>()

    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        const courseType = course.courseType || 'theory'
        const courseName = course.name || course.courseName || 'Unnamed Course'
        const courseCode = course.code || course.courseCode || 'UNKNOWN'
        // Enrolled classes as a list. Marauders self-export instead carries them in
        // embedded studentGroupEnrollments, which connectCourseRelationships wires.
        const classIds: string[] =
          Array.isArray(course.classIds) ? course.classIds.filter(Boolean)
          : course.classId ? [course.classId]
          : []

        const created: string[] = []
        const make = async (fields: any) => {
          const c = await prisma.course.create({
            data: { sessionId, timetable: course.timetable || {}, scheduledCount: course.scheduledCount || 0, ...fields }
          })
          created.push(c.id)
          stats.courses++
          for (const classId of classIds) {
            const newStudentGroupId = studentGroupIdMap.get(classId)
            if (newStudentGroupId) {
              await prisma.courseStudentGroupEnrollment.create({ data: { courseId: c.id, studentGroupId: newStudentGroupId } })
              stats.courseRelations++
            }
          }
          await connectCourseRelationships(c.id, course)
        }

        if (courseType === 'lab') {
          await make({ name: courseName, code: courseCode, classDuration: 150, sessionsPerLecture: 1, totalSessions: 1 })
          await make({ name: `${courseName} Theory`, code: `${courseCode}-T`, classDuration: 50, sessionsPerLecture: 1, totalSessions: 1 })
        } else if (courseType === 'lab_theory') {
          await make({ name: courseName, code: courseCode, classDuration: 100, sessionsPerLecture: 1, totalSessions: 1 })
          await make({ name: `${courseName} Theory`, code: `${courseCode}-T`, classDuration: 50, sessionsPerLecture: 1, totalSessions: (course.hoursPerWeek || 3) - 2 })
        } else {
          await make({ name: courseName, code: courseCode, classDuration: course.classDuration || 50, sessionsPerLecture: course.sessionsPerLecture || 1, totalSessions: course.totalSessions || course.hoursPerWeek || 3 })
        }

        offeringMap.set(course.id, [...(offeringMap.get(course.id) || []), ...created])
      }
    }

    // Allocations attach a faculty to a course. Since all a course's classes share one
    // combined session, connect the faculty to that course's variants (lab + theory).
    if (data.allocations && Array.isArray(data.allocations)) {
      for (const alloc of data.allocations) {
        const newFacultyId = facultyIdMap.get(alloc.facultyId)
        if (!newFacultyId) continue

        for (const courseId of offeringMap.get(alloc.courseId) || []) {
          await prisma.course.update({
            where: { id: courseId },
            data: { compulsoryFaculties: { connect: { id: newFacultyId } } }
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
