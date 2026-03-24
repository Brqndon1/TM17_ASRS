# Fix: Broken CSV Export on Reporting Page

## What Was Wrong

The CSV download button on the Reporting page (`src/app/reporting/page.js`) was producing a completely unusable file. When a staff or admin user clicked the "CSV" export button, the downloaded file would contain something like:

```
reportId,initiativeId,initiativeName,generatedDate,summary,chartData,tableData,explainability
42,7,Youth Outreach,2026-03-20,Some summary text,[object Object],[object Object],Some explanation
```

The problem was that the old code did this:

```js
Object.keys(reportData).join(',')   // header row
Object.values(reportData).join(',') // data row
```

`reportData` is not a flat object — it has nested properties like `chartData` (an array of chart point objects) and `tableData` (an array of row objects). When JavaScript tries to convert an array or object to a string with `.join(',')`, it just outputs `[object Object]`, which is useless.

On top of that, the old code used `encodeURI()` to build a data URI for the download. This approach also breaks when cell values contain commas, `#` symbols, or newlines, since `encodeURI` does not escape those characters.

## What Was Changed

The CSV export now uses `reportData.tableData` — the actual flat tabular rows that make sense in a spreadsheet — instead of dumping the entire `reportData` object. Here's what the new logic does:

1. Grabs the `tableData` array from `reportData` (early returns if it's empty)
2. Extracts column names from the keys of the first row
3. Builds CSV lines by iterating over every row and every column
4. Each cell value is wrapped in double quotes and any internal double quotes are escaped by doubling them (`"` becomes `""`) — this follows RFC 4180, the actual CSV standard
5. Creates a `Blob` with the CSV text and triggers a download using `URL.createObjectURL`
6. Cleans up the object URL after the download to avoid a memory leak

## Why This Matters

Before this fix, if a staff member exported a report to CSV and tried to open it in Excel or Google Sheets, they'd see garbage data. This defeats the whole purpose of the export feature. Now the CSV actually contains the report's table data in a format that spreadsheet software can read properly.

## File Changed

- `src/app/reporting/page.js` (lines ~656-675, inside `handleDownload`)
