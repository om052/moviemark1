# TODO: Fix Request Issues

## Issues Identified
- [x] Error in "send request" section when submitting requests
- [x] Misunderstanding about approve/decline functionality in "sent request" section

## Fixes Applied
- [x] Changed frontend to use correct endpoint `/api/requests/script-production-join` instead of `/api/requests/project-join`
- [x] Updated request payload to use `scriptId` instead of `projectId` since available projects are scripts in production

## Notes
- The "sent request" section correctly shows only status badges without action buttons - this is by design since users cannot approve/decline their own sent requests
- Only receivers (project/script owners) can approve or decline requests in the "Received Requests" tab
