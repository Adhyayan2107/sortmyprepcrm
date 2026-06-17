# sortmyprepCRM — Claude Code Build Prompt

## Project Overview

You are building **sortmyprepCRM** — an internal CRM for a small team (5–6 people) that manages outreach to IB/IGCSE/A-Level coaching centers globally, starting with the Middle East.

The app is a **Next.js web application** with:
- A **world map** as the command center (Mapbox GL JS)
- A **lead pipeline** with 8 stages
- **CSV import** as the primary lead input method
- Integrations with Fathom.video, CallHippo, and Claude AI (later phases)

Build this **phase by phase**. Do not build ahead. Complete each phase fully before moving to the next.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Database + Auth | Supabase (free tier) |
| Map | Mapbox GL JS |
| AI | Claude API (Anthropic) — Phase 4+ |
| Hosting | Vercel (free tier) |
| Language | TypeScript |

---

## Database Schema

### `leads` table
```sql
id              uuid primary key default gen_random_uuid()
name            text not null
country         text not null
city            text
lat             float
lng             float
website         text
phone           text
email           text
curriculum      text[]        -- ['IB', 'IGCSE', 'A-Levels', 'AS-Levels']
source          text          -- 'Google Maps', 'Directory', 'Manual'
stage           text not null default 'New Lead'
assigned_to     uuid references users(id)
notes           text
intel_brief     text          -- AI-generated company brief (Phase 4)
created_at      timestamptz default now()
last_activity   timestamptz default now()
```

### `users` table (extends Supabase auth.users)
```sql
id              uuid primary key references auth.users(id)
name            text
role            text default 'rep'   -- 'admin' or 'rep'
countries       text[]               -- assigned territories
```

### `activity_log` table
```sql
id              uuid primary key default gen_random_uuid()
lead_id         uuid references leads(id) on delete cascade
type            text    -- 'note', 'call', 'meeting', 'stage_change', 'email'
summary         text
outcome         text
done_by         uuid references users(id)
from_stage      text
to_stage        text
fathom_id       text
callhippo_id    text
recording_url   text
created_at      timestamptz default now()
```

### `scripts` table (Phase 3)
```sql
id              uuid primary key default gen_random_uuid()
contact_type    text    -- 'School', 'Coaching Center', 'Private Teacher', 'Parent', 'Career Counsellor'
title           text
content         text    -- rich text / markdown
usage_count     int default 0
created_by      uuid references users(id)
created_at      timestamptz default now()
archived        boolean default false
```

### `script_ratings` table (Phase 3)
```sql
id              uuid primary key default gen_random_uuid()
script_id       uuid references scripts(id) on delete cascade
rated_by        uuid references users(id)
rating          int     -- 1 to 5
note            text
created_at      timestamptz default now()
```

---

## Pipeline Stages

These are the 8 fixed stages. Store as text. Pin colors on the map:

| Stage | Map Pin Color |
|---|---|
| New Lead | #94A3B8 (grey) |
| Contacted | #60A5FA (blue) |
| Responded | #38BDF8 (light blue) |
| Meeting Booked | #FBBF24 (yellow) |
| Meeting Done | #FB923C (orange) |
| Negotiating | #A78BFA (purple) |
| Confirmed | #34D399 (green) |
| Blocked/Dead | #F87171 (red) |

---

## CSV Import Format

The CSV file the team uploads must have these exact column headers:

```
name, country, city, lat, lng, website, phone, email, curriculum, source
```

- `curriculum` is a pipe-separated string: `IB|IGCSE|A-Levels`
- `lat` and `lng` are decimal numbers
- All fields except `name` and `country` are optional
- On import: duplicates detected by matching `name` + `country` — flag but allow override

---

## Phase 1 — Deployable Base

**Goal: a live working app on Vercel that the team can log into today.**

Build exactly these things and nothing else:

### 1. Project Setup
- Scaffold Next.js 14 with TypeScript and Tailwind CSS
- Connect Supabase — create all tables listed above (leads, users, activity_log)
- Set up environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`
- Deploy to Vercel — must be live at a URL

### 2. Authentication
- Email/password login page at `/login`
- Supabase Auth — session management
- Middleware to protect all routes — redirect to `/login` if not authenticated
- On first login, create user profile row in `users` table
- Simple logout button in the nav

### 3. Layout & Navigation
- Sidebar navigation with: Map, Leads, Import (more items added in later phases)
- Top bar with user name and logout
- Responsive layout (sidebar collapses on small screens)
- Brand colors: primary `#1E3A5F`, accent `#2E86AB`

### 4. CSV Import (`/import`)
- File upload component that accepts `.csv` files
- Parse CSV, validate columns match the expected format
- Show preview table of rows before confirming import
- On confirm: insert rows into `leads` table, auto-set `stage = 'New Lead'`
- Show import summary: X leads added, Y duplicates skipped
- Error handling: show which rows failed and why

### 5. World Map (`/` homepage)
- Full-screen Mapbox map
- Render a pin for every lead using lat/lng
- Pin color = pipeline stage color (see stage table above)
- Click a pin → slide-out panel on the right showing:
  - Center name, country, city
  - Website, phone, email
  - Current stage (dropdown to change it inline)
  - Curriculum tags
  - Assigned to (display only in Phase 1)
- Stage change from the panel updates the database immediately
- Map controls: zoom in/out, reset to Middle East view by default

### 6. Lead List View (`/leads`)
- Table showing all leads with columns: Name, Country, City, Stage, Curriculum, Source, Date Added
- Click a row → same slide-out panel as the map
- Basic search by name or country (client-side filter)
- Stage filter dropdown

### 7. Deploy
- Push to GitHub
- Connect repo to Vercel
- Set environment variables in Vercel dashboard
- Confirm app is live and all features work on the deployed URL

---

## Phase 2 — Team & Pipeline Management

Build after Phase 1 is deployed and confirmed working.

- User role system: `admin` sees all leads, `rep` sees only leads assigned to them or their countries
- Admin panel at `/admin/users` — add users, assign roles, assign countries
- Lead assignment: assign a lead to a team member (dropdown in lead panel)
- Bulk assign: select multiple leads in list view → assign to user
- Activity timeline on lead panel: show all activity log entries in chronological order
- Manual note entry: text box on lead panel → saves to `activity_log` with type `note`
- Stage change auto-logged to `activity_log` with `from_stage` and `to_stage`
- Map filter bar: filter pins by country, stage, assigned user
- List view filters: same filters as map

---

## Phase 3 — Call Scripts Library

Build after Phase 2 is confirmed working.

### Routes
- `/scripts` — main scripts library page
- `/scripts/[id]` — individual script view/edit

### Features
- Scripts page shows 5 tabs: Schools | Coaching Centers | Private Teachers | Parents | Career Counsellors
- Each tab lists scripts for that contact type, sorted by average rating (highest first)
- Each script card shows: title, average star rating, usage count, snippet of content
- Create new script: title, contact type, content (markdown textarea)
- Edit/archive existing scripts
- Script detail page: full content + star rating widget (1–5) + notes field
- Rating submit: saves to `script_ratings`, updates average shown on card
- Usage count increments when a team member opens a script from within a lead panel
- Quick-access inside lead panel: "View Scripts" button → modal showing scripts for the most relevant contact type

---

## Phase 4 — Pre-Call Company Intel

Build after Phase 3 is confirmed working.

### Requirements
- Add `ANTHROPIC_API_KEY` to environment variables
- "Get Intel" button on every lead detail panel
- On click: POST to `/api/intel` with the lead's website URL and name
- API route fetches the website content (use `cheerio` or `fetch` + text extraction)
- Sends content to Claude API with this system prompt:

```
You are a research assistant for a sales team that sells services to IB/IGCSE coaching centers.
Given the following website content from a coaching center, extract and return a structured brief with:
1. What subjects/curricula they offer (IB, IGCSE, A-Levels, etc.)
2. Who their students are (age groups, levels)
3. How long they appear to have been operating
4. Their teaching format (online, in-person, hybrid)
5. Any social media or contact details found
6. Overall tone and positioning (premium, affordable, academic, etc.)
7. Any red flags or notes relevant to a sales call

Be concise. Return as plain text with clear headings. Max 300 words.
```

- Save returned brief to `leads.intel_brief`
- Display in a collapsible section on the lead panel
- Show "Last fetched: [date]" so team knows how fresh it is
- Team member can add their own annotation below the AI brief

---

## Phase 5 — Fathom & CallHippo Integration

Build after Phase 4 is confirmed working.

### Fathom Webhook
- Create webhook endpoint at `/api/webhooks/fathom`
- Fathom sends a POST after each meeting ends with: meeting title, attendees (emails), summary, action items, date
- Match meeting to a lead by: check attendee email domains against lead website domains
- If matched: create `activity_log` entry with type `meeting`, summary = Fathom summary
- If unmatched: save to a pending queue, show in admin panel for manual matching

### CallHippo Webhook  
- Create webhook endpoint at `/api/webhooks/callhippo`
- CallHippo sends a POST after each call: phone number, duration, recording URL, outcome, agent name
- Match to lead by phone number (normalize format before matching: strip spaces, dashes, country codes)
- If matched: create `activity_log` entry with type `call`
- If unmatched: flag for manual matching in admin panel

### UI Updates
- Activity timeline now shows auto-logged calls and meetings with distinct icons
- Meeting entries show Fathom summary collapsed by default, expandable
- Call entries show duration, outcome, and link to recording

---

## Phase 6 — Pre-Call Brief & Follow-Up Intelligence

Build after Phase 5 is confirmed working.

### Pre-Call Brief
- "Generate Brief" button on lead panel (different from "Get Intel" — this is a relationship summary)
- Pulls together: intel brief, all activity log entries (calls, meetings, notes), last stage change, any outstanding action items from Fathom summaries
- Sends to Claude API with prompt:

```
You are a briefing assistant for a sales rep about to call or meet with a coaching center.
Summarize the full relationship history below into a concise pre-call brief:
- What we know about this center (from intel brief)
- What has happened so far (calls, meetings, key discussion points)
- What was agreed or promised last time
- Any outstanding action items
- Recommended talking points for this call

Be direct and practical. Max 250 words. Write it like a briefing note, not a report.
```

- Display in a modal when button is clicked
- Option to copy to clipboard

### Follow-Up Reminders
- Background check (run via Vercel cron or on-page load): find leads where `last_activity` > 7 days ago and stage is not Confirmed/Blocked
- Highlight these leads in the list view with a subtle warning indicator
- On map: show a small clock icon on pins that need follow-up
- `/reminders` page: list all leads needing attention, sorted by days since last activity

---

## Phase 7 — Analytics & Polish

Build after Phase 6 is confirmed working.

### Analytics (`/analytics`)
- Pipeline funnel chart: count of leads at each stage
- Bar chart: leads by country
- Bar chart: activity this week (calls + meetings) by team member
- Table: conversion rate by country (New Lead → Confirmed %)
- Leads added over time (line chart, last 90 days)
- Use `recharts` library for all charts

### Polish
- Duplicate detection on CSV import (match by name + country, warn before inserting)
- Export to CSV button on list view (exports current filtered view)
- Empty states for all pages (first-time experience)
- Loading skeletons for map and list
- Mobile responsive — sidebar becomes bottom nav on mobile
- Toast notifications for all actions (lead updated, import complete, etc.)

---

## Phases 9–10 (Future — Do Not Build Now)

- **Phase 9**: AI lead qualification — paste a URL, Claude checks if they teach IB curriculum
- **Phase 10**: Automated lead generation — Google Maps API scraping by city/country

---

## Engineering Standards

These are non-negotiable. Apply them from Phase 1 onward. Do not skip them for speed.

---

### SOLID Principles

**S — Single Responsibility Principle**
Every file, function, and component does exactly one thing.
- A component renders UI. It does not fetch data, transform data, or contain business logic.
- A service function handles one domain operation (e.g. `createLead`, `updateStage`, `importCSV`). It does not mix concerns.
- API routes validate input, call a service, return a response. No business logic lives in the route handler itself.

Structure:
```
src/
  components/       # UI only — no direct Supabase calls
  services/         # All database operations (leads, users, scripts, activity)
  hooks/            # Data-fetching hooks (useLeads, useUser, useScripts)
  lib/              # Supabase client, Mapbox config, Claude client — init only
  types/            # All TypeScript interfaces and enums
  utils/            # Pure helper functions (CSV parsing, phone normalisation, stage colours)
  app/              # Next.js routes — thin controllers only
    api/            # API routes — validate → call service → respond
```

**O — Open/Closed Principle**
Code is open for extension, closed for modification.
- Pipeline stages are defined once in `src/types/pipeline.ts` as a typed enum/const. Every component that uses stages imports from there — never hardcode stage strings in components.
- Stage colors are defined in one map: `STAGE_COLORS` in `src/utils/stages.ts`. Adding a new stage means adding one entry there — nothing else changes.
- Contact types for scripts are defined in `src/types/scripts.ts`. New contact types are added there, not scattered across components.

**L — Liskov Substitution Principle**
Subtypes must be substitutable for their base types without breaking behaviour.
- All service functions return consistent shapes. Define a `ServiceResult<T>` type:
```typescript
type ServiceResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string }
```
Every service function returns `ServiceResult<T>`. Callers always handle both cases. No service throws uncaught exceptions.

**I — Interface Segregation Principle**
No component or function should depend on interfaces it does not use.
- Split types by use. Example: `LeadMapPin` (id, lat, lng, stage, name) is separate from `LeadDetail` (all fields) which is separate from `LeadListRow` (name, country, stage, assigned_to, created_at). Components only receive what they need.
- Do not pass full lead objects to map pin components. Pass only the fields the map needs.

**D — Dependency Inversion Principle**
High-level modules should not depend on low-level modules. Both should depend on abstractions.
- Components never import Supabase directly. They call hooks or services.
- API routes never import Supabase directly. They call service functions.
- The Supabase client is initialised once in `src/lib/supabase.ts` (client) and `src/lib/supabase-server.ts` (server). Everything else imports from there.
- The Claude API client is initialised once in `src/lib/claude.ts`. No other file imports Anthropic directly.

---

### Additional Engineering Rules

**DRY — Don't Repeat Yourself**
- Shared UI patterns (buttons, badges, cards, modals, empty states, loading skeletons) go in `src/components/ui/`. Build them once, use everywhere.
- Stage badge (colored pill with stage name) is one component: `<StageBadge stage={stage} />`. It is never re-implemented inline.
- All Supabase table names, column names, and RPC names are defined as constants in `src/lib/constants.ts`. Never hardcode table names as strings in queries.

**TypeScript — Strict Mode**
- Enable `"strict": true` in `tsconfig.json` from day one.
- No `any`. No `// @ts-ignore`. If you don't know the type, define it.
- Database row types are generated from Supabase schema using `supabase gen types typescript`. Import and use them everywhere.
- All API request and response bodies have explicit TypeScript interfaces in `src/types/api.ts`.

**Error Handling**
- All service functions return `ServiceResult<T>` — never throw to the UI.
- All API routes return consistent JSON: `{ success: true, data: T }` or `{ success: false, error: string, code?: string }`.
- All async operations in components are wrapped in try/catch or use the `ServiceResult` pattern.
- User-facing errors are human-readable. Log technical details to console in dev only.

**Component Rules**
- Every component is in its own file.
- No component file exceeds 150 lines. If it does, split it.
- Props interfaces are defined above the component, named `[ComponentName]Props`.
- No inline styles. Tailwind classes only.
- No hardcoded colors in components — use Tailwind config tokens mapped to brand colors.

**Tailwind Config**
Define brand colors once in `tailwind.config.ts`:
```typescript
colors: {
  brand: {
    primary: '#1E3A5F',
    accent: '#2E86AB',
    light: '#EAF4FB',
  }
}
```
Use `text-brand-primary`, `bg-brand-accent` etc. Never write `#1E3A5F` in a component.

**File & Folder Naming**
- Components: PascalCase (`LeadDetailPanel.tsx`)
- Hooks: camelCase with `use` prefix (`useLeads.ts`)
- Services: camelCase (`leadService.ts`)
- Utils: camelCase (`csvParser.ts`, `phoneNormalizer.ts`)
- Types: camelCase (`lead.types.ts`)
- API routes: Next.js convention (`app/api/leads/route.ts`)

**Security**
- All API routes validate the user session before doing anything.
- Supabase Row Level Security (RLS) enabled on all tables from Phase 1.
  - `leads`: reps can only read/write leads where `assigned_to = auth.uid()` OR their country is in the lead's country AND their role is 'rep'. Admins read/write all.
  - `activity_log`: users can only insert rows where `done_by = auth.uid()`. Read access scoped to leads they can see.
  - `scripts` and `script_ratings`: all authenticated users can read. Only creator or admin can edit/delete.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. Server-side only.
- Validate and sanitise all CSV input before inserting to database.

**Testing Mindset**
- Write pure utility functions (CSV parser, phone normalizer, stage color mapper) so they are trivially testable.
- Keep business logic out of components and API routes so it can be tested in isolation.
- No test framework required for MVP phases, but structure code as if tests will be added.

---

### Folder Structure (Enforce From Phase 1)

```
sortmyprepcrm/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx        # Map view
│   │   │   ├── leads/
│   │   │   ├── import/
│   │   │   ├── scripts/        # Phase 3
│   │   │   ├── analytics/      # Phase 7
│   │   │   └── admin/          # Phase 2
│   │   └── api/
│   │       ├── leads/
│   │       ├── import/
│   │       ├── intel/          # Phase 4
│   │       └── webhooks/       # Phase 5
│   ├── components/
│   │   ├── ui/                 # Reusable primitives (Button, Badge, Modal, etc.)
│   │   ├── map/                # Map-specific components
│   │   ├── leads/              # Lead-specific components
│   │   ├── scripts/            # Phase 3
│   │   └── layout/             # Sidebar, TopBar, PageWrapper
│   ├── services/
│   │   ├── leadService.ts
│   │   ├── userService.ts
│   │   ├── activityService.ts
│   │   ├── scriptService.ts    # Phase 3
│   │   └── intelService.ts     # Phase 4
│   ├── hooks/
│   │   ├── useLeads.ts
│   │   ├── useUser.ts
│   │   └── useScripts.ts       # Phase 3
│   ├── lib/
│   │   ├── supabase.ts         # Client-side Supabase client
│   │   ├── supabase-server.ts  # Server-side Supabase client
│   │   ├── claude.ts           # Anthropic client (Phase 4)
│   │   └── constants.ts        # Table names, stage list, contact types
│   ├── types/
│   │   ├── lead.types.ts
│   │   ├── user.types.ts
│   │   ├── pipeline.types.ts
│   │   ├── script.types.ts     # Phase 3
│   │   ├── api.types.ts
│   │   └── database.types.ts   # Supabase generated types
│   └── utils/
│       ├── csvParser.ts
│       ├── phoneNormalizer.ts
│       ├── stageColors.ts
│       └── formatters.ts
├── public/
├── .env.local
├── tailwind.config.ts
└── tsconfig.json
```

---

### Build Rules

1. **Build phase by phase.** Do not add Phase 2 features while building Phase 1.
2. **Free tiers only.** Vercel free, Supabase free, Mapbox free tier.
3. **No unnecessary dependencies.** Keep the package list lean. Question every new package.
4. **TypeScript strict mode.** No `any`. No exceptions.
5. **Environment variables** for all API keys — never hardcode.
6. **Mobile-first** styling with Tailwind.
7. **SOLID + DRY from day one** — do not defer structure cleanup to later phases.
8. **RLS on Supabase** — enable on all tables before deploying Phase 1.
9. **ServiceResult pattern** — all service functions return `{ success, data/error }`.
10. **One component, one file, one responsibility.**

---

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mapbox
NEXT_PUBLIC_MAPBOX_TOKEN=

# Anthropic (Phase 4+)
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Start Here (Phase 1 Command)

```
Build Phase 1 of sortmyprepCRM exactly as specified above. 
Start with: npx create-next-app@latest sortmyprepcrm --typescript --tailwind --app
Then set up Supabase, create the database tables, build auth, CSV import, the world map with Mapbox, and the lead list view.
Deploy to Vercel when Phase 1 is complete.
Do not build any Phase 2+ features.
```
