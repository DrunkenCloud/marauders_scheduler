# Hall Groups Scheduling Enhancement

## Overview
Enhanced the scheduling algorithm to properly handle hall groups as first-class entities in the course scheduling process. Hall groups are now treated as both scheduling constraints and entities that receive scheduled slots in their timetables.

## Key Changes Made

### 1. Enhanced Course Data Compilation
- **File**: `src/app/api/schedule-all/algo.ts`
- **Function**: `compileSchedulingData()`
- **Changes**:
  - Added hall groups to the entity collection process
  - Hall groups are now included in both group tracking and individual hall expansion
  - When a course uses a hall group, both the group ID and individual hall IDs are tracked

### 2. Entity Workload Calculation
- **Added**: Hall groups to entity fetching and workload calculations
- **Functionality**: 
  - Hall groups now have their own workload calculations
  - Free time, daily thresholds, and current workload are calculated for hall groups
  - Hall groups are treated as scheduling constraints alongside individual halls

### 3. Scheduling Algorithm Enhancement
- **Function**: `scheduleCourses()`
- **Changes**:
  - Hall groups are now included in availability checking
  - When checking if entities are available, hall groups are validated alongside other entities
  - Hall group workloads are updated when courses are scheduled

### 4. Timetable Updates
- **New Function**: `updateEntityTimetables()`
- **Purpose**: Updates timetables for all entities after successful scheduling
- **Functionality**:
  - Automatically updates hall group timetables when courses are scheduled
  - Propagates scheduled slots to all entity types (students, faculty, halls, groups)
  - Maintains proper timetable structure with day-based organization
  - Sorts slots by start time for each day

### 5. Enhanced Return Types
- **Change**: Modified `scheduleCourses()` return type to include day information
- **Benefit**: Enables proper timetable updates with correct day placement
- **Structure**: `Array<SlotFragment & { day: string }>`

## Functional Improvements

### Before Enhancement
- Hall groups were expanded to individual halls but not treated as entities
- Hall group timetables were not updated during scheduling
- No workload tracking for hall groups
- Scheduling only considered individual halls from groups

### After Enhancement
- Hall groups are first-class scheduling entities
- Hall group timetables are automatically updated
- Workload calculations include hall groups
- Availability checking validates hall groups
- Proper constraint handling for hall group scheduling

## Technical Details

### Entity Types Supported
1. **Students** - Individual student scheduling
2. **Faculty** - Individual faculty scheduling  
3. **Halls** - Individual hall scheduling
4. **Student Groups** - Group-based student scheduling
5. **Faculty Groups** - Group-based faculty scheduling
6. **Hall Groups** - Group-based hall scheduling ✨ (Enhanced)

### Workload Calculation for Hall Groups
- **Free Time Analysis**: Calculates available time slots within hall group working hours
- **Daily Thresholds**: Distributes scheduling load across weekdays
- **Current Workload**: Tracks existing scheduled time
- **Scheduling Duration**: Calculates total time needed for remaining course sessions

### Timetable Propagation
When a course is scheduled:
1. **Course Timetable**: Updated with scheduled sessions
2. **Individual Entity Timetables**: All involved students, faculty, halls get updated
3. **Group Timetables**: All involved student groups, faculty groups, hall groups get updated
4. **Automatic Sorting**: Slots are sorted by start time within each day

## Integration Points

### API Route Integration
- **File**: `src/app/api/schedule-all/route.ts`
- **Enhancement**: Calls `updateEntityTimetables()` after successful scheduling
- **Error Handling**: Continues operation even if timetable updates fail

### Database Updates
- Updates timetables for all entity types in the database
- Maintains referential integrity
- Batch processing for efficiency

## Benefits

1. **Complete Entity Coverage**: All entity types are properly handled during scheduling
2. **Automatic Timetable Management**: No manual timetable updates needed
3. **Constraint Validation**: Hall groups are properly validated for availability
4. **Workload Distribution**: Hall groups participate in workload balancing
5. **Data Consistency**: All related entities have synchronized timetables

## Usage

The enhancement is automatically active when using the scheduling API:

```typescript
// POST /api/schedule-all
{
  "sessionId": "session-uuid",
  "courseIds": ["course-uuid-1", "course-uuid-2"]
}
```

**Response includes**:
- Scheduled slots with day information
- Updated entity timetables (automatic)
- Hall group constraint validation
- Workload-balanced scheduling

## Future Enhancements

1. **Smart Hall Selection**: Choose optimal halls from hall groups based on capacity/location
2. **Group Preference Weighting**: Prioritize certain halls within groups
3. **Conflict Resolution**: Advanced handling of hall group conflicts
4. **Resource Optimization**: Minimize hall group resource usage across courses