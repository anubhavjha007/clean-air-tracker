# Clean Air Accountability Tracker

A working prototype that turns the CEEW/UrbanEmissions report *"How Robust are Urban
India's Clean Air Plans?"* into software instead of a PDF. It doesn't try to solve air
pollution — it solves the report's actual finding: **the plans themselves are badly
managed** (no single owner per action, no budgets, no source data used, no regional
coordination). That's a project-management problem, and project-management problems are
what you can actually ship in 2 days.

## What it does

- **Robustness score (0–100) per city**, built from the same 4 pillars the report used to
  audit all 102 real plans: legal mandate, accountability clarity, source-data
  integration, budgeting.
- **Action tracker** where every mitigation action needs ONE agency + ONE role
  (Planning / Implementing / Enforcing / Monitoring) instead of the ambiguous single
  "responsible agency" column the report found in the real plans.
- **Source-contribution chart** per city, from the report's real Table A3 data (ApNA
  programme).
- **Regional-risk flag**: auto-flags a city if >30% of its PM2.5 comes from outside the
  city boundary and its plan has no regional-coordination action — this is literally the
  report's Amritsar/Ludhiana example, reproduced as a rule.
- **Duplicate-plan flag**: flags cities that are (in real life) running an identical
  copy-pasted plan as other cities in their state (e.g. UP's 15 cities).
- **Live AQI** pulled from the WAQI public API, so you can eyeball whether low-scoring
  plans correlate with worse current air quality.

## Be honest about the data (say this in your pitch, don't hide it)

- `sourceContribution` and `outsideContributionPct` numbers are **real**, taken directly
  from the report's Table A3.
- `planStatus` (legal mandate / budget / source-data-in-plan / duplicate-plan) and the
  `actions` list are **illustrative demo data**, hand-calibrated to match the report's
  *aggregate* findings (only 9/102 plans had budgets, only 25/102 had source data, UP's 15
  cities share one plan, etc.) — not scraped per-city from the real government plans.
  Say this plainly if a judge asks. It's still a legitimate prototype: the scoring engine
  and tracker work on real data the moment someone plugs it in.
- The real plans are public PDFs at `cpcb.nic.in/Actionplan/<city>.pdf`. Scraping/parsing
  those into this schema is the natural "make it real" next step — mention it as your
  roadmap, don't pretend you did it in a weekend.

## Stack, and why

- **Backend: Node + Express**, not Spring Boot. You know Java better, but Spring Boot's
  boilerplate (project setup, DI config, entity/repo layers) will eat half your first day
  for no payoff a hackathon judge will notice. Express gets you a working REST API in an
  hour. Learn Spring Boot on a project where you have weeks, not on a 48-hour clock.
- **No database.** In-memory array (`seed.js`), full CRUD on top of it. Judges do not care
  if data resets on restart. Do not spend your limited time on Postgres/Mongo setup. If
  you finish early, add `lowdb` (a JSON-file DB, ~10 lines to wire in) — that's the only
  upgrade worth it in this timeframe.
- **No frontend framework.** Plain HTML + vanilla JS + Tailwind CDN + DaisyUI CDN (a
  Tailwind component kit — buttons, cards, tables, modals already styled, so you barely
  write CSS). This matches where you actually are on frontend: functional > fancy. React
  would cost you a build step and hours of debugging JSX for zero visible benefit at demo
  time.
- **Chart.js** via CDN for all charts. No build step, works immediately.
- **WAQI API** for live AQI — free, one signup, plain REST GET. This is your "real
  external API integration" checkbox for judging criteria.

## Running it

```bash
cd server
npm install
npm start
```

Open `http://localhost:3000`. That's it — the backend serves the frontend too, so there's
only one process to run.

### Live AQI (optional but easy — do this, it's a 2-minute win)

1. Get a free token: https://aqicn.org/data-platform/token/
2. Run with: `WAQI_TOKEN=your_token_here npm start`
3. If a city's AQI shows "unavailable," its `waqiStation` slug in `seed.js` doesn't match
   WAQI's station name. Look up the right one:
   `https://api.waqi.info/search/?token=YOUR_TOKEN&keyword=CITYNAME`

## 2-day build plan

**Day 1 — make the engine correct, ignore visuals entirely**
- Morning: lock the data model (already done for you here — don't redesign it, extend
  it). Get `npm start` running and hit every endpoint with `curl`, exactly like the smoke
  test in this repo. If an endpoint is wrong, fix it before you write one line of frontend.
- Afternoon: wire the frontend to the real API (it's already done here — but if you're
  rebuilding from scratch, do overview page first, city detail second, add/edit actions
  last). Get the WAQI token working.
- End of day 1 checkpoint: you can open the app, click through every city, add/edit/delete
  an action, and the score updates live. If you can't do that, you have nothing to demo —
  everything else is decoration.

**Day 2 — extend data coverage + polish + rehearse**
- Morning: add more cities if you want breadth (the report has data for 50 cities in Table
  A3 — copy the pattern in `seed.js`). Add a "generate PDF report card" button if you want
  a wow-factor (use `window.print()` with a print stylesheet — 30 minutes, not a real PDF
  library, don't overbuild this).
- Afternoon: fix visual rough edges, write your 90-second pitch, and rehearse the demo
  clicking through: Overview (score ranking) → click a low-scoring city → point at the
  "Shared/Unclear" agencies and missing budgets → click a high-outside-contribution city →
  show the regional-risk flag → show live AQI.
- Cut list if you're behind schedule (cut in this order): PDF export → adding more cities
  beyond the 17 seeded → live AQI (fall back to a static "last known AQI" number) → the
  breakdown bar chart (the doughnut + table alone still tell the story).

## Pitch angle for judges

Don't pitch "we built an air quality app." Pitch: *"CEEW audited India's 102 official
clean-air plans and found most of them have no owner, no budget, and no data behind their
own actions. We built the tool that would have caught that automatically, and that state
pollution boards could use to fix it — not another AQI display, an accountability layer on
top of the plans that already exist."* Cite the numbers: 40% of actions shared with no
clear owner, only 9/102 plans budgeted, only 25/102 used source data. That's your problem
validation, already peer-reviewed, sitting in the report you were handed. Use it.

## Realistic next steps (say these, don't build them this weekend)

- Scrape the real CPCB action-plan PDFs city-by-city into this schema (this is the
  unglamorous, actually-valuable work — a hackathon follow-up, not a hackathon deliverable).
- Add auth + a real DB so state PCB officials could actually use this to manage their own
  plan.
- Add a proper source-apportionment ingestion pipeline instead of hardcoded ApNA figures.
