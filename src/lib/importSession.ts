import { prisma } from './prisma'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export interface ImportStats {
  studentGroups: number
  students: number
  faculty: number
  facultyGroups: number
  halls: number
  hallGroups: number
  courses: number
  memberships: number
  courseRelations: number
}

// Shared across a single import call. For a merge (multiple files into one session),
// the same ctx is reused so entities that recur by source id are imported once.
export interface ImportContext {
  stats: ImportStats
  studentGroupIdMap: Map<string, string>
  studentIdMap: Map<string, string>
  facultyIdMap: Map<string, string>
  facultyGroupIdMap: Map<string, string>
  hallIdMap: Map<string, string>
  hallGroupIdMap: Map<string, string>
}

export function newImportContext(): ImportContext {
  return {
    stats: { studentGroups: 0, students: 0, faculty: 0, facultyGroups: 0, halls: 0, hallGroups: 0, courses: 0, memberships: 0, courseRelations: 0 },
    studentGroupIdMap: new Map(),
    studentIdMap: new Map(),
    facultyIdMap: new Map(),
    facultyGroupIdMap: new Map(),
    hallIdMap: new Map(),
    hallGroupIdMap: new Map(),
  }
}

/**
 * Import one exported dump into `sessionId`, reusing `ctx` so repeated calls (merge)
 * dedup shared entities (faculty, classes, halls, groups, students) by their source id:
 * if an id was already imported, the existing row is reused instead of duplicated.
 * Courses are always created (kept separate per file) and allocations attach to the
 * course's own file — nothing is merged across files.
 */
export async function importDumpInto(sessionId: string, data: any, ctx: ImportContext): Promise<void> {
  const { stats, studentGroupIdMap, studentIdMap, facultyIdMap, facultyGroupIdMap, hallIdMap, hallGroupIdMap } = ctx

  // Student groups (accepts new 'studentGroups' or legacy 'classes')
  const studentGroupsData = data.studentGroups || data.classes || []
  if (Array.isArray(studentGroupsData)) {
    for (const group of studentGroupsData) {
      if (studentGroupIdMap.has(group.id)) continue
      const groupName = group.groupName ||
        (group.year && group.class && group.section
          ? `Year ${group.year} ${group.class} ${group.section}`
          : 'Unnamed Group')

      const timetable: any = group.timetable || {}
      DAYS.forEach(day => { if (!timetable[day]) timetable[day] = [] })

      const newGroup = await prisma.studentGroup.create({ data: { sessionId, groupName, timetable } })
      studentGroupIdMap.set(group.id, newGroup.id)
      stats.studentGroups++
    }
  }

  // Students
  if (Array.isArray(data.students)) {
    for (const student of data.students) {
      if (studentIdMap.has(student.id)) continue
      const newStudent = await prisma.student.create({
        data: { sessionId, digitalId: student.digitalId, timetable: student.timetable || {} }
      })
      studentIdMap.set(student.id, newStudent.id)
      stats.students++
    }
  }

  // Faculty
  if (Array.isArray(data.faculty)) {
    for (const fac of data.faculty) {
      if (facultyIdMap.has(fac.id)) continue
      const newFaculty = await prisma.faculty.create({
        data: { sessionId, name: fac.name, shortForm: fac.shortForm, timetable: fac.timetable || {} }
      })
      facultyIdMap.set(fac.id, newFaculty.id)
      stats.faculty++
    }
  }

  // Faculty groups
  if (Array.isArray(data.facultyGroups)) {
    for (const group of data.facultyGroups) {
      if (facultyGroupIdMap.has(group.id)) continue
      const newGroup = await prisma.facultyGroup.create({
        data: { sessionId, groupName: group.groupName, timetable: group.timetable || {} }
      })
      facultyGroupIdMap.set(group.id, newGroup.id)
      stats.facultyGroups++
    }
  }

  // Halls
  if (Array.isArray(data.halls)) {
    for (const hall of data.halls) {
      if (hallIdMap.has(hall.id)) continue
      const newHall = await prisma.hall.create({
        data: { sessionId, name: hall.name, Floor: hall.Floor || '', Building: hall.Building || '', shortForm: hall.shortForm, timetable: hall.timetable || {} }
      })
      hallIdMap.set(hall.id, newHall.id)
      stats.halls++
    }
  }

  // Hall groups
  if (Array.isArray(data.hallGroups)) {
    for (const group of data.hallGroups) {
      if (hallGroupIdMap.has(group.id)) continue
      const newGroup = await prisma.hallGroup.create({
        data: { sessionId, groupName: group.groupName, timetable: group.timetable || {} }
      })
      hallGroupIdMap.set(group.id, newGroup.id)
      stats.hallGroups++
    }
  }

  // Wire a course's embedded relations (present in marauders self-export dumps).
  const connectCourseRelationships = async (courseId: string, sourceCourse: any) => {
    for (const fac of sourceCourse.compulsoryFaculties ?? []) {
      const id = facultyIdMap.get(fac.id)
      if (id) { await prisma.course.update({ where: { id: courseId }, data: { compulsoryFaculties: { connect: { id } } } }); stats.courseRelations++ }
    }
    for (const hall of sourceCourse.compulsoryHalls ?? []) {
      const id = hallIdMap.get(hall.id)
      if (id) { await prisma.course.update({ where: { id: courseId }, data: { compulsoryHalls: { connect: { id } } } }); stats.courseRelations++ }
    }
    for (const fg of sourceCourse.compulsoryFacultyGroups ?? []) {
      const id = facultyGroupIdMap.get(fg.facultyGroupId)
      if (id) { await prisma.compulsoryFacultyGroup.create({ data: { courseId, facultyGroupId: id } }); stats.courseRelations++ }
    }
    for (const hg of sourceCourse.compulsoryHallGroups ?? []) {
      const id = hallGroupIdMap.get(hg.hallGroupId)
      if (id) { await prisma.compulsoryHallGroup.create({ data: { courseId, hallGroupId: id } }); stats.courseRelations++ }
    }
    for (const e of sourceCourse.studentEnrollments ?? []) {
      const id = studentIdMap.get(e.studentId)
      if (id) { await prisma.courseStudentEnrollment.create({ data: { courseId, studentId: id } }); stats.courseRelations++ }
    }
    for (const e of sourceCourse.studentGroupEnrollments ?? []) {
      const id = studentGroupIdMap.get(e.studentGroupId)
      if (id) { await prisma.courseStudentGroupEnrollment.create({ data: { courseId, studentGroupId: id } }); stats.courseRelations++ }
    }
  }

  // Courses. A course serves a LIST of classes that attend as one combined session
  // (proff_choosing sends one class; a marauders re-export can send several). It's a
  // single scheduler course enrolling all its classes; lab / lab_theory split into a
  // practical + a "-T" theory course. Courses are NEVER deduped across files.
  // offeringMap (per file): sourceCourseId -> created course ids (variants).
  const offeringMap = new Map<string, string[]>()

  if (Array.isArray(data.courses)) {
    for (const course of data.courses) {
      const courseType = course.courseType || 'theory'
      const courseName = course.name || course.courseName || 'Unnamed Course'
      const courseCode = course.code || course.courseCode || 'UNKNOWN'
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

  // Allocations attach a faculty to a course (this file's course). The faculty row may
  // be shared across files (same source id), which is what lets the scheduler catch a
  // faculty double-booked across merged files.
  if (Array.isArray(data.allocations)) {
    for (const alloc of data.allocations) {
      const newFacultyId = facultyIdMap.get(alloc.facultyId)
      if (!newFacultyId) continue
      for (const courseId of offeringMap.get(alloc.courseId) || []) {
        await prisma.course.update({ where: { id: courseId }, data: { compulsoryFaculties: { connect: { id: newFacultyId } } } })
        stats.courseRelations++
      }
    }
  }

  // Group memberships
  if (Array.isArray(data.studentGroupMemberships)) {
    for (const m of data.studentGroupMemberships) {
      const studentId = studentIdMap.get(m.studentId)
      const studentGroupId = studentGroupIdMap.get(m.studentGroupId)
      if (studentId && studentGroupId) { await prisma.studentGroupMembership.create({ data: { studentId, studentGroupId } }); stats.memberships++ }
    }
  }
  if (Array.isArray(data.facultyGroupMemberships)) {
    for (const m of data.facultyGroupMemberships) {
      const facultyId = facultyIdMap.get(m.facultyId)
      const facultyGroupId = facultyGroupIdMap.get(m.facultyGroupId)
      if (facultyId && facultyGroupId) { await prisma.facultyGroupMembership.create({ data: { facultyId, facultyGroupId } }); stats.memberships++ }
    }
  }
  if (Array.isArray(data.hallGroupMemberships)) {
    for (const m of data.hallGroupMemberships) {
      const hallId = hallIdMap.get(m.hallId)
      const hallGroupId = hallGroupIdMap.get(m.hallGroupId)
      if (hallId && hallGroupId) { await prisma.hallGroupMembership.create({ data: { hallId, hallGroupId } }); stats.memberships++ }
    }
  }
}
