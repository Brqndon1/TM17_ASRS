# Share Link Fix (Simple Explanation)

## What was wrong
The Share button was using one hardcoded website URL (`asrssuccess.org`) for every environment.

That means if we run the app locally or on a different deployment, shared links can point to the wrong place.

## What we changed
We updated share link generation so it uses:
1. `NEXT_PUBLIC_APP_URL` (if provided), otherwise
2. the current site origin (`window.location.origin`).

Now the shared URL is built like:
`/reporting?reportId=...`

## Why this is better
- Works in local, staging, and production.
- No more broken links caused by hardcoded domain.
- Easier for team testing because links match where the app is running.

## Extra small safety improvement
For copy-to-clipboard actions, we now check if clipboard API exists first.
If it does not, we fall back to a prompt so users can still copy manually.
