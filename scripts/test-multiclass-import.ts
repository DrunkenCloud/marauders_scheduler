/**
 * Verify a course served to MULTIPLE classes imports as ONE combined-session course
 * enrolling all its classes (not one course per class), with its faculty attached.
 * Run: pnpm tsx scripts/test-multiclass-import.ts
 */
import assert from 'assert'
import { prisma } from '../src/lib/prisma'
import { POST as importPost } from '../src/app/api/import-session/route'

async function importDump(sessionId: string, data: any) {
  const req = new Request('http://local/import', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, data }),
  }) as any
  const json = await (await importPost(req)).json()
  assert(json.success, `import failed: ${JSON.stringify(json)}`)
  return json.stats
}

async function main() {
  // DS is a combined lecture for BOTH IoT and Cyber (one session, two classes),
  // co-taught by X and Y. Plus a lab for IoT only.
  const clsIoT = 'cls-iot', clsCyber = 'cls-cyber'
  const facX = 'fac-X', facY = 'fac-Y', facZ = 'fac-Z'
  const cDS = 'course-DS', cLab = 'course-LAB'
  const data = {
    classes: [
      { id: clsIoT, year: 2, class: 'IoT', section: 'A' },
      { id: clsCyber, year: 2, class: 'Cyber', section: 'A' },
    ],
    faculty: [
      { id: facX, name: 'Prof X' }, { id: facY, name: 'Prof Y' }, { id: facZ, name: 'Prof Z' },
    ],
    courses: [
      { id: cDS, courseName: 'Data Structures', courseCode: 'CS201', courseType: 'theory', hoursPerWeek: 3, classIds: [clsIoT, clsCyber] },
      { id: cLab, courseName: 'DS Lab', courseCode: 'CS201L', courseType: 'lab', hoursPerWeek: 2, classIds: [clsIoT] },
    ],
    allocations: [
      { id: 'a1', facultyId: facX, courseId: cDS, classId: clsIoT },   // X on the combined DS
      { id: 'a2', facultyId: facY, courseId: cDS, classId: clsCyber }, // Y on the combined DS
      { id: 'a3', facultyId: facZ, courseId: cLab, classId: clsIoT },  // Z on the lab
    ],
  }

  const session = await prisma.session.create({ data: { name: `MULTICLASS ${Date.now()}` } })
  const stats = await importDump(session.id, data)
  console.log('stats:', JSON.stringify(stats))

  // DS → 1 combined course; Lab → 2 courses (lab + theory) ⇒ 3 courses total.
  const courses = await prisma.course.findMany({
    where: { sessionId: session.id },
    include: { compulsoryFaculties: true, studentGroupEnrollments: { include: { studentGroup: true } } },
  })
  assert.strictEqual(courses.length, 3, `expected 3 courses, got ${courses.length}`)

  const fac = (c: any) => c.compulsoryFaculties.map((f: any) => f.name).sort()
  const groups = (c: any) => c.studentGroupEnrollments.map((e: any) => e.studentGroup.groupName).sort()

  const ds = courses.find(c => c.code === 'CS201')!
  assert.strictEqual(ds.studentGroupEnrollments.length, 2, `DS should enrol 2 classes, got ${groups(ds)}`)
  assert.deepStrictEqual(fac(ds), ['Prof X', 'Prof Y'], `DS faculty should be [X, Y], got ${fac(ds)}`)
  console.log(`✓ DS is ONE combined course enrolling ${groups(ds)}, faculty ${fac(ds)}`)

  // Lab: both the practical and its -T theory enrol IoT and belong to Prof Z.
  const labCourses = courses.filter(c => c.code === 'CS201L' || c.code === 'CS201L-T')
  assert.strictEqual(labCourses.length, 2, 'lab should split into practical + theory')
  for (const lc of labCourses) {
    assert.deepStrictEqual(fac(lc), ['Prof Z'], `${lc.code} faculty should be [Z]`)
    assert(groups(lc).some((g: string) => g.includes('IoT')), `${lc.code} should enrol IoT`)
  }
  console.log('✓ lab split (CS201L + CS201L-T) both enrol IoT and Prof Z')

  await prisma.session.delete({ where: { id: session.id } })
  console.log('\n✅ MULTI-CLASS IMPORT TEST PASSED')
}

main().catch(e => { console.error('\n✗', e.message); process.exit(1) }).finally(() => prisma.$disconnect())
