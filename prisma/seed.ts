import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
const emptyTimetable = () => Object.fromEntries(DAYS.map(d => [d, []]))

// Place a slot into a timetable object (mutates)
function placeSlot(tt: any, day: string, slotNumber: number, slotSpan: number, entry: object) {
  tt[day].push({ slotNumber, slotSpan, ...entry })
}

async function main() {
  console.log('Seeding...')

  // ── Session ──────────────────────────────────────────────────────────────
  const session = await prisma.session.upsert({
    where: { name: 'Semester 1 — 2026' },
    update: {},
    create: { name: 'Semester 1 — 2026', details: 'Demo seed data' }
  })
  const sid = session.id

  // ── Halls ─────────────────────────────────────────────────────────────────
  const hallDefs = [
    { name: 'Lecture Hall A', Floor: '1', Building: 'Main Block', shortForm: 'LHA' },
    { name: 'Lecture Hall B', Floor: '1', Building: 'Main Block', shortForm: 'LHB' },
    { name: 'Lecture Hall C', Floor: '2', Building: 'Main Block', shortForm: 'LHC' },
    { name: 'Lab 1',          Floor: '1', Building: 'Science Block', shortForm: 'L1' },
    { name: 'Lab 2',          Floor: '1', Building: 'Science Block', shortForm: 'L2' },
    { name: 'Seminar Room 1', Floor: '3', Building: 'Main Block', shortForm: 'SR1' },
  ]

  const halls: any[] = []
  for (const h of hallDefs) {
    const hall = await prisma.hall.create({
      data: { ...h, timetable: emptyTimetable(), sessionId: sid }
    })
    halls.push(hall)
  }
  const [lha, lhb, lhc, lab1, lab2, sr1] = halls

  // ── Hall Groups ───────────────────────────────────────────────────────────
  const lectureHallGroup = await prisma.hallGroup.create({
    data: {
      groupName: 'Lecture Halls',
      timetable: emptyTimetable(),
      sessionId: sid,
      hallMemberships: { create: [{ hallId: lha.id }, { hallId: lhb.id }, { hallId: lhc.id }] }
    }
  })
  const labGroup = await prisma.hallGroup.create({
    data: {
      groupName: 'Labs',
      timetable: emptyTimetable(),
      sessionId: sid,
      hallMemberships: { create: [{ hallId: lab1.id }, { hallId: lab2.id }] }
    }
  })

  // ── Faculty ───────────────────────────────────────────────────────────────
  const facultyDefs = [
    { name: 'Dr. Alice Rahman',   shortForm: 'AR' },
    { name: 'Prof. Bob Karim',    shortForm: 'BK' },
    { name: 'Dr. Carol Hossain',  shortForm: 'CH' },
    { name: 'Mr. David Islam',    shortForm: 'DI' },
    { name: 'Ms. Eva Chowdhury',  shortForm: 'EC' },
    { name: 'Dr. Farhan Uddin',   shortForm: 'FU' },
  ]

  const faculties: any[] = []
  for (const f of facultyDefs) {
    const fac = await prisma.faculty.create({
      data: { ...f, timetable: emptyTimetable(), sessionId: sid }
    })
    faculties.push(fac)
  }
  const [ar, bk, ch, di, ec, fu] = faculties

  // ── Faculty Groups ────────────────────────────────────────────────────────
  const csFacultyGroup = await prisma.facultyGroup.create({
    data: {
      groupName: 'CS Faculty',
      timetable: emptyTimetable(),
      sessionId: sid,
      facultyMemberships: { create: [{ facultyId: ar.id }, { facultyId: bk.id }, { facultyId: ch.id }] }
    }
  })

  // ── Student Groups (classes) ──────────────────────────────────────────────
  const groupDefs = [
    'CS-Y2-A', 'CS-Y2-B', 'CS-Y3-A', 'CS-Y3-B', 'EE-Y2-A', 'EE-Y3-A'
  ]
  const studentGroups: any[] = []
  for (const name of groupDefs) {
    const sg = await prisma.studentGroup.create({
      data: { groupName: name, timetable: emptyTimetable(), sessionId: sid }
    })
    studentGroups.push(sg)
  }
  const [csY2A, csY2B, csY3A, csY3B, eeY2A, eeY3A] = studentGroups

  // ── Students ──────────────────────────────────────────────────────────────
  // 8 students per group, digitalIds 1001–1048
  let digitalId = 1001
  const groupStudents: Record<string, any[]> = {}
  for (const sg of studentGroups) {
    groupStudents[sg.id] = []
    for (let i = 0; i < 8; i++) {
      const student = await prisma.student.create({
        data: { digitalId: digitalId++, timetable: emptyTimetable(), sessionId: sid }
      })
      await prisma.studentGroupMembership.create({
        data: { studentId: student.id, studentGroupId: sg.id }
      })
      groupStudents[sg.id].push(student)
    }
  }

  // ── Courses ───────────────────────────────────────────────────────────────
  // Format: { code, name, duration, sessionsPerLecture, totalSessions, faculty, halls, studentGroups, scheduledCount }
  const courseDefs = [
    // CS Year 2
    {
      code: 'CS201', name: 'Data Structures',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 4,
      facultyIds: [ar.id], hallIds: [lha.id], sgIds: [csY2A.id, csY2B.id],
      scheduledCount: 2  // partially scheduled
    },
    {
      code: 'CS202', name: 'Algorithms',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 3,
      facultyIds: [bk.id], hallIds: [lhb.id], sgIds: [csY2A.id, csY2B.id],
      scheduledCount: 0  // unscheduled
    },
    {
      code: 'CS203', name: 'Computer Networks',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 3,
      facultyIds: [ch.id], hallIds: [lhc.id], sgIds: [csY2A.id],
      scheduledCount: 3  // fully scheduled
    },
    {
      code: 'CS204', name: 'Database Systems Lab',
      classDuration: 100, sessionsPerLecture: 2, totalSessions: 2,
      facultyIds: [di.id], hallIds: [lab1.id], sgIds: [csY2B.id],
      scheduledCount: 0  // unscheduled lab
    },
    // CS Year 3
    {
      code: 'CS301', name: 'Operating Systems',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 4,
      facultyIds: [ar.id], hallIds: [lha.id], sgIds: [csY3A.id, csY3B.id],
      scheduledCount: 1  // partially scheduled
    },
    {
      code: 'CS302', name: 'Software Engineering',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 3,
      facultyIds: [ec.id], hallIds: [lhb.id], sgIds: [csY3A.id],
      scheduledCount: 0  // unscheduled
    },
    {
      code: 'CS303', name: 'Machine Learning',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 3,
      facultyIds: [fu.id], hallIds: [lhc.id], sgIds: [csY3B.id],
      scheduledCount: 0  // unscheduled
    },
    {
      code: 'CS304', name: 'AI Lab',
      classDuration: 100, sessionsPerLecture: 2, totalSessions: 2,
      facultyIds: [fu.id], hallIds: [lab2.id], sgIds: [csY3A.id, csY3B.id],
      scheduledCount: 0  // unscheduled lab
    },
    // EE Year 2
    {
      code: 'EE201', name: 'Circuit Theory',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 4,
      facultyIds: [bk.id], hallIds: [sr1.id], sgIds: [eeY2A.id],
      scheduledCount: 2  // partially scheduled
    },
    {
      code: 'EE202', name: 'Electronics Lab',
      classDuration: 100, sessionsPerLecture: 2, totalSessions: 2,
      facultyIds: [di.id], hallIds: [lab1.id], sgIds: [eeY2A.id],
      scheduledCount: 0  // unscheduled
    },
    // EE Year 3
    {
      code: 'EE301', name: 'Digital Signal Processing',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 3,
      facultyIds: [ch.id], hallIds: [lhb.id], sgIds: [eeY3A.id],
      scheduledCount: 0  // unscheduled
    },
    {
      code: 'EE302', name: 'Power Systems',
      classDuration: 50, sessionsPerLecture: 1, totalSessions: 3,
      facultyIds: [ec.id], hallIds: [lha.id], sgIds: [eeY3A.id],
      scheduledCount: 3  // fully scheduled
    },
  ]

  const courses: any[] = []
  for (const c of courseDefs) {
    const course = await prisma.course.create({
      data: {
        code: c.code,
        name: c.name,
        classDuration: c.classDuration,
        sessionsPerLecture: c.sessionsPerLecture,
        totalSessions: c.totalSessions,
        scheduledCount: c.scheduledCount,
        timetable: emptyTimetable(),
        sessionId: sid,
        compulsoryFaculties: { connect: c.facultyIds.map(id => ({ id })) },
        compulsoryHalls:     { connect: c.hallIds.map(id => ({ id })) },
        studentGroupEnrollments: {
          create: c.sgIds.map(studentGroupId => ({ studentGroupId }))
        }
      }
    })
    courses.push({ ...course, def: c })
  }

  // ── Pre-place slots for partially/fully scheduled courses ─────────────────
  // CS201 — 2 of 4 scheduled: Monday slot 0, Wednesday slot 1
  // CS203 — 3 of 3 scheduled: Mon slot 2, Wed slot 2, Fri slot 2
  // CS301 — 1 of 4 scheduled: Tuesday slot 0
  // EE201 — 2 of 4 scheduled: Monday slot 3, Thursday slot 3
  // EE302 — 3 of 3 scheduled: Tue slot 1, Thu slot 1, Fri slot 1

  const cs201 = courses.find(c => c.code === 'CS201')
  const cs203 = courses.find(c => c.code === 'CS203')
  const cs301 = courses.find(c => c.code === 'CS301')
  const ee201 = courses.find(c => c.code === 'EE201')
  const ee302 = courses.find(c => c.code === 'EE302')

  // Build a lookup: studentGroupId → student ids
  const ttPatches: Record<string, any> = {}
  const getOrInit = (id: string) => {
    if (!ttPatches[id]) ttPatches[id] = emptyTimetable()
    return ttPatches[id]
  }

  // Build a lookup: studentGroupId → student ids
  const sgMemberIds: Record<string, string[]> = {}
  for (const sg of studentGroups) {
    sgMemberIds[sg.id] = groupStudents[sg.id].map((s: any) => s.id)
  }

  const scheduleSlot = (courseId: string, courseCode: string, day: string, slotNumber: number, slotSpan: number, facultyIds: string[], hallIds: string[], sgIds: string[]) => {
    // Expand student group members
    const studentIds = sgIds.flatMap(id => sgMemberIds[id] || [])

    const slotEntry = {
      type: 'course', courseId, courseCode, slotNumber, slotSpan,
      facultyIds, hallIds, hallGroupIds: [], facultyGroupIds: [],
      studentIds, studentGroupIds: sgIds
    }

    // All entity types that get this slot written
    const allIds = [...facultyIds, ...hallIds, ...sgIds, ...studentIds, courseId]
    for (const id of allIds) {
      placeSlot(getOrInit(id), day, slotNumber, slotSpan, slotEntry)
    }
  }

  // CS201 slots
  scheduleSlot(cs201.id, 'CS201', 'Monday',    0, 1, [ar.id], [lha.id], [csY2A.id, csY2B.id])
  scheduleSlot(cs201.id, 'CS201', 'Wednesday', 1, 1, [ar.id], [lha.id], [csY2A.id, csY2B.id])
  // CS203 slots
  scheduleSlot(cs203.id, 'CS203', 'Monday',    2, 1, [ch.id], [lhc.id], [csY2A.id])
  scheduleSlot(cs203.id, 'CS203', 'Wednesday', 2, 1, [ch.id], [lhc.id], [csY2A.id])
  scheduleSlot(cs203.id, 'CS203', 'Friday',    2, 1, [ch.id], [lhc.id], [csY2A.id])
  // CS301 slots
  scheduleSlot(cs301.id, 'CS301', 'Tuesday',   0, 1, [ar.id], [lha.id], [csY3A.id, csY3B.id])
  // EE201 slots
  scheduleSlot(ee201.id, 'EE201', 'Monday',    3, 1, [bk.id], [sr1.id], [eeY2A.id])
  scheduleSlot(ee201.id, 'EE201', 'Thursday',  3, 1, [bk.id], [sr1.id], [eeY2A.id])
  // EE302 slots
  scheduleSlot(ee302.id, 'EE302', 'Tuesday',   1, 1, [ec.id], [lha.id], [eeY3A.id])
  scheduleSlot(ee302.id, 'EE302', 'Thursday',  1, 1, [ec.id], [lha.id], [eeY3A.id])
  scheduleSlot(ee302.id, 'EE302', 'Friday',    1, 1, [ec.id], [lha.id], [eeY3A.id])

  // ── Persist timetable patches ─────────────────────────────────────────────
  const facultyIds = faculties.map(f => f.id)
  const hallIds    = halls.map(h => h.id)
  const sgIds      = studentGroups.map(g => g.id)
  const courseIds  = courses.map(c => c.id)
  // Collect all student ids
  const allStudentIds = Object.values(groupStudents).flat().map((s: any) => s.id)

  for (const [id, tt] of Object.entries(ttPatches)) {
    if (facultyIds.includes(id))        await prisma.faculty.update({ where: { id }, data: { timetable: tt } })
    else if (hallIds.includes(id))      await prisma.hall.update({ where: { id }, data: { timetable: tt } })
    else if (sgIds.includes(id))        await prisma.studentGroup.update({ where: { id }, data: { timetable: tt } })
    else if (courseIds.includes(id))    await prisma.course.update({ where: { id }, data: { timetable: tt } })
    else if (allStudentIds.includes(id)) await prisma.student.update({ where: { id }, data: { timetable: tt } })
  }

  console.log(`✓ Session:        ${session.name}`)
  console.log(`✓ Halls:          ${halls.length}`)
  console.log(`✓ Hall groups:    2`)
  console.log(`✓ Faculty:        ${faculties.length}`)
  console.log(`✓ Faculty groups: 1`)
  console.log(`✓ Student groups: ${studentGroups.length}`)
  console.log(`✓ Students:       ${studentGroups.length * 8}`)
  console.log(`✓ Courses:        ${courses.length} (${courses.filter(c => c.scheduledCount === 0).length} unscheduled, ${courses.filter(c => c.scheduledCount > 0 && c.scheduledCount < c.totalSessions).length} partial, ${courses.filter(c => c.scheduledCount === c.totalSessions).length} full)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
