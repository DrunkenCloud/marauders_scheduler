# Course Timetables Feature

## Overview
The Course Timetables feature allows you to view when courses are scheduled throughout the week. This provides a visual representation of course scheduling and helps track scheduling progress.

## Features

### 1. Course Timetable View
- **Access**: Click the "📅 Timetable" button next to any course in the course list
- **Purpose**: View when a course is scheduled across the week
- **Mode**: Read-only (courses are scheduled by the system, not manually edited)

### 2. Scheduling Progress Indicator
- **Location**: Course list table, in the "Scheduling" column
- **Visual**: Progress bar showing scheduled sessions vs. total sessions
- **Colors**:
  - Green: Fully scheduled (all sessions scheduled)
  - Yellow: Partially scheduled (some sessions scheduled)
  - Gray: Not scheduled (no sessions scheduled)

### 3. Course Information Display
When viewing a course timetable, you'll see:
- Course code and name
- Sessions scheduled vs. total sessions required
- Duration per session
- Sessions per lecture

## How It Works

### Course Scheduling
1. Courses are scheduled through the "Schedule Courses" feature
2. When courses are scheduled, their timetables are automatically populated
3. The scheduling system assigns time slots and updates the course's timetable
4. The scheduled count is automatically tracked and updated

### Timetable Display
- **Time Slots**: Shows when the course is scheduled (day and time)
- **Resources**: Displays which faculty, halls, and student groups are involved
- **Visual Timeline**: Interactive timeline view showing course sessions
- **Conflict Detection**: System prevents scheduling conflicts automatically

### Integration with Other Entities
Course timetables are automatically synchronized with:
- **Faculty timetables**: Shows when faculty are teaching the course
- **Hall timetables**: Shows when halls are occupied by the course
- **Student timetables**: Shows when students attend the course
- **Group timetables**: Shows when student/faculty/hall groups are involved

## Usage Tips

1. **Check Scheduling Progress**: Use the progress bars in the course list to quickly see which courses need more scheduling
2. **View Course Distribution**: Use the timetable view to see how courses are distributed across the week
3. **Resource Planning**: Check course timetables to understand resource utilization
4. **Schedule Optimization**: Use the visual timeline to identify scheduling patterns and potential improvements

## Technical Details

### Data Flow
1. Courses are created with scheduling requirements (duration, sessions per lecture, total sessions)
2. The scheduling algorithm assigns time slots and updates course timetables
3. Course timetables are stored in the database and synchronized with related entity timetables
4. The UI displays the timetable data in a read-only format

### API Integration
- **GET /api/timetables**: Retrieves course timetable data
- **PUT /api/timetables**: Updates course timetable (used by scheduling system)
- **PATCH /api/courses/[id]/scheduled-count**: Updates scheduled session count

### Entity Types
Course timetables use the `EntityType.COURSE` type and integrate with the existing timetable system used by students, faculty, and halls.