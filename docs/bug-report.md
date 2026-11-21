# In-app bug report — data policy

SophionOS Core includes an in-app bug report: **Report a bug** in the sidebar
footer (next to Settings and the theme toggle). This document explains exactly
what it captures, what it never captures, and where a report goes. Nothing in
this feature is sent anywhere automatically.

## What is captured

When the app hits an unexpected error, a small entry is recorded **on your
device only**:

- the error message (scrubbed, see below)
- the first part of the stack trace (scrubbed)
- the category (`error` or `warning`)
- the page's route pathname — never the full URL
- a timestamp

Sources: uncaught JavaScript errors, unhandled promise rejections, the
dashboard error boundary, and the root error page. The last 100 entries are
kept in memory; the last 50 also survive a page reload via `localStorage`
(key `sophionos:bug-report:errors`). Entries older than 24 hours are excluded
when a report is built.

Benign noise is dropped at capture: ResizeObserver loop warnings, aborted
requests (AbortError), and offline/network-blip failures.

## Scrubbing (applied before anything is stored)

Every string passes through one scrubber before it touches memory or storage:

- **URLs are reduced to their pathname.** Query strings and fragments are
  never stored, anywhere.
- **Token-shaped content is masked:** UUIDs, hex/base64 runs of 32+ characters,
  JWTs, secret-looking `key=value` pairs, and the segment following
  share/invite/token-style path prefixes.
- **Email addresses are masked.**

## What is NEVER captured

- Your content: entity titles, note/task bodies, any field values
- Form input
- Request or response bodies, headers, cookies
- Clerk session/user tokens or IDs
- Encryption keys or any key material
- Full URLs (only scrubbed pathnames)

If a data source cannot be scrubbed to safety, the source is excluded — the
scrubbing rules are never weakened.

## Nothing is sent automatically

There is no backend endpoint, no telemetry, no error service. A report exists
only when you open the dialog, write a description (at least 10 characters)
and choose a door yourself:

| Door | Where it goes |
|------|---------------|
| **Open GitHub issue** | Opens a pre-filled new-issue page on `github.com/Taha-Aalam/SophionOS-Core` in a new tab. **Public** — you review and submit it yourself on GitHub. |
| **Copy report** | Your clipboard. Nothing leaves the device until you paste it somewhere. |
| **Download full log** | A JSON file saved to your device (the scrubbed buffer). Share it manually if you choose. |

The report body contains: your description, app version, component (derived
from the route), page pathname, UI locale, user agent, build SHA (when the
build exposes one), and the last captured error (message + first 30 stack
lines). Long reports are truncated for the GitHub URL; the JSON download is
the full form.

## Clearing the buffer

Open **Report a bug** and click **Clear captured errors**. This empties both
the in-memory buffer and the persisted `localStorage` entries immediately.
Clearing your browser's site data also removes the persisted entries.

## Security vulnerabilities

**Do not file security vulnerabilities as public GitHub issues.** Follow the
process in [SECURITY.md](https://github.com/Taha-Aalam/SophionOS-Core/blob/master/SECURITY.md)
(private vulnerability reporting / security contact) instead. The dialog
links this policy directly.
