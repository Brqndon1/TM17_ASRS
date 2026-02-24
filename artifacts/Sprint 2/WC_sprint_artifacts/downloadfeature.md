US-026 — Multi-Format Report Export (Reporting Page Update)

Overview

For this update, I added the ability to download initiative reports directly from the Reporting page. The goal was to make the reporting dashboard more practical — instead of just viewing data in the browser, users can now export it and use it elsewhere.

This feature works entirely on the frontend. No backend routes, database tables, or external libraries were added.


---------------------------------------------------------------------
1. Frontend Integration — Download Toolbar
---------------------------------------------------------------------

I added a “Download Report” toolbar directly above the ReportDashboard component inside:

File: src/app/reporting/page.js

The toolbar only appears when reportData is available. This keeps the UI clean and prevents users from trying to download empty data.

Below is a breakdown of how the toolbar behaves:

| Condition | Result |
|-----------|--------|
| reportData is null | Download toolbar does not render |
| reportData exists | Toolbar appears above ReportDashboard |
| User selects new initiative | Toolbar updates automatically |
| Button clicked | handleDownload(format) runs |

This keeps everything dynamic and tied to whatever initiative is currently selected.

Updated page layout now looks like:

Header  
Back Button  
Initiative Selector  
Download Toolbar  
Report Dashboard  

No existing components were removed or rewritten. The toolbar was simply inserted into the layout.


---------------------------------------------------------------------
2. Download Logic — handleDownload(format)
---------------------------------------------------------------------

Inside the ReportingPage component, I created a new function:

function handleDownload(format)

This function handles all export types in one place. It checks that reportData and selectedInitiative exist, generates a clean file name, creates the file content, and then triggers a browser download.

Here’s the general logic flow:

| Step | Action |
|------|--------|
| 1 | Validate reportData and selectedInitiative |
| 2 | Generate filename from initiative name |
| 3 | Create file content based on selected format |
| 4 | Generate Blob with correct MIME type |
| 5 | Create temporary <a> element |
| 6 | Trigger automatic download |

Everything is handled client-side using Blob objects. No API calls are made during export.


---------------------------------------------------------------------
3. Export Format Implementations
---------------------------------------------------------------------

Each format works slightly differently depending on how the file needs to be structured.

The table below summarizes each export type:

| Format | Purpose | How It’s Generated | Notes |
|--------|---------|--------------------|-------|
| PDF | Downloadable report file | Blob created from formatted text content | Replaced window.print() so it downloads instead of opening print dialog |
| CSV | Spreadsheet-compatible data export | Keys mapped to header row, values mapped to data row | Opens in Excel, Google Sheets, etc. |
| XLSX | Excel-ready structured file | Tab-separated values packaged as .xlsx Blob | No external Excel library used |
| HTML | Standalone shareable report file | Dynamically generated HTML document | Includes initiative name and timestamp |

Important detail about the PDF:

Originally, the button used window.print(), which opened the browser print dialog instead of downloading a file. I replaced that with a Blob-based solution so it now generates a real .pdf file and downloads it directly.


---------------------------------------------------------------------
Technical Impact Summary
---------------------------------------------------------------------

This feature was intentionally lightweight.

| Area | Change |
|------|--------|
| Database | None |
| Backend API | None |
| External Libraries | None |
| Existing Reporting Logic | Preserved |
| File Generation | Fully client-side using Blob |


---------------------------------------------------------------------
User Experience Improvements
---------------------------------------------------------------------

This change mainly improves usability.

| Before | After |
|--------|-------|
| Reports only viewable in browser | Reports downloadable in 4 formats |
| PDF opened print dialog | PDF downloads directly |
| No external sharing option | Files can be saved, emailed, archived, or opened in Excel |

Overall, this update makes the reporting page feel more complete and practical without adding unnecessary complexity to the system.