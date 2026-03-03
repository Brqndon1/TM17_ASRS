# Sprint 4 - Role and Access Updates (Taeyoon)

## Summary

During Sprint 4, I updated role-based behavior across the Initiatives and Reporting flows so staff and admin access matches the product expectations. I also cleaned up the Initiative Creation page by removing categories from that flow and restricting custom attribute creation to admin users only.

## What I Implemented

- Enabled both **staff** and **admin** users to access the **Initiatives** page.
- Added **admin-only** custom attribute creation on Initiative Creation.
- Removed **categories UI and categories submission/linking logic** from Initiative Creation.
- Ensured **Reporting page access is restricted to staff/admin**, with a clear access-required state for public users.
- Updated header navigation so **Initiatives** is visible for logged-in staff/admin users.

## Files Updated

- `src/app/initiative-creation/page.js`
- `src/app/reporting/page.js`
- `src/components/Header.js`

## Behavior Changes

- **Initiative Creation**
  - Staff can open and use the page.
  - Admin can add custom attributes dynamically.
  - Categories section and related actions were removed from this page.
- **Reporting**
  - Public users no longer have full report access.
  - Staff/admin retain full reporting access.
- **Navigation**
  - Initiative link now appears in logged-in staff/admin navigation.

## Validation Performed

- Checked edited files for linter diagnostics: no lint errors.
- Verified role-logic consistency in page-level checks and header visibility rules.

## Evidence to Attach

- Screenshot: staff user viewing Initiative Creation page
- Screenshot: admin adding a custom attribute
- Screenshot: Initiative Creation page without categories section
- Screenshot: public user blocked from Reporting page
- Screenshot: staff/admin successfully viewing Reporting page
