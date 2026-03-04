# Homepage (`page.js`) — Change Log

## 1. Auth-Restricted Routes
Added a `requiresAuth: true` flag to all routes except **Survey** and **Login**. Updated the `visibleRoutes` filter to hide these routes from logged-out users.

**Visible when logged out:** Survey, Login  
**Visible when logged in (regular user):** everything except Manage Reports and Goals & Scoring  
**Visible to Staff:** everything except Goals & Scoring  
**Visible to Admin:** everything  

Filter order:
1. `showOnlyWhenLoggedOut` — Login link
2. `adminOnly` — Goals & Scoring
3. `staffOnly` — Manage Reports
4. `requiresAuth` — all other protected routes
5. No flag (Survey) — always visible

---

## 2. Centered Grid Cards
Changed the grid layout so cards center themselves rather than stretching to fill the row. Fixes the layout when only a small number of cards are visible (e.g. logged-out view).

```js
// Before
gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'

// After
gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 220px))',
justifyContent: 'center'
```

---

## 3. Initiative Dropdown on Survey Card (Public Only)
On mount, the page fetches `/api/initiative` and stores the result in `initiatives` state.

The Survey card conditionally renders a dropdown and "Start Survey" button **only when the user is logged out**. When logged in, the card behaves as a plain link to `/survey`.

```js
fetch('/api/initiative')
  .then(res => res.json())
  .then(data => setInitiatives(Array.isArray(data.initiatives) ? data.initiatives : []))
  .catch(() => setInitiatives([]));
```

- Dropdown populated from `initiatives`, using `ini.id` as value and `ini.name` as label.
- "Start Survey" button is disabled until an initiative is selected.
- On click, navigates to `/survey?initiativeId=<id>`.
- The dropdown wrapper uses `e.preventDefault()` to prevent the outer card link from firing when interacting with the dropdown or button.

---

## 4. Fixed Nested `<a>` Hydration Error
Removed the `<Link>` wrapper around the "Start Survey" button, which was causing a React hydration error (`<a> cannot be a descendant of <a>`).

Replaced with `useRouter` for programmatic navigation:

```js
import { useRouter } from 'next/navigation';

const router = useRouter();

// In button onClick:
onClick={e => {
  e.preventDefault();
  if (selectedInitiative) router.push(`/survey?initiativeId=${selectedInitiative}`);
}}
```

---

## 5. Dropdown Hidden for Logged-In Users
The initiative dropdown and "Start Survey" button are now only shown on the public (logged-out) side of the homepage.

```js
// Before
{isSurvey && ( ... )}

// After
{isSurvey && !isLoggedIn && ( ... )}
```