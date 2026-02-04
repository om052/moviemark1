# TODO: Add Script Ratings and Rankings to Admin Dashboard

## Overview
Add a new "Scripts & Ratings" section to the admin dashboard that displays:
- All scripts with their ratings data
- Rankings based on average ratings
- Detailed rating statistics

## Tasks
- [ ] Add "Scripts & Ratings" nav item to admin.html sidebar
- [ ] Create new content section in admin.html for scripts/ratings display
- [ ] Add backend routes in admin.js to fetch scripts with ratings data
- [ ] Implement ranking calculation logic based on ratings
- [ ] Update Rankings model if needed for script rankings
- [ ] Add tables and charts to display ratings and rankings
- [ ] Test the new admin section functionality

## Files to Modify
- frontend/admin.html
- backend/routes/admin.js
- backend/models/Rankings.js (if needed)

## Acceptance Criteria
- Admin can view all scripts with their ratings
- Rankings are calculated and displayed based on average ratings
- Data is properly formatted and easy to read
- Section integrates well with existing admin dashboard
