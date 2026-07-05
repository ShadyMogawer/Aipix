---
name: aipix-attendance
description: >-
  AIPix AI camera attendance dashboard skill. Use when working on an AIPix
  attendance insights project that calculates per-employee working hours from
  face-recognition camera events. Covers: (1) setting up a new dashboard from
  scratch with a paginated proxy server, date-aware interval builder, and
  per-day UI components; (2) diagnosing and fixing existing dashboards with
  incorrect working time totals, missing morning events, night-shift
  cross-midnight errors, or open-interval inflation bugs.
---

# AIPix Attendance Dashboard

## Overview

This skill captures the complete patterns for building and maintaining an
**AIPix AI camera attendance dashboard** — a React/Vite web app that connects
to the AIPix camera API (`aipix.gsd-me.com`) to calculate per-employee working
hours from face-recognition events.

It covers two modes:
- **Setup** — scaffold a new dashboard (proxy server, interval builder, UI)
- **Fix/Diagnose** — identify and correct common calculation bugs

---

## Common Bugs & Fixes

### Bug 1 — Missing Morning Data (only seeing last 2–3 hours)
**Cause:** The proxy fetches a single page with `dir=desc`, getting only the
latest ~25 events.  
**Fix:** Replace single fetch with a paginated loop in `server.ts`:

```typescript
// server.ts — paginated fetch, dir=asc, 100/page
const PER_PAGE = 100;
const MAX_PAGES = 50; // safety cap = 5,000 events
const allEvents: any[] = [];
let page = 1;

while (page <= MAX_PAGES) {
  const pageUrl = new URL("https://aipix.gsd-me.com/api/v1/analytic-case/events");
  pageUrl.searchParams.append("from", fromFormatted);
  pageUrl.searchParams.append("to",   toFormatted);
  pageUrl.searchParams.append("dir",  "asc");       // morning first
  pageUrl.searchParams.append("per_page", String(PER_PAGE));
  pageUrl.searchParams.append("page",     String(page));

  const pageRes = await fetch(pageUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!pageRes.ok) break;

  const pageData = await pageRes.json();
  const pageEvents: any[] = Array.isArray(pageData.data)
    ? pageData.data
    : (Array.isArray(pageData.data?.data) ? pageData.data.data : []);

  if (pageEvents.length === 0) break;
  allEvents.push(...pageEvents);
  if (pageEvents.length < PER_PAGE) break;
  page++;
}

return res.json({ success: true, data: { data: allEvents, total: allEvents.length } });
```

---

### Bug 2 — Open Intervals Inflating Hours (past dates use today's clock)
**Cause:** `getIntervalDuration(enter, null, simulatedTime)` uses today's
`simulatedTime` as exit even for intervals from 3 days ago → 70+ hour values.  
**Fix:** Use `getIntervalDurationDateAware` — caps past open intervals at 16h:

```typescript
export const getIntervalDurationDateAware = (
  interval: { enterTime: string; exitTime: string | null; enterDate?: string;
               crossesMidnight?: boolean; durationMinutes?: number },
  logDate: string,
  todayDate: string,
  simulatedTime: string
): number => {
  // Closed interval — trust pre-computed value
  if (interval.exitTime !== null && interval.durationMinutes && interval.durationMinutes > 0) {
    return interval.durationMinutes;
  }
  if (interval.exitTime !== null) {
    const enterMins = timeToMinutes(interval.enterTime);
    const exitMins  = timeToMinutes(interval.exitTime);
    if (interval.crossesMidnight || exitMins < enterMins) return (1440 - enterMins) + exitMins;
    return Math.max(0, exitMins - enterMins);
  }
  // Open interval
  const effectiveDate = interval.enterDate || logDate;
  const enterMins = timeToMinutes(interval.enterTime);
  if (effectiveDate >= todayDate) {
    // Today — use simulatedTime as running exit
    const simMins = timeToMinutes(simulatedTime);
    if (simMins >= enterMins) return simMins - enterMins;
    const elapsed = (1440 - enterMins) + simMins;
    return elapsed <= 960 ? elapsed : 0;
  }
  // Past date with no exit — cap at 16h from entry
  return Math.min(1439 - enterMins, 960);
};
```

---

### Bug 3 — Night Shifts Broken (cross-midnight sessions miscalculated)
**Cause:** Old builder uses per-day minutes (0–1439) and loses date context,
making 22:00→06:00 sessions calculate incorrectly.  
**Fix:** Use **absolute minutes** in the sync builder — `dayOffset × 1440 + minsInDay`:

```typescript
// App.tsx — absolute-minutes interval builder
const _getDayOffset = (base: string, target: string): number => {
  const b = new Date(base + "T00:00:00Z");
  const t = new Date(target + "T00:00:00Z");
  return Math.max(0, Math.round((t.getTime() - b.getTime()) / 86400000));
};
const _addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().substring(0, 10);
};
const _minsToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// For each detection, compute absolute minutes:
const dayOff     = _getDayOffset(dateFrom, det.date || dateFrom);
const detAbsMins = dayOff * 1440 + timeToMinutes(det.timestamp);

// When closing an interval:
const diff         = Math.max(0, ri.exitAbs - ri.enterAbs);         // exact minutes
const crossesMnight = Math.floor(ri.exitAbs / 1440) !== Math.floor(ri.enterAbs / 1440);
```

---

### Bug 4 — Multi-Day Ranges All Collapsed Into One Log
**Cause:** One `AttendanceLog` per employee regardless of date → all days merged.  
**Fix:** Create **one log per (employee × calendar date)** using `logsByDate`:

```typescript
// Group raw intervals into per-date logs
const logsByDate: { [date: string]: AttendanceInterval[] } = {};

rawIntervals.forEach(ri => {
  const enterDate = _addDays(dateFrom, Math.floor(ri.enterAbs / 1440));
  if (!logsByDate[enterDate]) logsByDate[enterDate] = [];
  logsByDate[enterDate].push({
    id: `INT-${Math.random()}`,
    enterTime: _minsToHHMM(ri.enterAbs % 1440),
    enterDate,
    exitTime:       ri.exitAbs === null ? null : _minsToHHMM(ri.exitAbs % 1440),
    exitDate:       crossesMidnight ? _addDays(dateFrom, Math.floor(ri.exitAbs / 1440)) : undefined,
    crossesMidnight: crossesMidnight || undefined,
    durationMinutes: ri.exitAbs === null ? 0 : Math.max(0, ri.exitAbs - ri.enterAbs),
  });
});

Object.entries(logsByDate).forEach(([date, intervals]) => {
  if (intervals.length > 0) {
    newLogs.push({ id: `LOG-${Math.random()}`, employeeId: empId,
                   locationId, date, intervals });
  }
});
```

---

### Bug 5 — Cairo Date Not Extracted From Raw Events
**Cause:** Only `HH:MM:SS` time is parsed from ISO timestamps; the date is
lost, so night-shift events assigned to the wrong calendar day.  
**Fix:** Extract Cairo date alongside the time in the event loop:

```typescript
const rawTimeStr = evt.timestamp || evt.created_at || evt.event_time || new Date().toISOString();
let cairoDate = dateFrom; // fallback

const parsedDate = new Date(rawTimeStr);
if (!isNaN(parsedDate.getTime())) {
  // Time
  const timeFormatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  });
  timeFormatted = timeFormatter.format(parsedDate);

  // Date — critical for cross-day accuracy
  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit"
  });
  cairoDate = dateFormatter.format(parsedDate);
}

newDetections.push({ ..., timestamp: timeFormatted, date: cairoDate });
```

---

## Camera Direction Mapping

The AIPix system at this location uses a fixed camera ID mapping:
- **Camera ID 1** → Exit / Out direction
- **Camera ID 2** → Entrance / In direction

```typescript
const cameraId = evt.camera?.id;
if      (cameraId === 1) direction = "Out";
else if (cameraId === 2) direction = "In";
else {
  // fallback: inspect name/direction string
  const rawDir = String(evt.direction || evt.type || "").toLowerCase();
  const camName = String(evt.camera?.name || "").toLowerCase();
  if (rawDir.includes("out") || camName.includes("exit")) direction = "Out";
}
```

---

## Data Model

```typescript
interface AttendanceInterval {
  id: string;
  enterTime: string;       // "HH:MM"
  exitTime: string | null;
  enterDate?: string;      // "YYYY-MM-DD" — Cairo calendar date
  exitDate?: string;       // "YYYY-MM-DD" — differs for night shifts
  crossesMidnight?: boolean;
  durationMinutes: number; // pre-computed (accurate for closed intervals)
}

interface CameraDetection {
  id: string;
  timestamp: string;  // "HH:MM:SS"
  date?: string;      // "YYYY-MM-DD" — Cairo calendar date of event
  employeeId: string;
  employeeName: string;
  direction: "In" | "Out";
  locationId: string;
  confidence: number;
  cameraName: string;
}
```

---

## Period Calculation Helper

```typescript
// Sums working minutes for an employee across a date range
export const computeEmployeeWorkMinutes = (
  logs: AttendanceLog[],
  dateFrom: string, dateTo: string,
  todayDate: string, simulatedTime: string
): { totalMinutes: number; perDay: Record<string, number> } => {
  const perDay: Record<string, number> = {};
  logs.filter(l => l.date >= dateFrom && l.date <= dateTo).forEach(log => {
    perDay[log.date] = (perDay[log.date] || 0) +
      log.intervals.reduce((s, iv) =>
        s + getIntervalDurationDateAware(iv, log.date, todayDate, simulatedTime), 0);
  });
  return { totalMinutes: Object.values(perDay).reduce((a, b) => a + b, 0), perDay };
};
```

---

## New Dashboard Setup Checklist

When scaffolding a new AIPix attendance dashboard:

1. **Proxy server** (`server.ts`)
   - Paginated `/api/aipix/events` endpoint (100/page, `dir=asc`, loop until empty)
   - `/api/aipix/employees` endpoint (pages 1–5 of full date range)
   - Bearer token from `.env` → `AIPIX_BEARER_TOKEN`

2. **Types** (`types.ts`)
   - `AttendanceInterval` with `enterDate`, `exitDate`, `crossesMidnight`
   - `CameraDetection` with `date`

3. **Core helpers** (`data/mockData.ts`)
   - `timeToMinutes(hhmm)` — parse "HH:MM" or "HH:MM:SS" to minutes
   - `getIntervalDurationDateAware` — date-aware duration
   - `computeEmployeeWorkMinutes` — period aggregation
   - `isIntervalActiveAtTime` — live presence detection
   - `getCairoTodayDate()` — today's date in Cairo timezone

4. **Sync builder** (`App.tsx`)
   - Extract Cairo date per event using `Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" })`
   - Sort events by absolute minutes before building intervals
   - One `AttendanceLog` per (employee × date)
   - Pass `dateFrom`, `dateTo`, `todayDate` to all child components

5. **Components**
   - `DashboardStats` — date-range filter before summing, period label
   - `RosterList` — multi-log per employee, per-day bar breakdown, night-shift badge
   - `StaffDossier` — segments grouped by date, per-day subtotals, EST badge
   - `LocationSummary` — optional VMS streaming via iframe

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/analytic-case/events?from=&to=&dir=asc&per_page=100&page=N` | Paginated events |
| `GET /api/v1/analytic-case/events?from=2025-01-01&to=2026-12-31&per_page=100&page=N` | All employees lookup |

AIPix API base: `https://aipix.gsd-me.com`

---

## Common Mistakes

1. **Single-page fetch** — always paginate; a busy day can have 500–2000+ events.
2. **Using `simulatedTime` for past open intervals** — always check `logDate >= todayDate` first.
3. **Sorting by `HH:MM` only across multi-day ranges** — always sort by absolute minutes `(dayOffset × 1440 + minsInDay)`.
4. **Forgetting to restart the dev server** — `server.ts` changes are not hot-reloaded by Vite; the Node process must be restarted.
5. **Camera IDs are location-specific** — camera 1 = Exit, camera 2 = Entrance applies to this specific GSD/AIPix installation; verify for other sites.
