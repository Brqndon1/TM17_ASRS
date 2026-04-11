# Agent Instructions

## Browser Automation Policy

- Default browser tool: `agent-browser`
- Use `agent-browser` for UI testing, screenshots, form filling, auth flows, scraping, and general browser automation.
- Fall back to Playwright only if `agent-browser` is unavailable or cannot complete a required capability.
- For multi-step browser tasks, prefer `agent-browser batch` and use fresh snapshots/refs after navigation or major DOM changes.

