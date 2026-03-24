# LLM Integration into the Reporting Section

## Overview

For this sprint I worked on incorporating an LLM (large language model) into the reporting section of our ASRS application. The idea is that right now, our reports show raw numbers, charts, and tables, but they don't really tell the user what any of it *means*. A staff member looking at a report still has to interpret the data themselves, figure out what trends are important, and decide what to do next.

By plugging in OpenAI's GPT-4o model, we can now automatically generate a written summary of the report data, pull out key insights, flag any concerns, and give actionable recommendations. It basically turns the numbers into a narrative that's way easier to digest.

## What Was Changed

### New Files Created

**`src/lib/openai-report-insights.js`**

This is the core module that handles talking to the OpenAI API. It takes in the report data (summary stats, metrics, chart data, trend data, and a sample of the table rows) and builds a prompt that asks GPT-4o to analyze it. The model returns a structured JSON response with a summary, key insights, sentiment (positive/neutral/negative), recommendations, trends, and concerns.

I reused the same lazy initialization pattern that was already in `src/lib/openai.js` (which was in the codebase but never actually wired into anything). If no API key is set, it just returns a fallback object instead of crashing. Same thing if the API call fails for any reason.

**`src/app/api/reports/ai-insights/route.js`**

This is the new API endpoint for generating and retrieving AI insights. It has two methods:

- GET: Checks if a report already has cached AI insights in its snapshot. If it does, returns them right away so we don't waste an API call.
- POST: Actually generates the insights by calling the OpenAI module, then stores the result back into the report's snapshot in the database. This way the insights only need to be generated once per report. There's also a `regenerate` flag if someone wants fresh insights.

Both methods require staff or admin access (minAccessRank: 50) since we didn't want public users racking up API costs.

**`src/components/AIInsightsPanel.js`**

This is the React component that shows up in the report dashboard. It has three states:

1. If the user isn't staff/admin, it doesn't render at all.
2. If there are no cached insights yet, it shows a "Generate AI Insights" button.
3. Once insights exist (either from cache or freshly generated), it shows a collapsible card with all the sections: summary, key insights, sentiment badge, recommendations, and concerns.

There's a loading spinner while waiting for the API (takes about 5-15 seconds), error handling with a retry button, and a "Regenerate" button in the footer if someone wants to get updated insights. The component also supports a `preloadedInsights` prop so that if the insights were generated at report creation time (see below), they show up immediately without needing a separate API call.

### Modified Files

**`src/components/ReportDashboard.js`**

Added the import for `AIInsightsPanel` and rendered it after the trend display section. It only shows for staff/admin users and only when there's a valid report database ID. I also added `reportDbId` and `preloadedInsights` as new props.

**`src/app/reporting/page.js`**

Added two new pieces of state: `reportDbId` (the database ID of the currently viewed report) and `aiInsights` (any cached AI insights from the snapshot). When a report is loaded, these get extracted and passed down to the dashboard component. When switching initiatives, they get reset properly.

**`src/lib/report-validation.js`**

Added `includeAiInsights` as an optional boolean field in the report creation payload validation. Defaults to false so existing behavior is unchanged.

**`src/app/api/reports/route.js`**

This is where the main report creation happens. I added an optional AI insights step after the existing pipeline (filter, expressions, sort, metrics, trends) finishes. If `includeAiInsights` is true in the request, it calls `generateReportInsights()` with the pipeline output and adds the result to the snapshot before storing it.

The important thing here is that if the AI call fails for any reason, the report still gets created normally, just without the AI insights. We never want the AI to block report creation. I also added tracking for how long the AI call takes, which gets logged to `report_generation_log` if those columns exist.

**`src/components/report-steps/StepConfig.js`**

Added a checkbox labeled "Include AI Analysis (GPT-4o)" to the first step of the report creation wizard. There's a small note underneath explaining that it adds about 10 seconds to generation time. The checkbox value gets passed through the report config.

**`src/app/report-creation/page.js`**

Wired the `includeAiInsights` boolean from the report config into the API request body when generating a report. Also made sure it resets to false when the form resets after successful generation.

**`src/lib/db.js`**

Added two new columns to the `report_generation_log` table using the existing `addColumnIfNotExists` helper: `ai_status` (text, tracks whether the AI call succeeded or failed) and `ai_duration_ms` (integer, tracks how long it took). These are just for logging and debugging purposes.

### Files That Didn't Need Changes

**`src/lib/report-snapshot.js`** — The `normalizeSnapshot()` function already uses spread syntax (`...results`) when processing the snapshot, which means any new field like `aiInsights` automatically passes through without modification. This was a nice benefit of how the snapshot system was already designed.

**`src/lib/openai.js`** — The original dormant OpenAI integration file. I didn't modify it but I referenced its patterns (lazy client initialization, graceful fallback) when building the new module.

## Why It Was Done This Way

A few key design decisions:

1. **Two ways to get insights (on-demand + at creation time):** Some users might want to generate insights for old reports that already exist. Others might want them automatically when they create a new report. So I built both paths. The `AIInsightsPanel` component handles both cases through its `preloadedInsights` prop.

2. **Caching insights in the snapshot:** Instead of creating a separate database table for AI insights, I store them inside the existing `report_data` JSON column. This means insights travel with the report (they show up in exports, they get versioned with the snapshot), and I didn't have to touch the database schema for the core feature.

3. **AI never blocks report creation:** If GPT-4o is slow, rate-limited, or down entirely, the report still gets created. The AI insights just come back as null. This was really important because we don't want a third-party API failure to break our core functionality.

4. **Staff/admin only:** We restricted AI features to staff and admin users (access rank 50+). This matches how exports are already restricted and prevents public users from triggering expensive API calls.

5. **Token management:** The module caps the sample table data sent to the LLM at 50 rows. If we sent all 500+ rows from a large report, it would blow up the token count and cost a lot more. 50 rows is enough for the model to identify patterns.

## How to Test It

1. Set `OPENAI_API_KEY=sk-your-key-here` in `.env.local`
2. Log in as a staff or admin user
3. Go to the Reporting page and select an initiative with a report
4. You should see the "Generate AI Insights" button below the trends section
5. Click it and wait for the insights to load
6. Refresh the page — insights should load instantly from cache
7. Go to Report Creation, check "Include AI Analysis", and generate a new report
8. View that report — insights should already be there without clicking anything
9. Without an API key, the button should show "AI Insights not available"
