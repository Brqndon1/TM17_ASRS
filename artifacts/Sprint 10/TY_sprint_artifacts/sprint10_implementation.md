# Sprint 10 — Implementation summary (Taeyoon)

**Date:** April 19, 2026  
**Focus:** Public (unauthenticated) access to published reporting, single homepage experience, survey access only via distributed links, and shared public chrome.

---

## Goals delivered

1. **Published reports without login** — Visitors can open the reporting experience and see **only** reports whose status is **published**, backed by read-only public API routes (no session required).

2. **No report downloads for the public** — Export and share UI stay **staff/admin only** (`ReportDashboard` gates `ExportPanel` / `SharePanel` on role).

3. **Surveys not discoverable from the anonymous homepage** — Logged-out users do not get a generic path into surveys from home; **survey entry** remains tied to **distribution-style query parameters** (`qr`, `dist`, `token`, `template`), with clearer gating and messaging when those are missing.

4. **One coherent public shell** — Shared header (brand, optional page title, Home when not on `/`, Log in), layout wrappers, and reporting intro / loading states so public pages feel consistent with the homepage.

5. **Login UX** — Logo on the login screen links back to the **homepage** (`/`).

---

## New API routes (unauthenticated)

| Route | Purpose |
|--------|---------|
| `GET /api/reports/public` | Returns published reports only, with initiative name joined for display. |
| `GET /api/initiatives/public` | Returns initiatives that have **at least one published** report (so the selector is not empty noise). |

Both routes use the service container database access pattern and return JSON suitable for the reporting page and (for reports) the logged-in **public** account type on the home dashboard.

---

## New and updated UI components

- **`src/components/PublicSiteHeader.js`** (new) — Client header for logged-out visitors: ASRS brand link to `/`, optional `pageTitle`, **Home** when not already on home, **Log in** to `/login`.

- **`src/components/PageLayout.js`** — When `requireAuth` is false and there is no user after hydration, renders the **public site root** (`public-site-header` + main content) instead of sidebar + top bar.

- **`src/components/InitiativeSelector.js`** — Optional **`heading`** and **`description`** props so public reporting can set community-facing copy without forking the component.

- **`src/components/ReportDashboard.js`** — Role-aware panels; public users see charts/table/insights but **not** export/share blocks.

- **`src/components/Sidebar.js`** — Minor alignment with current nav/permissions (as in sprint diff).

---

## Pages updated

- **`src/app/page.js`** — Landing for logged-out users; authenticated **public** users load published reports via `/api/reports/public` for their dashboard slice; staff flows unchanged for initiatives/reports/surveys.

- **`src/app/reporting/page.js`** — Uses `PageLayout` with **`requireAuth={false}`** so anonymous users can view reporting. Initial data: **staff/admin** use existing authenticated `apiFetch` to `/api/initiatives` and `/api/reports`; everyone else uses **`fetch('/api/initiatives/public')`** and **`fetch('/api/reports/public')`**. Adds public intro, loading, and empty states; passes custom initiative heading/description where appropriate.

- **`src/app/survey/page.js`** — **`hasDistributionAccess`** treats **`template`** as a valid distribution-style entry (with `qr`, `dist`, `token`) so copy and access checks match how template links are used.

- **`src/app/login/page.js`** — Brand/logo wrapped in **`Link href="/"`** so users can return to the marketing home without the back button.

- **`src/app/globals.css`** — Styles for **`.public-site-*`**, **`.public-reporting-*`**, and related layout so public reporting matches the rest of the public site.

---

## Files touched (git-oriented list)

**New**

- `src/app/api/reports/public/route.js`
- `src/app/api/initiatives/public/route.js`
- `src/components/PublicSiteHeader.js`

**Modified**

- `src/app/globals.css`
- `src/app/login/page.js`
- `src/app/page.js`
- `src/app/reporting/page.js`
- `src/app/survey/page.js`
- `src/components/InitiativeSelector.js`
- `src/components/PageLayout.js`
- `src/components/ReportDashboard.js`
- `src/components/Sidebar.js`

---

## Security / product notes (for reviewers)

- Public endpoints intentionally **narrow**: initiatives are scoped to those with published reports; reports are **`WHERE LOWER(status) = 'published'`** only.

- **Staff/admin** reporting still uses authenticated APIs and retains management tabs, reasons, downloads, and reorder flows as before.

- Survey **submission** behavior should still be validated server-side for distribution/token rules where applicable; this sprint’s survey work is primarily **client entry gating** and messaging.

---

## Result

Anonymous and **public**-role users get a **read-only, published-only** reporting path with **shared public chrome** and **no exports**; surveys are **not** advertised from the anonymous home path and remain **link-driven**; login branding routes users **home** cleanly.
