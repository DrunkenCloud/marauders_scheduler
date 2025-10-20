# Course-Centric Randomized Scheduling Algorithm

## Overview ✅
Restructured the recursive scheduling algorithm to be more course-centric with enhanced randomness, following the requested approach of organizing options by course and shuffling course order.

## Key Changes Implemented

### 🎯 **New Algorithm Structure**
1. **Course Options Map**: Create a map of each course to its possible scheduling slots
2. **Individual Sorting**: Sort slots for each course individually (not globally)
3. **Early Exit**: Return false immediately if any course has no possible slots
4. **Course Shuffling**: Shuffle the unscheduled courses for randomness
5. **Course-by-Course**: Iterate through shuffled courses, then their sorted slots
6. **Recursive Continuation**: Continue recursively for each successful scheduling

### 🔄 **Algorithm Flow**
```
1. Get unscheduled courses
2. For each course, find all possible slots on all days
3. Sort each course's slots individually (day diversity → workload → time)
4. Check if any course has zero slots → return false (early exit)
5. Shuffle course order for randomness
6. For each shuffled course:
   - Try each of its sorted slots
   - If successful, recurse
   - If all slots fail, move to next course
7. If no courses can be scheduled → return false
```

## Technical Implementation

### 1. Course Options Mapping
```typescript
function getCourseSchedulingOptionsMap(data: CompiledSchedulingData, allScheduledSlots: Array<SlotFragment & { day: string }>): {
  courseOptionsMap: Map<string, Array<{
    day: string,
    startHour: number,
    startMinute: number,
    duration: number,
    isNewDay: boolean,
    withinWorkload: boolean
  }>>,
  unscheduledCourses: CompiledCourseData[]
}
```

**Features:**
- Maps each course ID to its available scheduling options
- Includes day diversity and workload information for each option
- Sorts options per course individually

### 2. Individual Course Slot Sorting
```typescript
// Sort options for this course (day diversity first, then workload, then time)
courseOptions.sort((a, b) => {
  // Primary: Day diversity (new days first)
  if (a.isNewDay !== b.isNewDay) {
    return a.isNewDay ? -1 : 1
  }
  
  // Secondary: Workload compliance (within workload first)
  if (a.withinWorkload !== b.withinWorkload) {
    return a.withinWorkload ? -1 : 1
  }
  
  // Tertiary: Start time (earlier first)
  const aTime = a.startHour * 60 + a.startMinute
  const bTime = b.startHour * 60 + b.startMinute
  return aTime - bTime
})
```

### 3. Course Shuffling for Randomness
```typescript
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Shuffle the unscheduled courses for randomness
const shuffledCourses = shuffleArray(currentUnscheduledCourses)
```

### 4. Early Exit Strategy
```typescript
// Early exit: check if any course has no possible slots
for (const course of currentUnscheduledCourses) {
  const options = courseOptionsMap.get(course.courseId) || []
  if (options.length === 0) {
    console.log(`❌ Course ${course.courseCode} has no available slots - backtracking`)
    return false
  }
}
```

### 5. Course-Centric Iteration
```typescript
// Try each shuffled course
for (const course of shuffledCourses) {
  const options = courseOptionsMap.get(course.courseId) || []
  
  console.log(`📚 Trying course ${course.courseCode} with ${options.length} possible slots`)

  // Try each sorted option for this course
  for (const option of options) {
    // ... scheduling logic
    
    // Recursively try to schedule remaining courses
    if (scheduleRecursively()) {
      return true // Success path
    }
    
    // Backtrack if failed
  }
  
  // If we get here, this course couldn't be scheduled with any of its options
  console.log(`❌ Could not schedule ${course.courseCode} with any available slots`)
}
```

## Benefits of New Approach

### ✅ **Enhanced Randomness**
- **Course Order Shuffling**: Different course ordering each run
- **Varied Exploration**: Different scheduling paths explored
- **Reduced Determinism**: Less predictable scheduling patterns

### ✅ **Better Organization**
- **Course-Centric**: Options organized by course, not globally
- **Individual Sorting**: Each course's options sorted optimally
- **Clear Structure**: Easier to understand and debug

### ✅ **Improved Efficiency**
- **Early Exit**: Immediate failure detection if any course has no slots
- **Focused Search**: Try all options for one course before moving to next
- **Reduced Backtracking**: More targeted approach

### ✅ **Enhanced Logging**
```
🎲 Shuffled 5 courses for randomness
🔍 Total options: 23 within workload, 15 new days available
📚 Trying course CS101 with 4 possible slots
⏰ Trying CS101 on Monday at 8:00 🆕 (new day) ✅ (within workload)
✅ Scheduled CS101 (1/3) on Monday at 8:00
📚 Trying course MATH201 with 3 possible slots
❌ Could not schedule MATH201 with any available slots
```

## Algorithm Behavior Examples

### Example 1: Successful Scheduling
```
Courses: [CS101, MATH201, PHY301]
Shuffled: [MATH201, CS101, PHY301]

1. Try MATH201: Monday 8:00 ✅ → Recurse
2. Try CS101: Tuesday 9:00 ✅ → Recurse  
3. Try PHY301: Wednesday 10:00 ✅ → Success!
```

### Example 2: Early Exit
```
Courses: [CS101, MATH201, PHY301]
CS101: 3 options, MATH201: 0 options, PHY301: 2 options

Result: ❌ Course MATH201 has no available slots - backtracking
(No need to try other courses)
```

### Example 3: Course-Level Backtracking
```
Courses: [CS101, MATH201]
Shuffled: [CS101, MATH201]

1. Try CS101: 
   - Monday 8:00 → Recurse → MATH201 fails → Backtrack
   - Tuesday 9:00 → Recurse → MATH201 fails → Backtrack
   - Wednesday 10:00 → Recurse → MATH201 succeeds → Success!
```

## Comparison with Previous Approach

### Old Approach (Global Options)
- Created flat array of all options for all courses
- Sorted globally by time/day/course
- Less randomness (deterministic ordering)
- Could try suboptimal combinations early

### New Approach (Course-Centric)
- Maps options by course individually
- Sorts each course's options optimally
- Shuffles course order for randomness
- Focuses on one course at a time
- Early exit for impossible scenarios

## Impact on Scheduling Quality

### ✅ **Maintained Quality**
- All existing constraints preserved (workload, conflicts, day diversity)
- Same backtracking and state management
- Same timetable update mechanisms

### ✅ **Enhanced Exploration**
- More varied scheduling paths due to randomness
- Better chance of finding solutions in complex scenarios
- Reduced likelihood of getting stuck in local optima

### ✅ **Improved Debugging**
- Clear course-by-course progress tracking
- Easy identification of problematic courses
- Better understanding of scheduling bottlenecks

The algorithm now provides more randomness and better organization while maintaining all existing quality guarantees! 🎉