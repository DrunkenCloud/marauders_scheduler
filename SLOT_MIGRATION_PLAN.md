# Slot-Number Migration Plan

Replace the time-based timetable system (startHour/startMinute/duration) with a slot-number system: **7 slots per day × 5 days = 35 slots total**. No timings, just slot indices 0–6.

---

## Core Concept

- Each day has exactly 7 slots, numbered 0–6
- A slot can span multiple consecutive slot numbers (e.g. a lab takes slots 0+1+2 = 3 slots)
- `slotNumber` replaces `startHour`, `startMinute`, `duration`
- `slotSpan` (number of consecutive slots consumed) replaces `duration`
- No more `startHour/startMinute/endHour/endMinute` on any entity

---

## New TimetableSlot Shape

```ts
interface TimetableSlot {
  type: 'course' | 'blocker'
  slotNumber: number      // 0–6 (which slot in the day)
  slotSpan: number        // how many consecutive slots this occupies (default 1)
  courseId?: string
  courseCode?: string
  blockerReason?: string
  hallIds?: string[]
  facultyIds?: string[]
  hallGroupIds?: string[]
  facultyGroupIds?: string[]
  studentIds?: string[]
  studentGroupIds?: string[]
}
```

---

## Files to Change

### 1. `src/types/index.ts`

**Changes:**
- Remove `EntityTiming` interface (no more startHour/endHour etc.)
- Remove `startHour/startMinute/endHour/endMinute` from `Student`, `Faculty`, `Hall`, `StudentGroup`, `FacultyGroup`, `HallGroup` interfaces
- Replace `TimetableSlot` fields: remove `startHour`, `startMinute`, `duration`; add `slotNumber: number`, `slotSpan: number`
- Remove `TimeSlot` interface (no longer needed)
- Remove `AvailableSlot.startSlotIndex` (replace with `slotNumber`)
- Remove `EntityWorkload` timing fields (`dailyFreeMinutes` becomes slot-count based)
- Remove `EntityData` timing fields (`startHour/startMinute/endHour/endMinute`)
- Remove `SlotFragment` timing fields; replace with `slotNumber/slotSpan`
- Remove `StudentGroupFormData`, `FacultyGroupFormData`, `HallGroupFormData` timing fields
- Remove `SessionTiming` interface

---

### 2. `prisma/schema.prisma`

**Changes:**
- Remove from `Student`: `startHour`, `startMinute`, `endHour`, `endMinute`
- Remove from `Faculty`: `startHour`, `startMinute`, `endHour`, `endMinute`
- Remove from `Hall`: `startHour`, `startMinute`, `endHour`, `endMinute`
- Remove from `StudentGroup`: `startHour`, `startMinute`, `endHour`, `endMinute`
- Remove from `FacultyGroup`: `startHour`, `startMinute`, `endHour`, `endMinute`
- Remove from `HallGroup`: `startHour`, `startMinute`, `endHour`, `endMinute`
- Update the timetable JSON comment to reflect new slot format
- Run `prisma migrate dev` after changes

---

### 3. `src/lib/timetable.ts`

**Full rewrite. Changes:**
- Remove `generateTimeSlots()` — no longer needed
- Remove `findAvailableTimeGaps()` — replace with slot-based version
- Remove `isTimeAvailable()` — replace with `isSlotAvailable(timetable, day, slotNumber, slotSpan)`
- Rewrite `convertRawTimetableToEntityTimetable()` — map `slotNumber/slotSpan` instead of time fields
- Rewrite `convertEntityTimetableToRaw()` — output `slotNumber/slotSpan`
- Rewrite `validateTimetable()` — validate `slotNumber` 0–6, `slotSpan` ≥ 1, no overlapping slots
- Rewrite `addSlot()` — sort by `slotNumber` instead of time
- Rewrite `mergeSlots()` — merge by slot adjacency
- Add `getSlotsForDay(timetable, day)` — returns occupied slot numbers
- Add `getFreeSlots(timetable, day)` — returns free slot numbers (0–6 minus occupied)
- Add `isSlotAvailable(timetable, day, slotNumber, slotSpan)` — checks no overlap
- Remove `fragmentSlot()` — not needed in slot system
- Keep `DAYS_OF_WEEK`, `initializeEmptyTimetable()`, `getAllSlots()`, `removeSlot()`
- Remove `DEFAULT_SLOT_DURATION` constant; add `SLOTS_PER_DAY = 7`

---

### 4. `src/components/TimetableEditor.tsx`

**Full rewrite. Changes:**
- Remove all timeline/pixel-position logic (`getTimelineWidth`, `getSlotPosition`, `getTimeFromPosition`)
- Remove drag-and-drop (timeline drag doesn't apply to a grid)
- Remove swap logic (can simplify or keep as grid-based swap)
- Replace the timeline render with a **5-column × 7-row grid** (days as columns, slot numbers as rows)
- Each cell shows the slot occupying it (course name/code or blocker reason), or is empty
- Clicking an empty cell opens the add-slot form pre-filled with that day + slotNumber
- Clicking an occupied cell opens the edit form
- `editingSlot` state: replace `startHour/startMinute/duration` with `slotNumber/slotSpan`
- Remove `entityTiming` prop — no longer needed
- Conflict checking: replace time-overlap check with slot-overlap check (`slotNumber` to `slotNumber + slotSpan - 1`)
- Remove `TimingFields` usage in the slot editor form; replace with slot number picker (0–6 dropdown) and span picker (1–7)
- Keep course dropdown, blocker reason, faculty/hall/student assignment fields

---

### 5. `src/components/TimetableManagement.tsx`

**Changes:**
- Remove `entityTiming` state and fetching
- Remove passing `entityTiming` prop to `TimetableEditor`
- `convertRawTimetableToEntityTimetable` and `convertEntityTimetableToRaw` still used but their internals change (handled in `timetable.ts`)

---

### 6. `src/app/api/timetables/route.ts`

**Changes:**
- GET: Remove `startHour/startMinute/endHour/endMinute` from all entity `select` clauses
- GET: Remove `entityTiming` from response — return only `timetable`
- PUT: No changes needed (just saves raw timetable JSON)

---

### 7. `src/app/api/schedule-all/algo.ts`

**Full rewrite of core scheduling logic. Changes:**
- Remove `calculateFreeMinutes()` — replace with `calculateFreeSlots()` (counts free slot numbers per day)
- Remove `calculateCurrentWorkload()` — replace with slot-count version
- Remove `isEntityFree()` time-based check — replace with `isEntitySlotFree(timetable, day, slotNumber, slotSpan)`
- Remove `findAvailableSlots()` time-interval loop — replace with slot-number iteration (0 to 6, checking span fits)
- Remove working hours bounds check (`workingStartMinutes/workingEndMinutes`) — all 7 slots are always valid
- Update `compileSchedulingData()`: remove `startHour/startMinute/endHour/endMinute` from entity fetches and `EntityData`
- Update `processEntity()`: remove timing-based workload calculation; use slot counts
- Update slot creation in `scheduleRecursively()`: use `slotNumber/slotSpan` instead of `startHour/startMinute/duration`
- Update timetable mutation in backtracking: push/remove slots by `slotNumber`
- `classDuration` on Course becomes irrelevant for scheduling — use `slotSpan` (derived from `sessionsPerLecture`) instead. A course with `sessionsPerLecture: 1` takes 1 slot, `sessionsPerLecture: 3` takes 3 consecutive slots.
- Update `SlotFragment` usage throughout to use `slotNumber/slotSpan`

---

### 8. `src/app/api/schedule-all/commit/route.ts`

**Changes (if exists):**
- Update slot writing to use `slotNumber/slotSpan` format when committing to DB

---

### 9. `src/app/api/import-session/route.ts`

**Changes:**
- Remove all `startHour/startMinute/endHour/endMinute` from every `prisma.*.create()` call (Student, Faculty, Hall, StudentGroup, FacultyGroup, HallGroup)
- Rewrite blocker creation: replace time-based blockers with slot-number blockers
  - First year: map the described time slots to slot numbers 0–6
  - Other years: same mapping
  - Example mapping (to be confirmed with user): slot 0 = 8:10, slot 1 = 9:00, slot 2 = 10:00, slot 3 = 11:00, slot 4 = 12:00, slot 5 = 13:00, slot 6 = 14:00
  - Blockers that span multiple slots use `slotSpan > 1`
- Update course creation: `classDuration` field may be removed or kept as metadata; `sessionsPerLecture` drives slot span

---

### 10. `src/app/api/export-session/route.ts`

**Changes:**
- No structural changes needed — exports raw JSON from DB
- The exported timetable JSON will now contain `slotNumber/slotSpan` fields instead of time fields

---

### 11. `src/app/api/students/route.ts`

**Changes:**
- POST: Remove `startHour/startMinute/endHour/endMinute` from request body destructuring and `prisma.student.create()`
- GET: No changes needed (these fields won't exist in DB anymore)

---

### 12. `src/app/api/students/[id]/route.ts`

**Changes:**
- PUT: Remove `startHour/startMinute/endHour/endMinute` from update body
- GET: Remove from select if explicitly selected

---

### 13. `src/app/api/faculty/route.ts`

**Changes:**
- POST: Remove `startHour/startMinute/endHour/endMinute` from body and `prisma.faculty.create()`

---

### 14. `src/app/api/faculty/[id]/route.ts`

**Changes:**
- PUT: Remove timing fields from update

---

### 15. `src/app/api/halls/route.ts`

**Changes:**
- POST: Remove timing fields from body and `prisma.hall.create()`

---

### 16. `src/app/api/halls/[id]/route.ts`

**Changes:**
- PUT: Remove timing fields from update

---

### 17. `src/app/api/student-groups/route.ts`

**Changes:**
- POST: Remove timing fields

---

### 18. `src/app/api/student-groups/[id]/route.ts`

**Changes:**
- PUT: Remove timing fields

---

### 19. `src/app/api/faculty-groups/route.ts`

**Changes:**
- POST: Remove timing fields

---

### 20. `src/app/api/faculty-groups/[id]/route.ts`

**Changes:**
- PUT: Remove timing fields

---

### 21. `src/app/api/hall-groups/route.ts`

**Changes:**
- POST: Remove timing fields

---

### 22. `src/app/api/hall-groups/[id]/route.ts`

**Changes:**
- PUT: Remove timing fields

---

### 23. `src/components/StudentForm.tsx`

**Changes:**
- Remove `startHour/startMinute/endHour/endMinute` state variables
- Remove `TimingFields` component usage
- Remove timing fields from POST/PUT body
- Remove "Working Hours" section from form UI

---

### 24. `src/components/FacultyForm.tsx`

**Changes:**
- No timing fields currently in form (already clean) — no changes needed

---

### 25. `src/components/HallForm.tsx`

**Changes:**
- No timing fields currently in form — no changes needed

---

### 26. `src/components/FacultyGroupForm.tsx`

**Changes:**
- Remove `startHour/startMinute/endHour/endMinute` from `FacultyGroupFormData` state
- Remove `TimingFields` component usage
- Remove timing validation

---

### 27. `src/components/HallGroupForm.tsx`

**Changes:**
- Same as FacultyGroupForm — remove timing fields and `TimingFields` component

---

### 28. `src/components/StudentGroupManagement.tsx` (and similar group management files)

**Changes:**
- Remove timing fields from create/edit payloads sent to API

---

### 29. `src/components/StudentList.tsx`

**Changes:**
- Remove "Working Hours" column from the table (currently shows `startHour:startMinute - endHour:endMinute`)

---

### 30. `src/components/FacultyList.tsx`

**Changes:**
- Remove any working hours display column if present

---

### 31. `src/components/HallList.tsx`

**Changes:**
- Remove any availability hours display column if present

---

### 32. `src/components/TimingFields.tsx` (if exists)

**Changes:**
- Can be deleted entirely once all usages are removed

---

### 33. `src/app/api/courses/available/route.ts`

**Changes:**
- No structural changes — this filters courses by entity membership, not by timing

---

### 34. `src/app/api/courses/[id]/scheduled-count/route.ts`

**Changes:**
- No changes needed

---

## Database Migration

After updating `prisma/schema.prisma`, run:

```bash
npx prisma migrate dev --name remove_timing_fields_add_slot_system
```

This will:
1. Drop `startHour`, `startMinute`, `endHour`, `endMinute` columns from all entity tables
2. The `timetable` JSON column stays — existing data will be stale (old time-based format) but since this is a dev migration, clearing session data via the import/export page is the cleanest path

---

## Slot Number Mapping (for import blockers)

The import logic currently uses real times for blockers. With 7 slots, we need a canonical mapping. Proposed (to confirm with user):

| Slot | Represents |
|------|-----------|
| 0    | Period 1  |
| 1    | Period 2  |
| 2    | Period 3  |
| 3    | Period 4  |
| 4    | Period 5  |
| 5    | Period 6  |
| 6    | Period 7  |

Blockers in import will directly specify which slot numbers to block (e.g. lunch = block slot 3, EAA = block slots 5+6).

---

## Order of Implementation

1. `prisma/schema.prisma` + migration
2. `src/types/index.ts`
3. `src/lib/timetable.ts`
4. All API routes (remove timing fields from create/update)
5. `src/app/api/schedule-all/algo.ts`
6. `src/app/api/import-session/route.ts`
7. `src/app/api/timetables/route.ts`
8. `src/components/TimetableEditor.tsx`
9. `src/components/TimetableManagement.tsx`
10. All form components (remove timing fields)
11. All list components (remove timing columns)
12. Delete `TimingFields.tsx` if no other usages remain
