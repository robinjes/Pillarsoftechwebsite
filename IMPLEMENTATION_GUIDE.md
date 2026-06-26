# Check-In/Check-Out Implementation - Developer Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Volunteer Dashboard                         │
│                   (/app/volunteer/page.tsx)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │    CheckInWidget Component     │
        │  (/components/CheckInWidget)   │
        └────────────────┬───────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   ┌──────────────┐            ┌───────────────┐
   │  Check In    │            │  Check Out    │
   │   Button     │            │    Button     │
   └──────┬───────┘            └────────┬──────┘
          │                             │
          └──────────────┬──────────────┘
                         ▼
        ┌────────────────────────────────┐
        │   volunteerService.ts Functions│
        │  • startCheckIn()              │
        │  • checkOut()                  │
        │  • getCurrentCheckInStatus()   │
        │  • updateVolunteerHours()      │
        └────────────────┬───────────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
   ┌──────────────┐            ┌───────────────┐
   │ LocalStorage │            │   Supabase    │
   │ (Dev Mode)   │            │(Production)   │
   └──────────────┘            └───────────────┘
```

---

## New Interfaces

### CheckInSession
```typescript
interface CheckInSession {
  id: string                    // Unique session identifier
  userId: string                // Volunteer's user ID
  eventId: string               // Event ID or "general-checkin"
  checkInTime: string           // ISO timestamp of check-in
  checkOutTime?: string         // ISO timestamp of check-out (optional)
  duration: number              // Duration in minutes
  hoursLogged: number           // Calculated hours (decimal)
}
```

---

## Service Functions

### 1. startCheckIn(userId, eventId)

**Purpose:** Record when a volunteer begins their session

**Parameters:**
- `userId` (string): The volunteer's ID
- `eventId` (string): Event ID they're checking into (use "general-checkin" for general volunteering)

**Returns:** `Promise<CheckInSession>`

**Behavior:**
- **Dev Mode:** Stores session in `sessionStorage` with key `checkin-${userId}`
- **Production:** Inserts record into `check_in_sessions` table

**Error Handling:**
- Throws error if database insert fails
- Returns error message through UI

**Example:**
```typescript
const session = await volunteerService.startCheckIn(
  "user-123",
  "event-456"
)
// session.checkInTime = "2024-01-15T14:30:00Z"
```

---

### 2. checkOut(sessionId, userId)

**Purpose:** End a volunteer session and calculate logged hours

**Parameters:**
- `sessionId` (string): The session ID from startCheckIn
- `userId` (string): The volunteer's ID

**Returns:** `Promise<{ session: CheckInSession, hoursAdded: number }>`

**Behavior:**
1. Retrieves the session
2. Calculates elapsed time (checkOutTime - checkInTime)
3. Converts minutes to hours (rounded to 2 decimals)
4. Updates session with checkout info
5. Updates volunteer's `totalHours` in profile
6. Records hour adjustment (if production)

**Calculation:**
```
durationMinutes = (checkOutTime - checkInTime) / 60000
hoursLogged = Math.round((durationMinutes / 60) * 100) / 100
// Results in X.XX hours
```

**Error Handling:**
- Throws error if session not found
- Throws error if database update fails

**Example:**
```typescript
const result = await volunteerService.checkOut("session-789", "user-123")
console.log(result.hoursAdded) // 2.50
```

---

### 3. updateVolunteerHours(userId, newTotalHours, reason?)

**Purpose:** Admin function to manually adjust volunteer hours

**Parameters:**
- `userId` (string): The volunteer's ID
- `newTotalHours` (number): New total hours value
- `reason` (string, optional): Reason for adjustment (for audit log)

**Returns:** `Promise<VolunteerProfile | null>`

**Behavior:**
- **Dev Mode:** Updates local profile in `LOCAL_PROFILES_LIST_KEY`
- **Production:** Updates `profiles.total_hours` and logs adjustment

**Validation:**
- No client-side validation; assumes admin input is correct
- Recommend adding server-side validation

**Audit Trail:**
```sql
-- Optional: Insert into hour_adjustments table
INSERT INTO hour_adjustments 
  (user_id, new_total, reason, adjusted_at)
VALUES ($1, $2, $3, NOW())
```

**Example:**
```typescript
const updated = await volunteerService.updateVolunteerHours(
  "user-123",
  42.5,
  "Manual adjustment - makeup hours"
)
```

---

### 4. getCurrentCheckInStatus(userId)

**Purpose:** Get the current active check-in session for a volunteer

**Parameters:**
- `userId` (string): The volunteer's ID

**Returns:** `Promise<CheckInSession | null>`

**Behavior:**
- **Dev Mode:** Retrieves from `sessionStorage` with key `checkin-${userId}`
- **Production:** Queries `check_in_sessions` for unchecked-out session

**Query Logic (Production):**
```sql
SELECT * FROM check_in_sessions
WHERE user_id = $1
  AND check_out_time IS NULL  -- Not yet checked out
ORDER BY check_in_time DESC   -- Most recent first
LIMIT 1
```

**Returns:** Most recent unchecked-out session or null

**Example:**
```typescript
const status = await volunteerService.getCurrentCheckInStatus("user-123")
if (status && !status.checkOutTime) {
  console.log("User is currently checked in since:", status.checkInTime)
}
```

---

## Component: CheckInWidget

**Location:** `/src/components/CheckInWidget.tsx`

**Props:**
```typescript
interface CheckInWidgetProps {
  user: VolunteerProfile          // Current logged-in user
  onHoursUpdated?: (hours: number) => void  // Callback after checkout
}
```

**Features:**

1. **Real-Time Timer**
   - Updates every 1 second
   - Displays HH:MM:SS format
   - Only runs when checked in

2. **Check-In Button**
   - Calls `volunteerService.startCheckIn()`
   - Default eventId: "general-checkin"
   - Shows loading state while processing
   - Disables on error

3. **Check-Out Button**
   - Calls `volunteerService.checkOut()`
   - Only visible when checked in
   - Shows success message with hours
   - Resets state after completion

4. **Error Handling**
   - Displays error messages in red banner
   - Auto-dismisses success messages after 3s
   - Disables buttons during loading

**State Management:**
```typescript
const [isCheckedIn, setIsCheckedIn] = useState(false)
const [currentSession, setCurrentSession] = useState<CheckInSession | null>(null)
const [elapsedTime, setElapsedTime] = useState('00:00:00')
const [loading, setLoading] = useState(false)
const [error, setError] = useState('')
const [success, setSuccess] = useState('')
```

---

## Admin Page: Hours Management

**Location:** `/src/app/admin/hours/page.tsx`

**Features:**

1. **Volunteer List**
   - Sorted by total hours descending
   - Shows: Name, Email, Current Hours
   - Filtered by search term

2. **Search**
   - Real-time filtering
   - Searches name and email fields
   - Case-insensitive

3. **Edit Hours**
   - Click edit button → inline input appears
   - Number input with validation (min 0)
   - Save/Cancel buttons
   - Success notification after save

4. **Admin Functions**
   - Refresh button to reload data
   - Load all volunteer profiles
   - Calculate volunteer/staff counts

**State Structure:**
```typescript
const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([])
const [editingId, setEditingId] = useState<string | null>(null)
const [editingHours, setEditingHours] = useState<number>(0)
const [searchTerm, setSearchTerm] = useState('')
```

---

## Data Flow Diagrams

### Check-In Flow
```
User clicks "Check In"
        ↓
startCheckIn() called
        ↓
Supabase inserts into check_in_sessions
        ↓
Returns CheckInSession with checkInTime
        ↓
Set isCheckedIn = true
Set currentSession = session
        ↓
Timer starts counting elapsed time
```

### Check-Out Flow
```
User clicks "Check Out"
        ↓
checkOut() called with sessionId, userId
        ↓
Query check_in_sessions for session
        ↓
Calculate: duration = now - checkInTime
Calculate: hoursLogged = duration / 60
        ↓
Update check_in_sessions:
  - check_out_time = now
  - hours_logged = calculated value
        ↓
Update profiles:
  - total_hours += hoursLogged
        ↓
Insert hour_adjustments (if reason provided)
        ↓
Return hours added
        ↓
Show success message
Call onHoursUpdated callback
Reset to not-checked-in state
```

### Admin Hour Edit Flow
```
Admin clicks edit button
        ↓
editingId = volunteer.id
editingHours = current value
        ↓
Inline input appears with current value
        ↓
Admin edits number
        ↓
Admin clicks save
        ↓
updateVolunteerHours() called
        ↓
Supabase updates profiles.total_hours
Insert into hour_adjustments table
        ↓
Update UI with new value
Show success message
Close inline edit
```

---

## Storage Implementation

### Development Mode (LocalStorage)

**Check-In Session:**
```typescript
// Store
sessionStorage.setItem(
  `checkin-${userId}`,
  JSON.stringify(session)
)

// Retrieve
const sessionJson = sessionStorage.getItem(`checkin-${userId}`)
const session = JSON.parse(sessionJson)

// Clear on checkout
sessionStorage.removeItem(`checkin-${userId}`)
```

**Volunteer Profiles:**
```typescript
// Storage keys
LOCAL_PROFILE_KEY = 'pot_mock_volunteer_profile'
LOCAL_PROFILES_LIST_KEY = 'pot_mock_all_profiles'
LOCAL_SIGNUPS_KEY = 'pot_mock_volunteer_signups'
```

### Production Mode (Supabase)

**Tables Used:**

1. **check_in_sessions**
   - Purpose: Track all volunteer check-in/out sessions
   - Insert on startCheckIn()
   - Update on checkOut()

2. **profiles**
   - Column: total_hours (numeric, default 0)
   - Updated when checkOut() completes

3. **hour_adjustments** (optional)
   - Purpose: Audit trail for admin hour changes
   - Insert when updateVolunteerHours() called with reason
   - Useful for tracking corrections

---

## Error Handling

### Common Errors

**Check-In Errors:**
```typescript
// 1. User not found
throw new Error('Volunteer profile not found')

// 2. Database connection
throw new Error('Failed to record check-in: ' + error.message)

// 3. Session already exists
// (Currently allows multiple simultaneous check-ins - could add guard)
```

**Check-Out Errors:**
```typescript
// 1. Session not found
throw new Error('Session not found')

// 2. Update failed
throw new Error('Failed to record check-out')

// 3. Invalid times
// (Validation happens in calculation, not explicitly)
```

**Hour Update Errors:**
```typescript
// 1. Update failed
throw new Error('Failed to update hours')

// 2. Permission denied
// (Should be added via RLS policies)
```

### Error Recovery

- UI catches and displays errors
- Auto-dismiss after user sees
- Buttons re-enabled to allow retry
- No partial state changes

---

## Testing Checklist

### Manual Testing

**Volunteer Side:**
- [ ] Check-in records time correctly
- [ ] Timer updates every second
- [ ] Check-out calculates hours
- [ ] Hours added to profile total
- [ ] Can't check out without checking in
- [ ] Works in offline mode (LocalStorage)
- [ ] Works with Supabase

**Admin Side:**
- [ ] See all volunteers listed
- [ ] Search filters correctly
- [ ] Edit button shows inline input
- [ ] Save updates database
- [ ] Cancel dismisses edit
- [ ] Success message appears
- [ ] Page reloads fresh data

**Edge Cases:**
- [ ] Very short sessions (< 1 minute)
- [ ] Long sessions (several hours)
- [ ] Decimal hour calculations
- [ ] Multiple check-in attempts
- [ ] Browser refresh during session

---

## Future Improvements

1. **Event-Specific Hours**
   - Link check-ins to events
   - Show event breakdown in dashboard
   - Filter by event in history

2. **Approval Workflow**
   - Admin review hours before logging
   - Add comment system
   - Batch approve/reject

3. **Advanced Analytics**
   - Hours per event
   - Peak volunteer times
   - Hourly contribution reports
   - Export to Excel/CSV

4. **Mobile Optimization**
   - Full-screen check-in modal
   - Larger touch targets
   - Offline capability

5. **Notifications**
   - Webhook on check-out
   - Email confirmation
   - Slack integration

---

## Related Files Reference

```
/src/lib/volunteerService.ts
├── Interface: CheckInSession (new)
├── Interface: VolunteerProfile (existing)
├── Interface: VolunteerSignup (existing)
├── Function: startCheckIn() (NEW)
├── Function: checkOut() (NEW)
├── Function: updateVolunteerHours() (NEW)
└── Function: getCurrentCheckInStatus() (NEW)

/src/components/CheckInWidget.tsx (NEW)
└── Component displaying check-in/out interface

/src/app/admin/hours/page.tsx (NEW)
└── Admin page for hour management

/src/app/admin/layout.tsx (UPDATED)
└── Added Hours link to navigation

/src/app/volunteer/page.tsx (UPDATED)
└── Integrated CheckInWidget component
```

---

## Deployment Notes

1. **Database Setup (Supabase)**
   ```sql
   -- Create check_in_sessions table
   CREATE TABLE check_in_sessions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES profiles(id),
     event_id UUID NOT NULL,
     check_in_time TIMESTAMP NOT NULL,
     check_out_time TIMESTAMP,
     hours_logged NUMERIC(5,2),
     created_at TIMESTAMP DEFAULT NOW()
   );

   -- Add total_hours to profiles (if not exists)
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_hours NUMERIC(8,2) DEFAULT 0;

   -- Create hour_adjustments table (optional)
   CREATE TABLE hour_adjustments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES profiles(id),
     new_total NUMERIC(8,2) NOT NULL,
     reason TEXT,
     adjusted_at TIMESTAMP NOT NULL
   );
   ```

2. **RLS Policies**
   - Volunteers can only see/edit their own sessions
   - Admins can view all check-in sessions
   - Only staff/admins can update hours

3. **Environment Variables**
   - No new variables required
   - Uses existing Supabase configuration

---
