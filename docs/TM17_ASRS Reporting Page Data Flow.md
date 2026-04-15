# **Reporting Page Data Flow**

Quick breakdown of how the Reporting page works from front to back. This covers the full flow from when a staff user opens the page to when they export data.

## **Page Load**

When a user opens /reporting, the page fires off two API calls at the same time through loadInitialData():

* GET /api/initiatives to grab the list of all initiatives  
* GET /api/reports to get all the reports

On the API side (src/app/api/reports/route.js), it first checks that the user has the reporting.view permission. Then it runs a query that joins the reports table with the initiative table using a LEFT JOIN so it can pull in the initiative names. The rows get mapped through toReportListItemDto() before getting sent back as JSON.

Once the browser gets both responses back, it indexes all the reports into a reportMap object where each initiative gets its first available report. This is what powers the initiative tabs on the page.

## **Selecting an Initiative**

When the user clicks on one of the initiative tabs, no API call happens. The browser just looks up that initiative's report in reportMap, then parses the report\_data JSON blob using normalizeSnapshot() from src/lib/report-snapshot.js. That function breaks the data down into summary, chartData, tableData, trendData, and explainability which all get passed into the ReportDashboard component to render.

## **Filtering**

Filtering is also completely client side. When a user picks a filter value from one of the dropdowns, processReportData() from the report engine runs in memory on the data that was already loaded during page load. No new API calls, no new database queries. It just filters the existing snapshot and re-renders the dashboard with the filtered results.

## **Exporting**

Same deal here, all client side. When the user clicks export CSV, the browser generates the file directly from the filtered tableData and triggers a download. Nothing hits the server.

## **Key Takeaway**

The only time the API and database are involved is during the initial page load. Everything after that (tab switching, filtering, exporting) happens entirely in the browser using the data that was already fetched.

