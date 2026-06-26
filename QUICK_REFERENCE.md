# Quick Reference - Time Tracking Features

## For Volunteers 👥

### Check In/Out (Volunteer Dashboard)

**Location:** Click the "Quick Check In/Out" widget on your dashboard at `/volunteer`

```
┌─────────────────────────────────────┐
│  Quick Check In/Out                 │
│  ┌─────────────────────────────────┐│
│  │ Status: Not checked in          ││
│  │ Click below to start session    ││
│  ├─────────────────────────────────┤│
│  │    [Check In] (Green Button)     │
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**Steps:**
1. Click **[Check In]** button
2. Timer starts counting your time
3. Work/volunteer
4. Click **[Check Out]** button
5. See hours logged!

**Time Display:** `HH:MM:SS` format (Hours:Minutes:Seconds)

---

## For Admins 👨‍💼

### Manage Volunteer Hours

**Location:** `/admin/hours` or click "Hours" in admin navigation

```
┌──────────────────────────────────────────┐
│ 🕐 Volunteer Hours                       │
│ ───────────────────────────────────────  │
│ [Search by name or email...] [Refresh]   │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │ Name    │ Email      │ Hours │ Action │ │
│ ├─────────┼────────────┼───────┼────────┤ │
│ │ Alice   │ a@...      │ 15.5h │ [Edit] │ │
│ │ Bob     │ b@...      │ 12.0h │ [Edit] │ │
│ │ Carol   │ c@...      │  8.5h │ [Edit] │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

**To Edit Hours:**
1. Click the **[Edit]** button (pencil icon)
2. Enter new total hours
3. Click **[Save]** (checkmark) to confirm
4. Or click **[Cancel]** (X) to discard

**To Search:**
- Type volunteer name or email in search box
- Results update automatically

---

## Quick Actions

### Volunteer Dashboard
- **URL:** `https://yoursite.com/volunteer`
- **Widget:** Quick Check In/Out (scroll down)
- **Time:** Real-time counter in HH:MM:SS format

### Admin Hours Page
- **URL:** `https://yoursite.com/admin/hours`
- **Navigate:** Admin Menu → Hours
- **Search:** By name or email
- **Edit:** Click edit button, change value, save

### Related Pages
- **Volunteer Profile:** `/volunteer` - See your total hours logged
- **Admin Dashboard:** `/admin` - See overall statistics
- **Volunteer List:** `/admin/volunteers` - Manage roles

---

## Common Questions

**Q: How do I know my hours were saved?**
A: You'll see a success message like "Checked out! 2.50 hours logged."

**Q: Can I check in/out multiple times a day?**
A: Yes! Each check-in/out session is separate.

**Q: What if I forget to check out?**
A: Your session will stay active until you manually check out.

**Q: Can admins edit my hours?**
A: Yes, admins can manually adjust hours on the `/admin/hours` page if needed.

**Q: Does it work offline?**
A: Yes! The system stores data locally if the server is unavailable.

**Q: How are hours calculated?**
A: Time is tracked from check-in to check-out. Hours = Minutes ÷ 60, rounded to 2 decimals.

---

## Keyboard Shortcuts

None yet, but buttons are large and easy to click!

---

## Time Calculation Examples

| Check In | Check Out | Duration | Hours |
|----------|-----------|----------|-------|
| 2:00 PM  | 4:00 PM   | 2 hrs    | 2.00h |
| 2:00 PM  | 4:30 PM   | 2.5 hrs  | 2.50h |
| 2:00 PM  | 4:15 PM   | 2.25 hrs | 2.25h |
| 2:30 PM  | 2:45 PM   | 15 min   | 0.25h |
| 1:00 PM  | 8:30 PM   | 7.5 hrs  | 7.50h |

---

## Troubleshooting

### Check-In Won't Work
**Problem:** Button doesn't respond
- Make sure you're logged in
- Try refreshing the page
- Check browser console for errors

### Hours Not Saving (Admin)
**Problem:** Edited hours don't appear to save
- Click Refresh button to reload data
- Check if you're logged in as admin
- Try again, may be temporary server issue

### Can't Find Hours Page
**Problem:** Where is the hours page?
- Go to `/admin/hours` directly
- Or: Admin Menu → Hours (Clock icon)
- Must be logged in as admin/staff

### Timer Seems Wrong
**Problem:** Timer is going too fast/slow
- Close other heavy apps
- Refresh the page
- Timer updates every 1 second

---

## Icons Guide

| Icon | Meaning | Location |
|------|---------|----------|
| 🕐   | Clock/Hours | Admin Hours page |
| ▶️   | Check In | Green button |
| ⏹️   | Check Out | Red button |
| 🔄  | Refresh | Admin pages |
| ✏️   | Edit | Admin hours table |
| ✅  | Save | Admin edit mode |
| ❌  | Cancel | Admin edit mode |
| 🔍  | Search | Admin pages |

---

## Settings & Preferences

### Volunteer
- No settings needed
- Widget appears automatically on dashboard

### Admin
- No settings needed
- All volunteers visible by default
- Search to filter

---

## Related Features

- **Member Card** - Print volunteer ID card (on volunteer dashboard)
- **Check-In History** - View past volunteer events (on volunteer dashboard)
- **Admin Analytics** - View event statistics (at `/admin/analytics`)
- **Volunteer Management** - Manage roles and profiles (at `/admin/volunteers`)

---

## Getting Help

- Check this quick reference first
- See `CHECK_IN_FEATURE_GUIDE.md` for detailed guide
- See `IMPLEMENTATION_GUIDE.md` for technical details
- Check browser console for error messages (F12)

---

**Need more help?** Contact your administrator or see the full documentation files.
