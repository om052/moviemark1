# Fix Available Projects Issue

## Problem
- Admin-created projects don't show up in "Available Projects" section
- Users can't send join requests to admin projects
- Only scripts in production status are shown
- Send request functionality had issues with error handling and validation

## Solution
- Modify `/api/projects/available` endpoint to include both:
  1. Scripts in production status (existing)
  2. Projects where user is not owner and not collaborator (new)
- Enhanced `sendProjectJoinRequest` function with better error handling, validation, and user feedback

## Tasks
- [x] Update `/api/projects/available` endpoint in `backend/routes/projects.js`
- [x] Fix send request functionality in `frontend/dashboard.html`
- [ ] Test that admin projects appear in dashboard
- [ ] Verify join request functionality works for projects
