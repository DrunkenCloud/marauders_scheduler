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
            timetable,
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

    // Import courses
    if (data.courses && Array.isArray(data.courses)) {
      for (const course of data.courses) {
        const courseType = course.courseType || 'theory'
        const courseName = course.name || course.courseName || 'Unnamed Course'
        const courseCode = course.code || course.courseCode || 'UNKNOWN'
        
        // Handle different course types
        if (courseType === 'lab') {
          // Create lab course (150 mins, 1 session)
          const labCourse = await prisma.course.create({
            data: {
              sessionId,
              name: courseName,
              code: courseCode,
              timetable: course.timetable || {},
              classDuration: 150,
              sessionsPerLecture: 1,
              totalSessions: 1,
              scheduledCount: 0
            }
          })
          courseIdMap.set(course.id, labCourse.id)
          courseIdMap.set(course.id + '_lab', labCourse.id)
          stats.courses++
          
          // Create theory course (50 mins, 1 session)
          const theoryCourse = await prisma.course.create({
            data: {
              sessionId,
              name: `${courseName} Theory`,
              code: `${courseCode}-T`,
              timetable: {},
              classDuration: 50,
              sessionsPerLecture: 1,
              totalSessions: 1,
              scheduledCount: 0
            }
          })
          courseIdMap.set(course.id + '_theory', theoryCourse.id)
          stats.courses++
          
          // Handle enrollments for both courses
          if (course.classId) {
            const newStudentGroupId = studentGroupIdMap.get(course.classId)
            if (newStudentGroupId) {
              await prisma.courseStudentGroupEnrollment.create({
                data: {
                  courseId: labCourse.id,
                  studentGroupId: newStudentGroupId
                }
              })
              await prisma.courseStudentGroupEnrollment.create({
                data: {
                  courseId: theoryCourse.id,
                  studentGroupId: newStudentGroupId
                }
              })
              stats.courseRelations += 2
            }
          }
          
          // Connect relationships for both courses
          await connectCourseRelationships(labCourse.id, course)
          await connectCourseRelationships(theoryCourse.id, course)
          
        } else if (courseType === 'lab_theory') {
          // Create lab+theory course (100 mins, 1 session)
          const labTheoryCourse = await prisma.course.create({
            data: {
              sessionId,
              name: courseName,
              code: courseCode,
              timetable: course.timetable || {},
              classDuration: 100,
              sessionsPerLecture: 1,
              totalSessions: 1,
              scheduledCount: 0
            }
          })
          courseIdMap.set(course.id, labTheoryCourse.id)
          courseIdMap.set(course.id + '_labtheory', labTheoryCourse.id)
          stats.courses++
          
          // Create theory course (50 mins, 1 session)
          const theoryCourse = await prisma.course.create({
            data: {
              sessionId,
              name: `${courseName} Theory`,
              code: `${courseCode}-T`,
              timetable: {},
              classDuration: 50,
              sessionsPerLecture: 1,
              totalSessions: course.hoursPerWeek - 2,
              scheduledCount: 0
            }
          })
          courseIdMap.set(course.id + '_theory', theoryCourse.id)
          stats.courses++
          
          // Handle enrollments for both courses
          if (course.classId) {
            const newStudentGroupId = studentGroupIdMap.get(course.classId)
            if (newStudentGroupId) {
              await prisma.courseStudentGroupEnrollment.create({
                data: {
                  courseId: labTheoryCourse.id,
                  studentGroupId: newStudentGroupId
                }
              })
              await prisma.courseStudentGroupEnrollment.create({
                data: {
                  courseId: theoryCourse.id,
                  studentGroupId: newStudentGroupId
                }
              })
              stats.courseRelations += 2
            }
          }
          
          // Connect relationships for both courses
          await connectCourseRelationships(labTheoryCourse.id, course)
          await connectCourseRelationships(theoryCourse.id, course)
          
        } else {
          // Regular course (theory, mtech_course, etc.)
          const newCourse = await prisma.course.create({
            data: {
              sessionId,
              name: courseName,
              code: courseCode,
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
          
          // Connect relationships
          await connectCourseRelationships(newCourse.id, course)
        }
      }
    }

    // Handle old format allocations (faculty-to-course assignments)
    if (data.allocations && Array.isArray(data.allocations)) {
      for (const alloc of data.allocations) {
        const newFacultyId = facultyIdMap.get(alloc.facultyId)
        
        // Get all possible course IDs (main, lab, theory variants)
        const courseIds = [
          courseIdMap.get(alloc.courseId),
          courseIdMap.get(alloc.courseId + '_lab'),
          courseIdMap.get(alloc.courseId + '_theory'),
          courseIdMap.get(alloc.courseId + '_labtheory')
        ].filter(Boolean)
        
        if (newFacultyId && courseIds.length > 0) {
          // Connect faculty to all course variants
          for (const courseId of courseIds) {
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
