# sortmyprepCRM — LLM Context File

Use this file to give any AI assistant full context of the project before starting work.

---

## Project Overview

Internal CRM for **sortmyprep** — a company selling IB/IGCSE tutoring services to coaching centers, schools, private teachers, parents, and career counsellors across the Middle East and Asia.

**Core purpose**: Track leads (potential clients), manage sales outreach call scripts, log activities, view leads on a geographic map, and generate AI-powered intel briefs from lead websites.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack) |
| Language | TypeScript 5.9, React 19 |
| Styling | Tailwind CSS v4 (`@theme inline` directive), Inter font |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth with SSR cookie sessions |
| AI | Groq llama-3.3-70b (default) or Anthropic Claude (env switch) |
| Web scraping | Jina AI Reader (`https://r.jina.ai/`) for JS-rendered pages |
| Map | Mapbox GL JS v3 |
| File parsing | mammoth (DOCX), pdfjs-dist/legacy (PDF — NOT pdf-parse) |
| CSV import | Papa Parse |
| Geocoding | Mapbox Geocoding API (in LeadFormFields) |

**Critical Next.js 16 note**: `useSearchParams()` requires a `<Suspense>` boundary. All pages follow the `*Inner` component pattern — export a wrapper that wraps the real component in `<Suspense fallback={null}>`.

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
GROQ_API_KEY=
ANTHROPIC_API_KEY=        # optional — only needed if AI_PROVIDER=anthropic
AI_PROVIDER=groq          # or "anthropic"
```

---

## Database Schema

### `leads`
```sql
id               uuid primary key
name             text not null
country          text not null
city             text
lat              float8
lng              float8
website          text
phone            text
email            text
curriculum       text[]          -- e.g. ['IB', 'IGCSE']
source           text            -- 'Google Maps' | 'Directory' | 'Manual'
stage            text            -- see Pipeline Stages below
assigned_to      uuid references users(id)
notes            text
intel_brief      text            -- AI-generated brief
intel_fetched_at timestamptz
intel_annotation text            -- manual rep notes on the intel
created_at       timestamptz
last_activity    timestamptz
```

### `users`
```sql
id       uuid primary key   -- matches Supabase auth.users.id
name     text
role     text               -- 'admin' | 'rep'
countries text[]
```

### `activity_log`
```sql
id             uuid primary key
lead_id        uuid references leads(id) on delete cascade
type           text  -- 'note' | 'call' | 'meeting' | 'stage_change' | 'email'
summary        text
outcome        text
done_by        uuid references users(id)
from_stage     text
to_stage       text
fathom_id      text  -- future: Fathom meeting integration
callhippo_id   text  -- future: Callhippo call integration
recording_url  text
created_at     timestamptz
```

### `scripts`
```sql
id            uuid primary key
contact_type  text not null   -- one of CONTACT_TYPES
title         text not null
content       text
usage_count   int default 0
created_by    uuid references users(id)
created_at    timestamptz
archived      boolean default false
document_url  text            -- Supabase Storage URL
document_name text
```

### `script_ratings`
```sql
id         uuid primary key
script_id  uuid references scripts(id) on delete cascade
rated_by   uuid references users(id)
rating     int                -- 1–5
note       text
created_at timestamptz
-- unique(script_id, rated_by)
```

### `script_lead_usage` (Phase 5)
```sql
id           uuid primary key
script_id    uuid references scripts(id) on delete cascade
lead_id      uuid references leads(id) on delete cascade
assigned_by  uuid references users(id)
assigned_at  timestamptz
-- unique(lead_id)   one active script per lead
```

---

## Domain Constants (`src/lib/constants.ts`)

### Pipeline Stages (in order, 1 point each except Blocked/Dead = 0)
```
1. New Lead       → 1 pt
2. Contacted      → 2 pts
3. Responded      → 3 pts
4. Meeting Booked → 4 pts
5. Meeting Done   → 5 pts
6. Negotiating    → 6 pts
7. Confirmed      → 7 pts
8. Blocked/Dead   → 0 pts
```
`STAGE_POINTS` is derived from this and exported from constants — do not redefine it in individual files.

### Contact Types
```
School | Coaching Center | Private Teacher | Parent | Career Counsellor
```

### Curricula
```
IB | IGCSE | A-Levels | AS-Levels
```

### Lead Sources
```
Google Maps | Directory | Manual
```

---

## SQL Migrations (run in order in Supabase SQL Editor)

```
phase2_3_updates.sql  →  activity_log, scripts, script_ratings tables + RLS
phase4_setup.sql      →  intel_fetched_at, intel_annotation columns on leads
phase5_setup.sql      →  script_lead_usage table + RLS
```

---

## Routes

| Route | Description |
|---|---|
| `/` | Map view — Mapbox pins, box-select, filter bar, lead detail panel |
| `/leads` | Leads table with filters, bulk assign, add/edit modals |
| `/leads?view=mine` | Filtered to current user's assigned leads |
| `/import` | CSV import with Papa Parse, preview table, dedup |
| `/scripts?type=School` | Scripts list for a contact type |
| `/scripts/[id]` | Script detail — view, edit, rate (1–5 stars), doc upload |
| `/rankings?type=School` | Script leaderboard per contact type (5 tabs) |
| `/admin/users` | User management — admin only |
| `/login` | Supabase email+password auth |

---

## Completed Phases

### Phase 1 — Core CRM
- Lead data model (name, country, city, lat/lng, website, phone, email, curriculum, source, stage, assigned_to, notes)
- CSV import via Papa Parse: validates required fields, dedupes on name+country within batch and against DB
- Mapbox map with stage-colored circle pins, navigation control
- Lead detail slide-over panel with info, stage change, assignment, notes
- Activity log with timeline display

### Phase 2–3 — Scripts & Activity
- Call scripts per contact type, with title + markdown content
- Script ratings: 1–5 stars per user per script, with optional note
- Activity timeline entries: note, call, meeting, stage_change, email
- Script detail page: view/edit content, archive, rate, attach document (Supabase Storage)
- Supabase Storage bucket `script-docs` for PDF/DOCX attachments
- `increment_script_usage` RPC for tracking view counts

### Phase 4 — AI Intel
- "Get Intel" button on lead detail panel (Intel tab)
- Fetches lead website via Jina AI Reader (`r.jina.ai`) — handles JS-rendered SPAs
- Sends cleaned text to AI (Groq default, Anthropic optional) for structured brief
- Brief stored in `intel_brief` + `intel_fetched_at` on lead
- Annotation field (`intel_annotation`) for rep notes
- AI provider switch: `AI_PROVIDER=anthropic` uses Claude claude-haiku-4-5-20251001

### Phase 5 — Script Grading & Rankings
- `script_lead_usage` table: one script assigned per lead (unique on lead_id)
- Script tab in Lead Detail Panel: assign/unassign script, view stage points live
- Points system: STAGE_POINTS from constants (1–7, Blocked/Dead = 0)
- `/rankings` page: top-level sidebar nav, 5 tabs (one per contact type)
- Leaderboard ranks scripts by avg_points (total_points / lead_count)
- Rankings data: `getScriptLeaderboard()` joins script_lead_usage → leads → stage

### UI Redesign
- Brand: `#2563EB` blue accent, `#0F172A` dark, white sidebar, `slate-50` canvas
- Tailwind CSS v4 design tokens in `src/app/globals.css` (`@theme inline`)
- Sidebar with nested sub-links, active state detection, Suspense-wrapped
- TopBar with global search (routes to `/leads?search=`) and user avatar dropdown
- Mobile: sidebar hides, TopBar hamburger shows mobile nav; desktop: sidebar is primary nav
- All page-level tabs removed from desktop (sidebar sub-links handle navigation)

---

## Architecture & Key Decisions

### Service Layer Pattern
All Supabase interactions go through `src/services/`. Pages and components import from services, never from `@supabase/supabase-js` directly.

```
services/
  leadService.ts      CRUD + bulk assign + stage/assignment update + geocoding helper
  scriptService.ts    CRUD + ratings + assignment + leaderboard
  activityService.ts  Log entries + note creation + stage change log
  intelService.ts     Website scraping + AI completion + intel save
  userService.ts      Get all users + ensure profile on login
```

### Client vs Server Supabase
- `src/lib/supabase.ts` → browser client (used in services called from components)
- `src/lib/supabase-server.ts` → server client with cookies (used in API route handlers)

### Hooks for Data
```
hooks/useLeads.ts    useLeadPins(), useLeadRows()
hooks/useScripts.ts  useScripts(contactType)
hooks/useUser.ts     useUser()
```

### AI Provider Abstraction
`src/lib/aiProvider.ts` exports `generateCompletion(system, user, maxTokens)`. Set `AI_PROVIDER=anthropic` in `.env.local` to switch from Groq to Anthropic. Both use same interface.

### PDF Extraction
Use `pdfjs-dist/legacy/build/pdf.mjs` directly — NOT `pdf-parse`. `pdf-parse` v2 fails in Next.js API routes due to worker init issues. See `src/app/api/extract-text/route.ts`.

### Suspense Pattern (Next.js 16)
Every page that calls `useSearchParams()` must be wrapped:
```tsx
function FooPageInner() { /* uses useSearchParams */ }
export default function FooPage() {
  return <Suspense fallback={null}><FooPageInner /></Suspense>
}
```

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── admin/users/page.tsx        User management (admin only)
│   │   ├── import/page.tsx             CSV import flow
│   │   ├── leads/page.tsx              Leads table page
│   │   ├── rankings/page.tsx           Script rankings (5 contact-type tabs)
│   │   ├── scripts/
│   │   │   ├── [id]/page.tsx           Script detail (edit, rate, doc upload)
│   │   │   └── page.tsx               Scripts list for active contact type
│   │   ├── layout.tsx                  Dashboard shell (Sidebar + TopBar)
│   │   └── page.tsx                    Map view (Mapbox)
│   ├── api/
│   │   ├── extract-text/route.ts       PDF/DOCX → text (pdfjs-dist + mammoth)
│   │   └── intel/route.ts              AI intel generation pipeline
│   ├── auth/callback/route.ts          Supabase OAuth callback
│   ├── login/page.tsx                  Email + password login
│   ├── globals.css                     Tailwind v4 design tokens
│   └── layout.tsx                      Root layout (font, metadata)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx                 Desktop nav with nested sub-links
│   │   ├── TopBar.tsx                  Search bar + user dropdown
│   │   └── MobileNav.tsx              Mobile hamburger nav
│   ├── leads/
│   │   ├── tabs/
│   │   │   ├── LeadInfoTab.tsx         Info panel tab content
│   │   │   ├── LeadScriptTab.tsx       Script assignment + points tab
│   │   │   └── LeadActivityTab.tsx     Note input + activity timeline tab
│   │   ├── LeadDetailPanel.tsx         Slide-over panel orchestrator
│   │   ├── LeadFormModal.tsx           Add/Edit lead modal
│   │   ├── LeadFormFields.tsx          Shared form fields (with Mapbox geocoding)
│   │   ├── LeadsFilterBar.tsx          Search + stage/country/rep filters
│   │   ├── BulkAssignBar.tsx           Multi-select bulk assignment bar
│   │   ├── LeadsTable.tsx              Main leads data table
│   │   ├── ActivityTimeline.tsx        Timeline list component
│   │   ├── IntelBrief.tsx             AI brief display + annotation
│   │   └── ImportPreviewTable.tsx      CSV import preview
│   ├── map/
│   │   ├── MapView.tsx                 Mapbox map + box-select feature
│   │   └── MapFilterBar.tsx            Floating filter overlay on map
│   ├── scripts/
│   │   ├── NewScriptModal.tsx          Create script modal (with file import)
│   │   ├── ScriptCard.tsx             Script card in grid view
│   │   ├── ScriptDocUpload.tsx        Document attach/remove UI
│   │   └── ScriptsModal.tsx           Quick-browse scripts modal (from map panel)
│   └── ui/
│       ├── StageBadge.tsx             Colored stage pill
│       ├── StarRating.tsx             1–5 star rating input/display
│       ├── EmptyState.tsx             Empty state placeholder
│       └── LoadingSpinner.tsx         Loading indicator
├── hooks/
│   ├── useLeads.ts                     useLeadPins, useLeadRows
│   ├── useScripts.ts                   useScripts(contactType)
│   └── useUser.ts                      Current authenticated user
├── lib/
│   ├── constants.ts                    All domain constants + STAGE_POINTS
│   ├── supabase.ts                     Browser Supabase client
│   ├── supabase-server.ts             Server Supabase client (cookies)
│   └── aiProvider.ts                   Groq / Anthropic abstraction
├── services/
│   ├── leadService.ts                  Lead CRUD + bulk ops
│   ├── scriptService.ts               Script CRUD + ratings + grading
│   ├── activityService.ts             Activity log operations
│   ├── intelService.ts                Web scrape + AI brief generation
│   └── userService.ts                 User management
├── types/
│   ├── lead.types.ts                   Lead, LeadMapPin, LeadListRow, LeadInsert, CSVRow
│   ├── script.types.ts                Script, ScriptWithScore, ScriptRating, ScriptInsert
│   ├── pipeline.types.ts              PipelineStage (derived from PIPELINE_STAGES)
│   ├── activity.types.ts              ActivityLog, ActivityType
│   ├── user.types.ts                  AppUser, UserRole
│   └── api.types.ts                   ServiceResult<T>, ApiResponse<T>, ImportResult
└── utils/
    ├── formatters.ts                   formatDate, formatCurriculum
    ├── stageColors.ts                  STAGE_COLORS map, getStageColor, getStageBgClass
    └── csvParser.ts                    parseCSVFile (Papa Parse wrapper with validation)
```

---

## Planned Future Phases

### Phase 6 — Analytics Dashboard (`/analytics`)
- KPI cards: total leads, leads this week, conversion rate per stage
- Stage funnel chart (horizontal bar or Sankey)
- Rep performance table (leads assigned, avg stage, confirmed count)
- Top countries by lead volume
- Time-to-stage analysis

### Phase 7 — Telephony Integration (Callhippo)
- Webhook endpoint to receive call events from Callhippo
- Auto-create `activity_log` entry with type `call`, recording URL, outcome
- `callhippo_id` field already in activity_log schema
- Click-to-call button in lead detail panel

### Phase 8 — Meeting / Video Integration (Fathom)
- Webhook for Fathom meeting summaries
- Auto-log meeting with summary and transcript link
- `fathom_id` field already in activity_log schema

### Phase 9 — Follow-up Reminders
- `follow_up_at` timestamp field on leads
- `/reminders` or dashboard widget showing overdue follow-ups
- Sort leads table by follow-up date
- Optional: email digest to assigned rep

### Phase 10 — Lead Scoring
- Computed score based on: stage weight, days since last activity, curriculum match, country tier
- Score badge on lead cards and map pins (color-coded like stage)
- Sort/filter by score in leads table

### Phase 11 — Export & Reporting
- Export current filtered view to CSV
- Full lead history PDF (activity log + intel brief)
- Weekly performance email digest

### Phase 12 — Multi-workspace / Tenant Support
- Isolate data by `workspace_id` on all tables
- Invite flow for new team members
- Workspace settings (currency, timezone, stage names)

---

## Known Gotchas

1. **Supabase schema cache**: After adding columns (e.g. `intel_fetched_at`), the API may throw "column not found in schema cache". Fix: run the migration SQL, then trigger a schema cache reload in Supabase dashboard (or wait ~30s).

2. **pdf-parse v2 broken in Next.js**: Do NOT use `pdf-parse`. Use `pdfjs-dist/legacy/build/pdf.mjs` directly with `GlobalWorkerOptions.workerSrc = ''`. See `src/app/api/extract-text/route.ts`.

3. **Jina AI Reader timeout**: Some sites are slow. The fetch timeout is set to 25s — don't reduce it.

4. **Mapbox token scope**: The token needs `styles:read` and `geocoding:read` scopes.

5. **RLS policies**: All tables have RLS enabled. The policy pattern is `auth.role() = 'authenticated'` for full CRUD. Admin-only features use `users.role = 'admin'` check in application code, not RLS.

6. **`script_lead_usage` unique constraint**: One script per lead enforced at DB level via `unique(lead_id)`. The upsert uses `onConflict: 'lead_id'` to update the assignment.
