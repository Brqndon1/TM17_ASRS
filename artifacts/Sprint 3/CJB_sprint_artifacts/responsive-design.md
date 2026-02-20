# Responsive Design — Reporting Page
## Task: Make the Reporting Page Work on All Screen Sizes

---

## What Is Responsive Design?

Responsive design means a webpage **automatically adjusts its layout** depending on how wide the screen is.
Instead of one fixed layout that only looks good on a laptop, the page reshapes itself so it looks clean on a phone, a tablet, a laptop at half-width, a full desktop monitor, and even a TV.

---

## Files Changed

| File | What Changed |
|---|---|
| `src/app/layout.js` | Added proper viewport settings |
| `src/app/globals.css` | Added all responsive CSS classes and breakpoints |
| `src/components/Header.js` | Added hamburger menu for mobile |
| `src/components/InitiativeSelector.js` | Switched grid to CSS class |
| `src/app/reporting/page.js` | Switched section wrappers and download bar to CSS classes |
| `src/components/ReportDashboard.js` | Switched grids/bars to CSS classes |
| `src/components/ChartDisplay.js` | Switched chart grid to CSS class |

---

## Breakpoints (Screen Size Rules)

A **breakpoint** is a screen width where the layout changes. Think of it like this: at a certain point the screen gets small enough that stacking things vertically looks better than placing them side by side.

| Breakpoint | Screen Type | What Changes |
|---|---|---|
| ≥ 2400px | Very large TV | Max content width grows to 2200px, text slightly larger |
| ≥ 1600px | Large monitor / TV | Max content width grows to 1800px, cards get more padding |
| ≤ 1024px | Tablet landscape / laptop at ~75% | Hamburger menu replaces nav links; chart columns compress to 280px min |
| ≤ 768px | Tablet portrait / phone landscape | Card padding tightens, download bar stacks, initiative cards shrink |
| ≤ 480px | Small smartphone | Summary stats stay side-by-side (auto-fit), page padding shrinks further |

---

## Detailed Change-by-Change Explanation

### 1. `layout.js` — Viewport Meta Tag
**What it does:** Tells the browser "fit this page to the actual device screen width."
Without this, mobile browsers zoom out and show a tiny desktop-sized page.

```js
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
```

Also updated the page title from "Create Next App" to "ASRS Initiatives — Reporting System".

---

### 2. `globals.css` — The Responsive Engine

This is where all the breakpoint logic lives. Instead of writing screen-size logic in every component, we defined **CSS utility classes** that components use. Media queries on those classes then handle all screen sizes in one place.

**New layout classes added:**

- `.page-section` / `.page-section-top` / `.page-section-bottom` — controls page-level padding that shrinks on small screens
- `.initiative-grid` — the row of initiative cards (adjusts min card width at each breakpoint)
- `.summary-grid` — the 3 stat cards (3-across on tablet, 1-column on phone)
- `.chart-grid` — the 4 charts (2-column on desktop, 1-column on phone)
- `.filter-sort-grid` — Filter and Sort panels (side-by-side on desktop, stacked on phone)
- `.view-toggle-bar` — the toolbar with Charts/Table/Both buttons (horizontal on desktop, vertical on phone)
- `.view-toggle-buttons` — the 3 view toggle buttons (fill full width on small phone)
- `.action-buttons-group` — Export/Share buttons (wraps gracefully)
- `.download-bar-inner` — Download Report label + buttons row (stacks on phone)
- `.download-btn-group` — the PDF/CSV/XLSX/HTML buttons (fills width on phone)
- `.header-hamburger` — the ☰ menu button (hidden on desktop, shown at ≤ 1024px)
- `.header-nav-area` — the nav bar right section (normal row on desktop, full-width dropdown at ≤ 1024px)
- `.header-nav-links` — the navigation links (horizontal row on desktop, vertical list in dropdown)

**Large screen rules (≥ 1600px, ≥ 2400px):**
Content width expands, card padding increases, base font size slightly increases so the page doesn't look tiny on a TV or 4K monitor.

**Tablet/laptop rules (≤ 1024px):**
Charts compress from 350px minimum to 280px minimum. The hamburger menu replaces the nav link row — there are too many links (Home, Form Creation, Survey, Report Creation, Reporting, Goals, Initiatives, User Management) to fit cleanly at this width.

**Mid-size screen rules (≤ 768px):**
- Card padding drops from 1.5rem to 1rem to save space
- Cards no longer lift on hover (lifting is a mouse feature, not a touchscreen feature)
- Download bar stacks label above buttons
- Initiative cards use a smaller minimum width (140px instead of 170px)
- Charts, filter/sort panels, and the toolbar do **not** force-stack — the CSS auto-fit grid collapses them naturally only when there is genuinely not enough room, preserving the side-by-side design as long as possible

**Small phone rules (≤ 480px):**
- Summary stats use auto-fit (stay side-by-side where possible, never forced into a single column)
- Initiative cards use 120px minimum
- Page padding shrinks to 0.75rem
- View toggle and download buttons expand to fill the full row width

---

### 3. `Header.js` — Hamburger Menu

**The problem:** The app has up to 9 nav links when logged in as admin. On screens narrower than about 1024px, those links crowd and overlap before a mobile breakpoint was ever reached, looking broken and unprofessional.

**The fix:** A hamburger button (the three-line ☰ icon) now appears at ≤ 1024px. Clicking it opens a full-width dropdown showing all nav links in a vertical list. Also fixed a bug where the dropdown was anchoring to a small inner div instead of the full header — the dropdown now correctly spans the full page width.

**How it works in code:**
- Added `menuOpen` state (`true`/`false`) using `useState`
- Added a `headerRef` using `useRef` so the app can detect clicks outside the menu
- Added a `useEffect` that closes the menu when you click anywhere outside the header
- Added the `<button className="header-hamburger">` with 3 `<span>` lines
- Wrapped the nav and user-info section in `<div className={`header-nav-area${menuOpen ? ' open' : ''}`}>`
- The CSS hides `.header-nav-area` at ≤ 1024px by default and shows it when the `open` class is present
- Removed `position: relative` from the right section div so the absolute-positioned dropdown anchors to the full-width header instead of the narrow right div
- Changed the nav links from an inline `<nav style={{...}}>` to `<nav className="header-nav-links">` so CSS media queries can make them vertical

---

### 4. `InitiativeSelector.js` — Initiative Card Grid

**The problem:** The initiative card grid used an inline `style={{ display: 'grid', gridTemplateColumns: '...', gap: '...' }}`. Inline styles cannot be overridden by CSS media queries.

**The fix:** Replaced the inline style object with `className="initiative-grid"`. The CSS class then controls the grid at each breakpoint.

```jsx
// Before
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem' }}>

// After
<div className="initiative-grid">
```

---

### 5. `reporting/page.js` — Page Sections and Download Bar

**Three types of changes:**

**Section wrappers:** The Back Button, Initiative Selector, and Report Dashboard sections all had inline `maxWidth: '1400px', padding: '...'` styles. These were replaced with CSS classes:
```jsx
// Before
<div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem 1.5rem 0' }}>
// After
<div className="page-section-top">
```
This lets the CSS breakpoints control padding at each screen size.

**Download bar layout:** The "Download Report" header and its PDF/CSV/XLSX/HTML buttons were in a `display: flex` inline style. On mobile, this caused the buttons to overflow or squish. Now:
- The outer card keeps its background color as inline style (that never changes)
- A new inner `<div className="download-bar-inner">` handles the flex layout
- The buttons are wrapped in `<div className="download-btn-group">`
- CSS stacks them vertically on mobile and makes them fill full width on small phones

---

### 6. `ReportDashboard.js` — Grids and Toolbar

Three grid/flex containers were converted from inline styles to CSS classes:

**Summary stats grid:**
```jsx
// Before
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
// After
<div className="summary-grid">
```

**View toggle toolbar:**
```jsx
// Before
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
  <div style={{ display: 'flex', gap: '0.5rem' }}>       {/* buttons */}
  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>  {/* export */}
// After
<div className="view-toggle-bar">
  <div className="view-toggle-buttons">
  <div className="action-buttons-group">
```

**Filter + Sort panels grid:**
```jsx
// Before
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
// After
<div className="filter-sort-grid">
```

---

### 7. `ChartDisplay.js` — Chart Grid

Same pattern as above:
```jsx
// Before
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1rem' }}>
// After
<div className="chart-grid">
```

---

## How to Test

### Setup on Your Device

**Requirements (same as the project's main requirements):**
- Node.js 18 or newer — download from [nodejs.org](https://nodejs.org)
- npm (comes with Node.js)
- A modern browser (Chrome, Firefox, Edge, or Safari)

**Steps to run the project:**

1. Clone or pull the latest code from Git
2. Open a terminal and navigate to the project folder:
   ```
   cd "CIS 454 - ASRS Project/TM17_ASRS"
   ```
3. Install dependencies (only needed the first time or after pulling new package changes):
   ```
   npm install
   ```
4. Start the development server:
   ```
   npm run dev
   ```
5. Open your browser and go to: `http://localhost:3000/reporting`

> **Important:** The database file (`data/asrs.db`) is NOT included in Git (it is gitignored). When you run the app for the first time, it will auto-create a fresh database with seed data. You will need to go to `/report-creation`, create a report for an initiative, then come back to `/reporting` to see data.

---

### Testing Responsive Behavior

You do NOT need a phone to test this. Your browser's built-in Developer Tools let you simulate any screen size.

**In Chrome or Edge:**
1. Go to `http://localhost:3000/reporting`
2. Press `F12` (or right-click → Inspect)
3. Click the **Toggle Device Toolbar** icon (looks like a phone + tablet icon) near the top-left of DevTools, or press `Ctrl+Shift+M`
4. Use the dropdown at the top to select a preset device (iPhone SE, iPad, etc.) OR type a custom width in the width box

**Sizes to test:**

| Test | Width | What to Look For |
|---|---|---|
| TV / 4K monitor | 2560px | Content max-width expands, text slightly larger |
| Full desktop | 1440px | All nav links visible in a row, 2×2 chart grid, 3 stat cards side-by-side |
| Laptop | 1280px | Same as desktop |
| Laptop at ~75% | 1024px | Hamburger menu appears, nav collapses to dropdown |
| Tablet / half-screen | 768px | Card padding tightens, download bar stacks, side-by-side panels preserved |
| Large phone (landscape) | 812px | Hamburger dropdown, side-by-side panels still visible where space allows |
| Standard phone (iPhone 14) | 390px | Charts/panels collapse only where genuinely too narrow, download buttons fill width |
| Small phone (iPhone SE) | 375px | Same as above, tightest padding |

**What to verify at each size:**
- [ ] Header: hamburger button appears at ≤ 1024px and opens a full-width dropdown nav
- [ ] Header: no nav text overflow or clipping at any size
- [ ] Initiative cards: wrap cleanly into the available width
- [ ] Summary stats (3 cards): stay side-by-side at all sizes; only collapse if screen is genuinely too narrow
- [ ] Charts: 2-per-row on desktop/tablet, collapse to 1 naturally only when too narrow
- [ ] Filter + Sort panels: stay side-by-side at all reasonable sizes; only collapse when truly too narrow
- [ ] Data table: converts to card layout on mobile (column names appear as labels on the left)
- [ ] Download bar: label + buttons are side-by-side on desktop, stacked on phone
- [ ] No horizontal scrollbar appears on any screen (content fits within viewport)

---

## Common Problems and Fixes

**Problem:** Styles don't look right after pulling the code.
**Fix:** Make sure you ran `npm install`. Then do a hard refresh in the browser (`Ctrl+Shift+R`).

**Problem:** The database file is missing or empty.
**Fix:** The `data/` folder is gitignored. This is by design. Run `npm run dev` once and the database will be created automatically. You still need to create a report through `/report-creation` before you see anything on the reporting page.

**Problem:** Port 3000 is already in use.
**Fix:** Either stop the other process, or run `npm run dev -- -p 3001` to use port 3001. Then open `http://localhost:3001/reporting`.

**Problem:** The hamburger menu doesn't close after clicking a link.
**Fix:** This is a known limitation of the current implementation. Click the hamburger button again to close it, or click anywhere outside the header.
