# Check-In/Check-Out & Hour Management Feature Guide

## Overview
The volunteer management system now includes time tracking and hour management capabilities. Volunteers can check in/out to log their volunteer time, and admins can view and edit volunteer hours.

---

## For Volunteers

### Quick Check In/Out Widget
Located on the Volunteer Dashboard (`/volunteer`), below the member card section.

#### How to Use:

1. **Check In**
   - Click the "Check In" button on the Quick Check In/Out widget
   - The timer will start counting your volunteer time
   - You'll see a real-time display of elapsed time in HH:MM:SS format

2. **While Checked In**
   - The widget shows:
     - Elapsed time counting up in real-time
     - The exact time you checked in
     - "Checked in at HH:MM:SS" message

3. **Check Out**
   - Click the "Check Out" button when your volunteer session ends
   - The system automatically calculates the hours logged
   - Your volunteer profile's total hours is updated
   - A success message confirms the hours added (e.g., "Checked out! 2.50 hours logged")

#### Features:
- ✅ Automatic time calculation
- ✅ Real-time elapsed time display
- ✅ Automatic profile hours update
- ✅ Success/error messages
- ✅ Works in both online (Supabase) and offline (LocalStorage) modes

---

## For Admins

### Volunteer Hours Management Page
Access at: `/admin/hours`

#### What You Can Do:

1. **View All Volunteer Hours**
   - See a list of all volunteers with their total hours logged
   - Volunteers are sorted by total hours (highest to lowest)
   - Hours are displayed as "X.Xh" format (e.g., "15.5h")

2. **Search & Filter**
   - Use the search box to find volunteers by name or email
   - Results update in real-time as you type

3. **Edit Volunteer Hours**
   - Click the edit button (pencil icon) next to any volunteer
   - An input field appears with the current hour value
   - Edit the number to your desired value
   - Click save (checkmark button) to confirm
   - Or click cancel (X button) to discard changes

4. **Refresh Data**
   - Click the "Refresh" button in the top-right to reload volunteer data
   - Useful if you want to ensure you're seeing the latest information

#### Features:
- ✅ Search by name or email
- ✅ Real-time filtering
- ✅ Inline editing
- ✅ Save confirmation with success message
- ✅ Error handling with user feedback

---

## Technical Implementation

### Backend Functions

#### For Volunteers:
```typescript
// Start a check-in session
await volunteerService.startCheckIn(userId, eventId)
// Returns: CheckInSession object with checkInTime

// End check-in and log hours
await volunteerService.checkOut(sessionId, userId)
// Returns: { session, hoursAdded: number }

// Get current active session
await volunteerService.getCurrentCheckInStatus(userId)
// Returns: CheckInSession or null if not checked in
```

#### For Admins:
```typescript
// Update volunteer total hours
await volunteerService.updateVolunteerHours(userId, newTotalHours, reason?)
// Returns: Updated VolunteerProfile
```

### Data Storage

**Development Mode (LocalStorage):**
- Check-in sessions stored in `sessionStorage` with key: `checkin-${userId}`
- Volunteer profiles stored in `localStorage` with key: `pot_mock_all_profiles`

**Production Mode (Supabase):**
- Sessions stored in `check_in_sessions` table
- Total hours stored in `profiles` table `total_hours` column
- Optional audit logs in `hour_adjustments` table

### Database Schema (Supabase)

**check_in_sessions table:**
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to profiles)
- event_id (uuid)
- check_in_time (timestamp)
- check_out_time (timestamp, nullable)
- hours_logged (numeric, nullable)
- created_at (timestamp)
```

**hour_adjustments table (optional audit log):**
```sql
- id (uuid, primary key)
- user_id (uuid)
- new_total (numeric)
- reason (text)
- adjusted_at (timestamp)
```

---

## Component Files

### Frontend Components:

1. **CheckInWidget** (`/src/components/CheckInWidget.tsx`)
   - Volunteer check-in/out interface
   - Real-time timer display
   - Integrated into volunteer dashboard

2. **Admin Hours Page** (`/src/app/admin/hours/page.tsx`)
   - Volunteer hours list with search
   - Inline hour editing
   - Admin-only page

### Service Functions:

**volunteerService.ts** functions:
- `startCheckIn()` - Begin a volunteer session
- `checkOut()` - End session, calculate hours
- `updateVolunteerHours()` - Admin manual hour adjustment
- `getCurrentCheckInStatus()` - Check if volunteer is currently checked in

---

## Navigation Updates

Admin navigation now includes:
- **Dashboard** (`/admin`) - Overview stats
- **Events** (`/admin/events`) - Manage events
- **Volunteers** (`/admin/volunteers`) - View all volunteers with role management
- **Hours** (`/admin/hours`) - View and edit volunteer hours ⭐ **NEW**
- **Analytics** (`/admin/analytics`) - Event statistics
- **Forms** (`/admin/forms`) - Form management
- **Settings** (`/admin/settings`) - Admin settings

---

## Future Enhancement Ideas

1. **Event-Specific Check-In**
   - Allow check-in during specific events
   - Track which volunteers worked which events
   - Generate event reports

2. **Check-In History**
   - View past check-in sessions
   - See breakdown of hours per event
   - Export session logs

3. **Notifications**
   - Notify when check-in/out is successful
   - Remind volunteers to check out if session is too long

4. **Hour Approval Workflow**
   - Admin review and approve logged hours
   - Comment system for hour adjustments
   - Audit trail of all changes

5. **Badges & Achievements**
   - Unlock badges at different hour milestones
   - Display on member card and dashboard
   - Encourage volunteer participation

---

## Troubleshooting

### Check-In Won't Work
- Ensure you're logged in as a volunteer
- Check browser console for errors
- Try refreshing the page
- In development: Check if LocalStorage is enabled

### Hours Not Saving
- Confirm you have admin permissions
- Check if Supabase connection is active
- Try refreshing the data with the refresh button
- Check browser console for error messages

### Can't Find Hours Page
- Navigate to `/admin/hours`
- Or click "Hours" in the admin navigation menu
- Ensure you're logged in as an admin/staff member

---

## Questions or Issues?
Please report any issues or feature requests to the development team.
