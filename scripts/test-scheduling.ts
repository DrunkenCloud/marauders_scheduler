/**
 * End-to-end smoke test for the slot-based scheduler.
 * Reseeds the demo session, runs the real scheduling algo, and asserts the
 * produced timetable is valid under the 7-slot/day system.
 *
 * Run:  pnpm tsx scripts/test-scheduling.ts
 *
 * ponytail: no test framework — plain asserts + a self-cleaning seed. Add vitest
 * only if this grows past one file.
 */
import { execSync } from 'child_process'
import assert from 'assert'
import { prisma } from '../src/lib/prisma'
import { compileSchedulingData, scheduleCourses } from '../src/app/api/schedule-all/algo'

const SESSION_NAME = 'Semester 1 — 2026'
const SLOTS_PER_DAY = 7

function fail(msg: string): never { console.error('✗ ' + msg); process.exit(1) }

// Every entity timetable must have in-bounds, non-overlapping slots per day.
function assertNoOverlaps(label: string, timetable: any) {
  for (const [day, slots] of Object.entries(timetable) as [string, any[]][]) {
    const occupied = new Set<number>()
    for (const s of slots) {
      assert(s.slotNumber >= 0 && s.slotNumber <= SLOTS_PER_DAY - 1,
        `${label} ${day}: slotNumber ${s.slotNumber} out of 0..6`)
      assert(s.slotSpan >= 1 && s.slotNumber + s.slotSpan <= SLOTS_PER_DAY,
        `${label} ${day}: span ${s.slotSpan} at ${s.slotNumber} exceeds day`)
      for (let i = s.slotNumber; i < s.slotNumber + s.slotSpan; i++) {
        if (occupied.has(i)) fail(`${label} double-booked on ${day} slot ${i} (course ${s.courseCode})`)
        occupied.add(i)
      }
    }
  }
}

async function main() {
  // ── 1. Fresh session ──────────────────────────────────────────────────────
  await prisma.session.deleteMany({ where: { name: SESSION_NAME } })
  console.log('→ Reseeding demo session...')
  execSync('pnpm db:seed', { stdio: 'inherit', cwd: process.cwd() })

  const session = await prisma.session.findUnique({ where: { name: SESSION_NAME } })
  assert(session, 'seed did not create the session')
  console.log(`✓ Session created: ${session!.name} (${session!.id})`)

  // ── 2. Pick everything not fully scheduled ────────────────────────────────
  const courses = await prisma.course.findMany({ where: { sessionId: session!.id } })
  const pending = courses.filter(c => c.scheduledCount < c.totalSessions)
  assert(pending.length > 0, 'expected some unscheduled/partial courses to schedule')
  const remaining = pending.reduce((n, c) => n + (c.totalSessions - c.scheduledCount), 0)
  console.log(`✓ ${courses.length} courses, ${pending.length} pending, ${remaining} sessions to place`)

  // ── 3. Compile + schedule (mirrors the API route) ─────────────────────────
  const compiled = await compileSchedulingData(session!.id, pending.map(c => c.id))
  for (const c of compiled.courses) {
    (c as any).targetSessions = c.totalSessions   // schedule all remaining
  }
  const result = await scheduleCourses(compiled, 42)  // fixed seed = deterministic

  console.log(`→ scheduler: ${result.message}`)
  if (!result.success) fail(`scheduler failed: ${JSON.stringify(result.failureDetails)}`)
  console.log(`✓ success — placed ${result.scheduledSlots?.length} new slots`)

  // ── 4. Assertions ─────────────────────────────────────────────────────────
  assert.strictEqual(result.scheduledSlots!.length, remaining,
    `placed ${result.scheduledSlots!.length} slots, expected ${remaining}`)

  // Every course reached its target.
  for (const c of compiled.courses) {
    assert.strictEqual(c.scheduledCount, c.totalSessions,
      `course ${c.courseCode}: ${c.scheduledCount}/${c.totalSessions} scheduled`)
  }
  console.log('✓ every pending course fully scheduled')

  // Every entity's final timetable (seeded + newly placed) is conflict-free.
  for (const [id, entity] of Object.entries(compiled.allEntities)) {
    assertNoOverlaps(`entity ${id.slice(0, 6)}`, entity.timetable)
  }
  console.log('✓ no in-bounds/overlap/double-booking violations across all entities')

  // ── 5. Show a couple of resulting grids ───────────────────────────────────
  const sample = result.scheduledSlots!.slice(0, 8)
  console.log('\nSample placed slots:')
  for (const s of sample) {
    console.log(`  ${s.courseCode}  ${s.day} slot ${s.slotNumber}${s.slotSpan > 1 ? `–${s.slotNumber + s.slotSpan - 1}` : ''}`)
  }

  console.log('\n✅ ALL CHECKS PASSED')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
