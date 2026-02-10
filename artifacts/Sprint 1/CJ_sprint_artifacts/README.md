# ASRS Initiatives Reporting System — Report UI

## README for the Team

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [What Does the Page Look Like?](#2-what-does-the-page-look-like)
3. [Preparing Your Computer](#3-preparing-your-computer)
4. [Creating the Project](#4-creating-the-project)
5. [File Map — Where Every File Goes & What It Does](#5-file-map--where-every-file-goes--what-it-does)
6. [How to Run the Project](#6-how-to-run-the-project)
7. [Troubleshooting Common Errors](#7-troubleshooting-common-errors)
8. [Files That Will Need Adjustment Later](#8-files-that-will-need-adjustment-later)

---

## 1. What Is This Project?

This is the **front-end reporting page** for the ASRS Initiatives Reporting System. ASRS runs 7 educational initiatives (E-Gaming and Careers, Drive Safe Robotics, ELA Achievement, Bags2School, PSLA Track Team, Organization Proposals, and Amazon Product Reimagining). This page allows users to:

- Select any of the 7 initiatives
- View charts and graphs for that initiative (pie charts, bar charts, line charts)
- View a data table of individual records
- Filter the data by up to 7 attributes (like Grade, School, etc.)
- Sort the data by up to 7 levels (ascending or descending)
- See trend analysis results (whether things are going up, down, or staying the same)
- Export reports as CSV, XLSX, PDF, or HTML (Staff and Admin only)
- Share reports to social media or generate embed codes for the ASRS website

**This is ONE single page.** Even though there are multiple files, they all come together to create one scrollable page that the user sees. The multiple files are just how React organizes code — like building a car from separate parts (engine, wheels, doors) that all become one car.

**Right now, the page uses dummy data** stored in JSON files. This is fake data so we can test the UI. Later, when the database and API are built by the other team(s), we will swap out the dummy data for real data. The code is written so that this swap will be easy — there is ONE file where the swap happens, and it is clearly marked.

---

## 2. What Does the Page Look Like?

When you open the page, here is what you see from top to bottom:

```
┌─────────────────────────────────────────────────────────────┐
│  [ASRS LOGO]   ASRS Initiatives              Viewing as: ▼ │
│                 Reporting System              [Public User]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Select Initiative                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ E-Gaming │ │ Robotics │ │ELA Awards│ │Bags2School│ ...   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  E-Gaming and Careers                                       │
│  Report ID: RPT-a1b2c3d4...         Generated: 2025-11-15  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  Total: 247  │ │ Rating: 4.3  │ │ Complete: 87% │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                             │
│  [Charts & Table] [Charts Only] [Table Only]   [CSV][XLSX]  │
│                                                [PDF][HTML]  │
│                                                [Share]      │
├──────────────────────┬──────────────────────────────────────┤
│  Filters (0/7)       │  Sort (0/7)                          │
│  Grade: [All ▼]      │  [+ Add Level]                       │
│  School: [All ▼]     │                                      │
│  ...                 │                                      │
├──────────────────────┴──────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ PIE CHART        │  │ BAR CHART        │                 │
│  │ (Grade Dist.)    │  │ (Monthly Data)   │                 │
│  └──────────────────┘  └──────────────────┘                 │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │ LINE CHART       │  │ BAR CHART        │                 │
│  │ (Trends)         │  │ (Interest Lvls)  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Data Table                                                 │
│  ┌───────┬────────┬──────────┬─────────┬──────┐            │
│  │ Grade │ School │ Interest │ Rating  │ ...  │            │
│  ├───────┼────────┼──────────┼─────────┼──────┤            │
│  │ 7th   │Lincoln │ Very High│  4.8    │ ...  │            │
│  │ 8th   │Wash.   │ High     │  4.2    │ ...  │            │
│  └───────┴────────┴──────────┴─────────┴──────┘            │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Trend Analysis                                             │
│  ┌─────────────────────────────────────────┐                │
│  │ ↑ Increasing (12.5%)                    │                │
│  │ Attributes: Participation Count         │                │
│  │ Period: Sep 2025 - Jan 2026             │                │
│  │ Participation has been steadily...      │                │
│  └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

The background of the entire page is a light beige color. The ASRS logo appears in the top-left corner. Clicking a different initiative card reloads all the charts, table, and trends with that initiative's data.

The "Viewing as" dropdown in the header lets you test different user roles:
- **Public User** — Sees charts, table, filters, sorts, trends, and share button
- **Staff User** — Sees everything Public sees PLUS export buttons (CSV, XLSX, PDF, HTML)
- **Admin User** — Same as Staff (in the current UI sprint)

---

## 3. Preparing Your Computer

You need THREE things set up before you can work on this project.

### 3A. Install Node.js

Node.js is the engine that runs our project. Without it, nothing works.

1. Go to **https://nodejs.org**
2. Click the big green button that says **"LTS"** (Long Term Support)
3. Run the downloaded installer
4. Click **Next** through all the screens, accepting all defaults
5. When it asks about "Automatically install necessary tools," **check that box**
6. Click **Install**, then **Finish**

**To verify it worked:**
- Open VS Code
- Open the terminal: press **Ctrl + `** (the backtick key, above Tab)
- Type: `node --version`
- You should see something like `v22.11.0` (the exact number doesn't matter, as long as it's 20 or higher)

If you see "not recognized," **completely close VS Code and reopen it**, then try again.

### 3B. Install Visual Studio Code (if you don't have it)

1. Go to **https://code.visualstudio.com**
2. Download and install it
3. Open it

### 3C. Install VS Code Extensions

Extensions are add-ons that make VS Code smarter about the code we're writing.

1. Open VS Code
2. Press **Ctrl + Shift + X** to open the Extensions panel
3. Search for and install each of these (click the blue "Install" button for each one):

| Extension Name | Author | What It Does |
|---|---|---|
| **ES7+ React/Redux/React-Native snippets** | dsznajder | Gives you shortcuts for writing React code faster |
| **Tailwind CSS IntelliSense** | Tailwind Labs | Auto-completes CSS class names as you type |
| **Prettier - Code formatter** | Prettier | Automatically formats your code to look clean |
| **ESLint** | Microsoft | Highlights coding mistakes and warnings |

These are optional but **strongly recommended**. They make your life much easier.

---

## 4. Creating the Project

Follow these steps **in order**. Do them one at a time. Do not skip any.

### Step 1: Open your terminal in VS Code

Press **Ctrl + `** (backtick key, above Tab).

**IMPORTANT:** If you see "PowerShell" in your terminal, you might get a script error. If that happens, type this first:

```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Type `Y` and press Enter when asked. You only need to do this once ever.

**Alternative:** If that doesn't work, click the dropdown arrow next to the **+** button at the top-right of the terminal panel, and select **"Command Prompt"** instead of PowerShell.

### Step 2: Navigate to where you want the project folder

Pick somewhere easy to find. Your Desktop is a good choice:

```
cd Desktop
```

### Step 3: Create the Next.js project

```
npx create-next-app@latest asrs-reporting-ui
```

If it asks "Ok to proceed? (y)" — type `y` and press Enter.

Then it will ask you a series of questions. **Answer them exactly like this:**

| Question | Your Answer |
|---|---|
| What is your project named? | `asrs-reporting-ui` (should be pre-filled, just press Enter) |
| Would you like to use TypeScript? | **No** |
| Which linter would you like to use? | **ESLint** |
| Would you like to use Tailwind CSS? | **Yes** |
| Would you like your code inside a `src/` directory? | **Yes** |
| Would you like to use App Router? | **Yes** |
| Would you like to customize the import alias? | **No** |

Wait for it to finish. It may take 1-3 minutes.

### Step 4: Go into the project folder

```
cd asrs-reporting-ui
```

### Step 5: Install the charting library

```
npm install recharts
```

This adds the library that draws our pie charts, bar charts, and line charts. Wait for it to finish.

### Step 6: Create the three new folders we need

```
mkdir src\data
mkdir src\components
mkdir src\lib
```

If `mkdir` gives an error in PowerShell, use this instead:
```
New-Item -ItemType Directory -Path src\data
New-Item -ItemType Directory -Path src\components
New-Item -ItemType Directory -Path src\lib
```

### Step 7: Add the ASRS logo

Take the ASRS logo image file, rename it to **`asrs-logo.png`**, and drag it into the **`public/`** folder inside your project.

### Step 8: Create all the files

Now you create each file listed in Section 5 below. In VS Code:
- Right-click on the correct folder in the left sidebar
- Click **"New File"**
- Name it exactly as shown
- Paste in the code

### Step 9: Open the project in VS Code

If you haven't already, open the full project folder in VS Code:
- File → Open Folder → Navigate to `Desktop/asrs-reporting-ui` → Click "Select Folder"

Now you should see the full file tree in the left sidebar.

---

## 5. File Map — Where Every File Goes & What It Does

Below is every file in the project, its exact location, and a plain-English description.

### Files That Already Exist (you REPLACE their contents)

---

#### `src/app/globals.css`
**Location:** `src/app/globals.css` (already exists — REPLACE all its contents)

**What it does:** This is the master stylesheet for the entire page. It sets the light beige background color, defines the ASRS brand colors (red, orange, yellow from the logo), and creates reusable styles like the card design and button styles. It also has the CSS that makes the data table convert to a phone-friendly card layout on small screens.

**Will this be adjusted later?** No. This file is purely visual styling and doesn't touch data.

---

#### `src/app/layout.js`
**Location:** `src/app/layout.js` (already exists — REPLACE all its contents)

**What it does:** This is the outermost wrapper of the entire website. In Next.js, every page gets wrapped by this file. It sets the HTML page title (what shows in the browser tab: "ASRS Initiatives Reporting System") and loads the global stylesheet. Think of it as the picture frame — it doesn't have content itself, but it holds everything together.

**Will this be adjusted later?** No.

---

#### `src/app/page.js`
**Location:** `src/app/page.js` (already exists — REPLACE all its contents)

**What it does:** **This is THE page.** This is the one and only page users see. It is the "assembler" that puts all the building blocks together. When someone visits `http://localhost:3000`, this is what loads. It:
- Loads the list of initiatives when the page first opens
- Tracks which initiative the user has selected
- Loads report data and trend data for the selected initiative
- Passes all that data down to the visual components (Header, Charts, Table, etc.)
- Shows a loading spinner while data is being fetched

**Will this be adjusted later?** No. This file calls `dataService.js` to get its data, and `dataService.js` is where the swap happens. This file doesn't need to know or care whether the data comes from JSON files or a real API.

---

### Files You CREATE — Data Files

These are the dummy/fake data files. They simulate what the real database API will eventually return.

---

#### `src/data/initiatives.json`
**Location:** Create this file inside `src/data/`

**What it does:** Contains the list of all 7 ASRS initiatives. Each initiative has an ID, a name, a description, and a list of its attribute names (like "Grade," "School," "Interest Level"). This data populates the initiative selector cards at the top of the page and tells the filter/sort panels what attributes are available.

**Will this be adjusted later?** YES — but not directly. When the API is ready, this file won't be needed anymore because `dataService.js` will fetch the initiative list from the API instead of from this file. You can delete this file once the API is live.

---

#### `src/data/reportData.json`
**Location:** Create this file inside `src/data/`

**What it does:** Contains ALL the report data for ALL 7 initiatives. For each initiative, it includes:
- A unique report ID (UUID)
- Summary statistics (total participants, average rating, completion rate)
- Chart data (grade distribution for pie chart, monthly participation for bar/line charts, interest levels for horizontal bar chart)
- Table data (individual rows of records that show in the data table)

This is the biggest data file and the most important one. The charts, the summary cards, and the data table all read from this file.

**Will this be adjusted later?** YES — same as above. When the API is ready, `dataService.js` will fetch report data from the API instead of this file. You can delete this file once the API is live.

---

#### `src/data/trendData.json`
**Location:** Create this file inside `src/data/`

**What it does:** Contains trend analysis results for each initiative. Each trend has:
- A unique trend ID
- The report it belongs to (linked by report ID)
- Which attributes are being analyzed (1 to 3 attributes)
- Direction: up (increasing), down (decreasing), or stable
- Magnitude: how much the trend changed (as a percentage)
- Time period the trend covers
- Whether the trend is enabled for display
- A human-readable description of what the trend means

**Will this be adjusted later?** YES — same as above.

---

### Files You CREATE — The Data Service (THE MOST IMPORTANT FILE FOR FUTURE CHANGES)

---

#### `src/lib/dataService.js`
**Location:** Create this file inside `src/lib/`

**⚠️ THIS IS THE #1 FILE THAT WILL BE ADJUSTED WHEN THE API IS READY. ⚠️**

**What it does:** This is the **central hub** where ALL data fetching happens. Every component in the project gets its data through this file. Right now, it reads from the local JSON files. Think of it as a librarian — components ask the librarian for data, and the librarian goes and gets it. Right now, the librarian walks to the bookshelf (JSON files). Later, the librarian will make a phone call (API request) instead.

**What will change later:** Inside this file, there are 5 functions. Each one has a comment block marked `[API ADJUSTMENT]` that tells you EXACTLY what to change. In short:
1. Delete the 3 import lines at the top (the ones that import JSON files)
2. In each function, replace the `return` line with a `fetch()` call to your API endpoint
3. The comments inside the file give you copy-paste-ready example code for the API calls

**Why it's designed this way:** By keeping all data fetching in ONE file, the rest of the project doesn't need to change at all when you switch to real data. The 10 component files will work exactly the same way.

---

### Files You CREATE — Components (Building Blocks of the Page)

All of these go inside `src/components/`. None of these are separate pages — they are pieces that get assembled together inside `page.js`.

---

#### `src/components/Header.js`
**Location:** Create this file inside `src/components/`

**What it does:** The dark bar at the very top of the page. Displays the ASRS logo, the title "ASRS Initiatives / Reporting System," and a dropdown menu to switch between Public, Staff, and Admin views.

**Will this be adjusted later?** YES — when real authentication (login system) is implemented. The role selector dropdown will be REMOVED because the system will know the user's role automatically from their login session. The comments in the file explain this.

---

#### `src/components/InitiativeSelector.js`
**Location:** Create this file inside `src/components/`

**What it does:** The row of 7 clickable cards just below the header. Each card represents one ASRS initiative. Clicking a card tells the page to load that initiative's report data. The selected card gets highlighted with a colored border and shadow so you can see which one is active.

**Will this be adjusted later?** No.

---

#### `src/components/ReportDashboard.js`
**Location:** Create this file inside `src/components/`

**What it does:** This is the "brain" component — the big container that holds everything below the initiative selector. It assembles the report header (initiative name, UUID, date), the three summary statistic cards, the view toggle buttons (Charts/Table/Both), and all the sub-components (filters, sorts, charts, table, trends, export, share). It also handles the logic for applying filters and sorts to the table data.

**Will this be adjusted later?** No.

---

#### `src/components/FilterPanel.js`
**Location:** Create this file inside `src/components/`

**What it does:** A panel with dropdown menus for each attribute (Grade, School, Interest Level, etc.). Users can select values to filter the data table — for example, showing only "7th Grade" students from "Lincoln MS." The panel enforces a maximum of 7 active filters at a time (as required by the project spec). When you hit the limit, remaining dropdowns become disabled and a warning message appears.

**Will this be adjusted later?** No. Filtering currently happens in the browser. When the API is ready, filtering could optionally be done server-side, but the UI component stays the same.

---

#### `src/components/SortPanel.js`
**Location:** Create this file inside `src/components/`

**What it does:** Lets users add up to 7 levels of sorting. Each level has a dropdown to pick an attribute (like "Grade") and a toggle for direction (A→Z or Z→A). Sort levels are numbered by priority — Sort Level 1 is applied first, then Level 2 breaks ties, and so on. Users can add, remove, and reorder sort levels.

**Will this be adjusted later?** No. Same reasoning as FilterPanel.

---

#### `src/components/ChartDisplay.js`
**Location:** Create this file inside `src/components/`

**What it does:** Renders four charts using the `recharts` library:
1. **Pie Chart** — Shows how participants are distributed across grade levels
2. **Bar Chart** — Shows monthly enrollment vs. completion counts
3. **Line Chart** — Shows participation trends over time
4. **Horizontal Bar Chart** — Shows interest level distribution

All charts are responsive (they resize to fit the screen) and use the ASRS brand colors.

**Will this be adjusted later?** No. The charts just display whatever data they receive. When the real data comes through, the charts will automatically show the real numbers.

---

#### `src/components/DataTable.js`
**Location:** Create this file inside `src/components/`

**What it does:** Displays the report data in a traditional table with rows and columns. Shows a record count at the top. Column headers are auto-generated from the data keys (e.g., "sessionRating" becomes "Session Rating"). Rows highlight on mouse hover. On mobile phones, the table transforms into stacked cards instead of a wide table that requires horizontal scrolling.

**Will this be adjusted later?** No.

---

#### `src/components/TrendDisplay.js`
**Location:** Create this file inside `src/components/`

**What it does:** Shows trend analysis cards at the bottom of the report. Each trend card shows:
- A colored arrow (green ↑ for increasing, red ↓ for decreasing, yellow → for stable)
- The percentage of change
- Which attributes are being compared
- The time period
- A plain-English description of the trend
- The trend's unique ID

Only trends that are "enabled for display" appear here.

**Will this be adjusted later?** No.

---

#### `src/components/ExportPanel.js`
**Location:** Create this file inside `src/components/`

**What it does:** Shows four small buttons: CSV, XLSX, PDF, HTML. These are ONLY visible when the user role is set to Staff or Admin (Public users don't see them). Clicking PDF opens a sub-menu with three options: Charts Only, Data Table Only, or Both. Right now, clicking any export button shows an alert message since there's no backend yet.

**Will this be adjusted later?** YES — when the backend export API is ready. The alert messages will be replaced with actual API calls that download real files. The comments in the file give you exact example code for how to make these API calls.

---

#### `src/components/SharePanel.js`
**Location:** Create this file inside `src/components/`

**What it does:** A "Share" button that opens a dropdown with four options:
- **Facebook** — Opens Facebook's share dialog with the report URL
- **LinkedIn** — Opens LinkedIn's share dialog with the report URL
- **QR Code (Instagram)** — Will generate a QR code PNG (placeholder for now)
- **Embed on Website** — Copies an iframe embed code to your clipboard (for Wix)

**Will this be adjusted later?** YES — the placeholder report URL needs to be updated to the real deployed URL, and the QR code button needs to call a real QR code generation API. The comments in the file explain exactly what to change.

---

## 6. How to Run the Project

After all files are created and saved:

### Starting the project:
1. Open VS Code
2. Make sure you have the `asrs-reporting-ui` folder open (File → Open Folder)
3. Open the terminal: **Ctrl + `**
4. Type:
```
npm run dev
```
5. Wait a few seconds. You'll see a message like:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```
6. Open your web browser (Chrome, Edge, Firefox — any of them)
7. Go to: **http://localhost:3000**
8. You should see the ASRS Reporting page!

### Stopping the project:
- Go back to the VS Code terminal
- Press **Ctrl + C**
- If it asks "Terminate batch job?" type `Y` and press Enter

### Restarting after making changes:
- Most changes update automatically (the page refreshes by itself)
- If something looks broken, stop the server (Ctrl+C) and start it again (`npm run dev`)

---

## 7. Troubleshooting Common Errors

### "npx is not recognized" or "scripts disabled"
Run this in PowerShell first:
```
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Or switch to Command Prompt (dropdown arrow next to + in terminal).

### "Module not found: Can't resolve '@/components/...'"
- Make sure the file exists in `src/components/`
- Make sure the file name matches EXACTLY (capital letters matter)
- Make sure the file has a `.js` extension

### "Module not found: Can't resolve '@/data/...'"
- Make sure the JSON file exists in `src/data/`
- Make sure the file name matches exactly

### "Module not found: Can't resolve 'recharts'"
You forgot to install it. Run:
```
npm install recharts
```

### The page is blank or shows the default Next.js starter page
- Make sure you replaced the contents of `src/app/page.js` with our code
- Make sure the file starts with `'use client';`

### Charts aren't showing
- Make sure `npm install recharts` completed without errors
- Restart the dev server (Ctrl+C, then `npm run dev`)

### Logo isn't showing
- Make sure `asrs-logo.png` is in the `public/` folder (NOT in `src/`)
- Make sure the file name is exactly `asrs-logo.png` (lowercase)

---

## 8. Files That Will Need Adjustment Later

Here is a quick-reference summary of which files will change when the database and API are built:

| File | What Changes | Difficulty |
|---|---|---|
| `src/lib/dataService.js` | Replace JSON imports with `fetch()` API calls | Easy — comments give you exact code |
| `src/data/initiatives.json` | DELETE this file (API replaces it) | Just delete |
| `src/data/reportData.json` | DELETE this file (API replaces it) | Just delete |
| `src/data/trendData.json` | DELETE this file (API replaces it) | Just delete |
| `src/components/Header.js` | Remove role selector, use real auth | Medium |
| `src/components/ExportPanel.js` | Replace alerts with real download calls | Easy — comments give you exact code |
| `src/components/SharePanel.js` | Update URL and QR code generation | Easy — comments give you exact code |

**Files that will NOT change:**
- `globals.css` — Styling only, no data
- `layout.js` — Structural wrapper, no data
- `page.js` — Gets data through `dataService.js`, doesn't need to change
- `InitiativeSelector.js` — Just displays what it receives
- `ReportDashboard.js` — Just assembles components
- `FilterPanel.js` — Just UI controls
- `SortPanel.js` — Just UI controls
- `ChartDisplay.js` — Just draws charts from data it receives
- `DataTable.js` — Just displays rows from data it receives
- `TrendDisplay.js` — Just displays trends from data it receives

The key takeaway: **`dataService.js` is the ONE file that bridges dummy data and real data.** When the API team is ready, that's where the switch happens. Every comment marked `[API ADJUSTMENT]` in the codebase tells you exactly what to do.

---

*Last updated: February 2026*
*Project: ASRS Initiatives Reporting System — CIS 453/454 Capstone*