import { PrismaClient, Student, Faculty, Hall, Course } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Drop all existing data
  console.log('🗑️  Dropping all existing data...')
  await prisma.courseStudentGroupEnrollment.deleteMany()
  await prisma.courseStudentEnrollment.deleteMany()
  await prisma.compulsoryHallGroup.deleteMany()
  await prisma.compulsoryFacultyGroup.deleteMany()
  await prisma.studentGroupMembership.deleteMany()
  await prisma.hallGroupMembership.deleteMany()
  await prisma.facultyGroupMembership.deleteMany()
  await prisma.course.deleteMany()
  await prisma.student.deleteMany()
  await prisma.faculty.deleteMany()
  await prisma.hall.deleteMany()
  await prisma.studentGroup.deleteMany()
  await prisma.facultyGroup.deleteMany()
  await prisma.hallGroup.deleteMany()
  await prisma.session.deleteMany()

  // Create session
  console.log('📅 Creating session...')
  const session = await prisma.session.create({
    data: {
      name: 'Spring 2025',
      details: 'Spring semester 2025 - Seeded data for testing'
    }
  })

  // Create 60 students with break slots
  console.log('👥 Creating 60 students with break slots...')
  const students: Student[] = []

  // Define break slots for all students
  const breakSlots = [
    {
      type: 'blocker',
      startHour: 10,
      startMinute: 40,
      duration: 20,
      blockerReason: '20 min Break'
    },
    {
      type: 'blocker',
      startHour: 11,
      startMinute: 50,
      duration: 60,
      blockerReason: 'Lunch Break'
    },
    {
      type: 'blocker',
      startHour: 13,
      startMinute: 40,
      duration: 10,
      blockerReason: '10 min Break'
    }
  ]

  for (let i = 1; i <= 60; i++) {
    const student = await prisma.student.create({
      data: {
        digitalId: 2025000 + i,
        sessionId: session.id,
        timetable: {
          Monday: [...breakSlots],
          Tuesday: [...breakSlots],
          Wednesday: [...breakSlots],
          Thursday: [...breakSlots],
          Friday: [...breakSlots]
        },
        startHour: 8,
        startMinute: 10,
        endHour: 15,
        endMinute: 30
      }
    })
    students.push(student)
  }

  // Create student group with break slots
  console.log('👥 Creating student group with break slots...')
  const studentGroup = await prisma.studentGroup.create({
    data: {
      groupName: 'All Students Group',
      sessionId: session.id,
      timetable: {
        Monday: [...breakSlots],
        Tuesday: [...breakSlots],
        Wednesday: [...breakSlots],
        Thursday: [...breakSlots],
        Friday: [...breakSlots]
      },
      startHour: 8,
      startMinute: 10,
      endHour: 15,
      endMinute: 30
    }
  })

  // Add all students to the group
  console.log('🔗 Adding students to group...')
  for (const student of students) {
    await prisma.studentGroupMembership.create({
      data: {
        studentId: student.id,
        studentGroupId: studentGroup.id
      }
    })
  }

  // Create 6 faculty members
  console.log('👨‍🏫 Creating 6 faculty members...')
  const faculties: Faculty[] = []
  const facultyNames = [
    { name: 'Dr. Alice Johnson', shortForm: 'AJ' },
    { name: 'Prof. Bob Smith', shortForm: 'BS' },
    { name: 'Dr. Carol Davis', shortForm: 'CD' },
    { name: 'Prof. David Wilson', shortForm: 'DW' },
    { name: 'Dr. Emma Brown', shortForm: 'EB' },
    { name: 'Prof. Frank Miller', shortForm: 'FM' }
  ]

  for (const facultyData of facultyNames) {
    const faculty = await prisma.faculty.create({
      data: {
        name: facultyData.name,
        shortForm: facultyData.shortForm,
        sessionId: session.id,
        timetable: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: []
        },
        startHour: 8,
        startMinute: 10,
        endHour: 17,
        endMinute: 0
      }
    })
    faculties.push(faculty)
  }

  // Create 5 halls
  console.log('🏢 Creating 5 halls...')
  const halls: Hall[] = []
  const hallData = [
    { name: 'Lecture Hall A', floor: 'Ground Floor', building: 'Main Building', shortForm: 'LHA' },
    { name: 'Lecture Hall B', floor: 'First Floor', building: 'Main Building', shortForm: 'LHB' },
    { name: 'Computer Lab 1', floor: 'Second Floor', building: 'Tech Building', shortForm: 'CL1' },
    { name: 'Computer Lab 2', floor: 'Second Floor', building: 'Tech Building', shortForm: 'CL2' },
    { name: 'Seminar Room', floor: 'Third Floor', building: 'Academic Block', shortForm: 'SR' }
  ]

  for (const hallInfo of hallData) {
    const hall = await prisma.hall.create({
      data: {
        name: hallInfo.name,
        Floor: hallInfo.floor,
        Building: hallInfo.building,
        shortForm: hallInfo.shortForm,
        sessionId: session.id,
        timetable: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: []
        },
        startHour: 8,
        startMinute: 10,
        endHour: 20,
        endMinute: 0
      }
    })
    halls.push(hall)
  }

  // Create 8 courses
  console.log('📚 Creating 8 courses...')
  const courses: Course[] = []

  // 6 courses with 1 session per lecture (50 min duration)
  const singleSessionCourses = [
    { name: 'Introduction to Computer Science', code: 'CS101' },
    { name: 'Calculus I', code: 'MATH101' },
    { name: 'Physics I', code: 'PHYS101' },
    { name: 'English Composition', code: 'ENG101' },
    { name: 'Chemistry I', code: 'CHEM101' },
    { name: 'Statistics', code: 'STAT101' }
  ]

  for (let i = 0; i < singleSessionCourses.length; i++) {
    const courseData = singleSessionCourses[i]
    const course = await prisma.course.create({
      data: {
        name: courseData.name,
        code: courseData.code,
        sessionId: session.id,
        timetable: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: []
        },
        classDuration: 50,
        sessionsPerLecture: 1,
        totalSessions: 3,
        scheduledCount: 0
      }
    })
    courses.push(course)

    // Assign faculty (one faculty per course for first 6 courses)
    await prisma.course.update({
      where: { id: course.id },
      data: {
        compulsoryFaculties: {
          connect: { id: faculties[i].id }
        }
      }
    })

    // Assign hall (one hall per course for first 5 courses, reuse last hall for 6th course)
    const hallIndex = i < 5 ? i : 4
    await prisma.course.update({
      where: { id: course.id },
      data: {
        compulsoryHalls: {
          connect: { id: halls[hallIndex].id }
        }
      }
    })

    // Enroll student group in course
    await prisma.courseStudentGroupEnrollment.create({
      data: {
        courseId: course.id,
        studentGroupId: studentGroup.id
      }
    })
  }

  // 2 courses with 3 sessions per lecture (50 min duration each)
  const multiSessionCourses = [
    { name: 'Advanced Programming Lab', code: 'CS301' },
    { name: 'Research Methods', code: 'RES401' }
  ]

  for (let i = 0; i < multiSessionCourses.length; i++) {
    const courseData = multiSessionCourses[i]
    const course = await prisma.course.create({
      data: {
        name: courseData.name,
        code: courseData.code,
        sessionId: session.id,
        timetable: {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: []
        },
        classDuration: 50,
        sessionsPerLecture: 3,
        totalSessions: 3,
        scheduledCount: 0
      }
    })
    courses.push(course)

    // Assign faculty (use last 2 faculty members for these courses)
    const facultyIndex = 4 + i // Faculty indices 4 and 5
    await prisma.course.update({
      where: { id: course.id },
      data: {
        compulsoryFaculties: {
          connect: { id: faculties[facultyIndex].id }
        }
      }
    })

    // Assign halls (2 halls for each multi-session course)
    if (i === 0) {
      // First multi-session course gets halls 0 and 1
      await prisma.course.update({
        where: { id: course.id },
        data: {
          compulsoryHalls: {
            connect: [
              { id: halls[0].id },
              { id: halls[1].id }
            ]
          }
        }
      })
    } else {
      // Second multi-session course gets halls 2 and 3
      await prisma.course.update({
        where: { id: course.id },
        data: {
          compulsoryHalls: {
            connect: [
              { id: halls[2].id },
              { id: halls[3].id }
            ]
          }
        }
      })
    }

    // Enroll student group in course
    await prisma.courseStudentGroupEnrollment.create({
      data: {
        courseId: course.id,
        studentGroupId: studentGroup.id
      }
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log(`📊 Created:`)
  console.log(`   - 1 session: ${session.name}`)
  console.log(`   - 60 students (IDs: 2025001-2025060)`)
  console.log(`   - 1 student group with all students`)
  console.log(`   - 6 faculty members`)
  console.log(`   - 5 halls`)
  console.log(`   - 8 courses:`)
  console.log(`     • 6 single-session courses (1 session per lecture, 50 min)`)
  console.log(`     • 2 multi-session courses (3 sessions per lecture, 50 min each)`)
  console.log(`   - Course-faculty assignments (1:1 for single-session, 1:1 for multi-session)`)
  console.log(`   - Course-hall assignments (1:1 for single-session, 1:2 for multi-session)`)
  console.log(`   - All students enrolled in all courses via student group`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })