# Lead Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `lead_contacts` table so multiple contacts per school are stored relationally, update import to merge contacts into existing leads instead of dropping them, and show contacts as cards with add/delete in the lead detail panel.

**Architecture:** New `lead_contacts` table with FK to `leads`. Import parser puts founder fields into a `_contacts` array on `LeadInsert` (stripped before DB write). `bulkInsertLeads` handles both new leads (insert lead + contacts) and existing leads (upsert contacts only). `LeadInfoTab` fetches and renders contacts via a new `leadContactService`.

**Tech Stack:** Supabase (SQL + RLS + JS client), Next.js App Router, React, TypeScript.

## Global Constraints

- All Supabase queries use `createClient()` from `@/lib/supabase`
- Service functions return `ServiceResult<T>` from `@/types/api.types`
- Table names come from `TABLES` constant in `@/lib/constants`
- No new npm packages
- `_contacts` field is underscore-prefixed — strip it before any DB insert
- Existing `parseImportedNotes` in `LeadInfoTab` stays for backwards compat

---

### Task 1: DB migration, types, and constants

**Files:**
- Create: `db/11_lead_contacts.sql`
- Modify: `src/lib/constants.ts`
- Modify: `src/types/lead.types.ts`

**Interfaces:**
- Produces:
  - `TABLES.LEAD_CONTACTS = 'lead_contacts'`
  - `LeadContact` interface
  - `LeadInsert._contacts` optional field
  - `LeadContactInsert` type

- [ ] **Step 1: Create the migration file**

```sql
-- db/11_lead_contacts.sql
-- Run once in Supabase SQL Editor

create table lead_contacts (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  name        text,
  designation text,
  phone       text,
  email       text,
  linkedin    text,
  created_at  timestamptz not null default now()
);

-- Prevents same email being added twice to the same lead
create unique index lead_contacts_lead_email_uidx
  on lead_contacts(lead_id, email)
  where email is not null and email <> '';

alter table lead_contacts enable row level security;

create policy "authenticated read"
  on lead_contacts for select
  using (auth.role() = 'authenticated');

create policy "authenticated insert"
  on lead_contacts for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated delete"
  on lead_contacts for delete
  using (auth.role() = 'authenticated');
```

- [ ] **Step 2: Run migration in Supabase**

Open Supabase SQL Editor → paste `db/11_lead_contacts.sql` → Run. Verify table appears in Table Editor.

- [ ] **Step 3: Add LEAD_CONTACTS to constants**

In `src/lib/constants.ts`, update `TABLES`:

```ts
export const TABLES = {
  LEADS: 'leads',
  USERS: 'users',
  ACTIVITY_LOG: 'activity_log',
  SCRIPTS: 'scripts',
  SCRIPT_RATINGS: 'script_ratings',
  LEAD_CONTACTS: 'lead_contacts',
} as const
```

- [ ] **Step 4: Add LeadContact types**

Replace the contents of `src/types/lead.types.ts` with:

```ts
import { PipelineStage } from '@/lib/constants'
import { LeadType } from '@/lib/constants'

export interface Lead {
  id: string
  name: string
  country: string
  city: string | null
  lat: number | null
  lng: number | null
  website: string | null
  phone: string | null
  email: string | null
  curriculum: string[] | null
  source: string | null
  stage: PipelineStage
  lead_type: LeadType | null
  assigned_to: string | null
  notes: string | null
  intel_brief: string | null
  intel_fetched_at: string | null
  intel_annotation: string | null
  call_count: number
  message_count: number
  email_count: number
  next_callback: string | null
  next_action: string | null
  created_at: string
  last_activity: string
}

export interface LeadContact {
  id: string
  lead_id: string
  name: string | null
  designation: string | null
  phone: string | null
  email: string | null
  linkedin: string | null
  created_at: string
}

export type LeadContactInsert = Omit<LeadContact, 'id' | 'created_at'>

export interface LeadMapPin {
  id: string
  name: string
  lat: number
  lng: number
  stage: PipelineStage
  lead_type: LeadType | null
  country: string
  city: string | null
  assigned_to: string | null
}

export interface LeadListRow {
  id: string
  name: string
  country: string
  city: string | null
  stage: PipelineStage
  lead_type: LeadType | null
  curriculum: string[] | null
  source: string | null
  created_at: string
  assigned_to: string | null
}

export interface LeadInsert {
  name: string
  country: string
  city?: string | null
  lat?: number | null
  lng?: number | null
  website?: string | null
  phone?: string | null
  email?: string | null
  curriculum?: string[] | null
  source?: string | null
  stage: PipelineStage
  lead_type?: LeadType | null
  notes?: string | null
  call_count?: number
  message_count?: number
  email_count?: number
  // Stripped before DB insert — used only to carry contacts through the import pipeline
  _contacts?: Array<{
    name: string | null
    designation: string | null
    phone: string | null
    email: string | null
    linkedin: string | null
  }>
}
```

- [ ] **Step 5: Commit**

```bash
git add db/11_lead_contacts.sql src/lib/constants.ts src/types/lead.types.ts
git commit -m "feat: add lead_contacts migration and types"
```

---

### Task 2: Contact service

**Files:**
- Create: `src/services/leadContactService.ts`

**Interfaces:**
- Consumes: `TABLES.LEAD_CONTACTS`, `LeadContact`, `LeadContactInsert`, `ServiceResult`, `createClient()`
- Produces:
  - `getContactsByLeadId(leadId: string): Promise<ServiceResult<LeadContact[]>>`
  - `addContact(contact: LeadContactInsert): Promise<ServiceResult<LeadContact>>`
  - `deleteContact(contactId: string): Promise<ServiceResult<null>>`

- [ ] **Step 1: Create the service**

```ts
// src/services/leadContactService.ts
import { createClient } from '@/lib/supabase'
import { LeadContact, LeadContactInsert } from '@/types/lead.types'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export async function getContactsByLeadId(leadId: string): Promise<ServiceResult<LeadContact[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEAD_CONTACTS)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadContact[] }
}

export async function addContact(contact: LeadContactInsert): Promise<ServiceResult<LeadContact>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEAD_CONTACTS)
    .insert(contact)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadContact }
}

export async function deleteContact(contactId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from(TABLES.LEAD_CONTACTS)
    .delete()
    .eq('id', contactId)
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/leadContactService.ts
git commit -m "feat: add leadContactService (get/add/delete)"
```

---

### Task 3: Import parser — founder fields → `_contacts`

**Files:**
- Modify: `src/utils/importParser.ts`

**Interfaces:**
- Consumes: `LeadInsert._contacts` (from Task 1)
- Produces: `LeadInsert` with `_contacts` populated from founder fields; notes no longer includes founder lines

- [ ] **Step 1: Update `transformRows` in `src/utils/importParser.ts`**

Replace the note-building and `valid.push(...)` block (lines 337–363) with:

```ts
    // Build structured notes from sheet-specific non-contact columns only
    const noteParts: string[] = []
    if (row.type_col) noteParts.push(`Type: ${row.type_col}`)
    if (row.category_of_lead) noteParts.push(`Category: ${row.category_of_lead}`)
    if (row.num_teachers) noteParts.push(`No. of Teachers: ${row.num_teachers}`)

    // Build contact from founder fields (goes to lead_contacts table, not notes)
    const hasContact = row.founder_name || row.founder_email || row.founder_number || row.founder_linkedin
    const contacts = hasContact
      ? [{
          name: row.founder_name?.trim() || null,
          designation: null,
          phone: row.founder_number?.trim() || null,
          email: row.founder_email?.trim() || null,
          linkedin: row.founder_linkedin?.trim() || null,
        }]
      : undefined

    valid.push({
      name,
      country,
      city: row.city?.trim() || null,
      lat,
      lng,
      website: row.website?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      curriculum,
      source: row.source?.trim() || null,
      stage,
      lead_type,
      notes: noteParts.length ? noteParts.join('\n') : null,
      call_count,
      message_count,
      email_count,
      _contacts: contacts,
    })
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/importParser.ts
git commit -m "feat: import parser maps founder fields to _contacts instead of notes"
```

---

### Task 4: `bulkInsertLeads` — contacts for new and existing leads

**Files:**
- Modify: `src/services/leadService.ts`

**Interfaces:**
- Consumes: `TABLES.LEAD_CONTACTS`, `LeadContactInsert` (Task 1), `LeadInsert._contacts` (Task 3)
- Produces: `bulkInsertLeads` returns `{ inserted: number; duplicates: string[]; contacts_added: number }`

- [ ] **Step 1: Update `bulkInsertLeads` in `src/services/leadService.ts`**

Replace the existing `bulkInsertLeads` function (lines 191–229) with:

```ts
export async function bulkInsertLeads(
  leads: LeadInsert[]
): Promise<ServiceResult<{ inserted: number; duplicates: string[]; contacts_added: number }>> {
  const supabase = createClient()

  // Fetch existing leads: name, country, id
  const { data: existing, error: existingError } = await supabase
    .from(TABLES.LEADS)
    .select('id, name, country')
  if (existingError) return { success: false, error: existingError.message }

  // Map "name::country" → lead id for existing leads
  const existingMap = new Map<string, string>(
    (existing ?? []).map((r: { id: string; name: string; country: string }) => [
      `${r.name.toLowerCase()}::${r.country.toLowerCase()}`,
      r.id,
    ])
  )

  const seenInBatch = new Set<string>()
  const toInsert: Omit<LeadInsert, '_contacts'>[] = []
  const toInsertContacts: Array<{ key: string; contacts: LeadInsert['_contacts'] }> = []
  const duplicates: string[] = []
  const contactsForExisting: Array<{ lead_id: string; contacts: LeadInsert['_contacts'] }> = []

  for (const lead of leads) {
    const { _contacts, ...leadData } = lead
    const key = `${lead.name.toLowerCase()}::${(lead.country ?? '').toLowerCase()}`

    if (existingMap.has(key) || seenInBatch.has(key)) {
      duplicates.push(lead.name)
      // If lead already exists and has contacts, queue them for upsert
      const existingId = existingMap.get(key)
      if (existingId && _contacts?.length) {
        contactsForExisting.push({ lead_id: existingId, contacts: _contacts })
      }
    } else {
      seenInBatch.add(key)
      toInsert.push(leadData)
      toInsertContacts.push({ key, contacts: _contacts })
    }
  }

  // Insert new leads and get back their ids
  let insertedCount = 0
  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from(TABLES.LEADS)
      .insert(toInsert)
      .select('id, name, country')
    if (error) return { success: false, error: error.message }
    insertedCount = inserted?.length ?? 0

    // Build contacts rows for newly inserted leads
    const newContactRows: LeadContactInsert[] = []
    for (const row of inserted ?? []) {
      const key = `${row.name.toLowerCase()}::${row.country.toLowerCase()}`
      const entry = toInsertContacts.find(e => e.key === key)
      if (entry?.contacts?.length) {
        for (const c of entry.contacts) {
          newContactRows.push({ lead_id: row.id, ...c })
        }
      }
    }
    if (newContactRows.length > 0) {
      await supabase
        .from(TABLES.LEAD_CONTACTS)
        .upsert(newContactRows, { onConflict: 'lead_id,email', ignoreDuplicates: true })
    }
  }

  // Upsert contacts for already-existing leads
  let contacts_added = 0
  for (const { lead_id, contacts } of contactsForExisting) {
    if (!contacts?.length) continue
    const rows: LeadContactInsert[] = contacts.map(c => ({ lead_id, ...c }))
    const { error } = await supabase
      .from(TABLES.LEAD_CONTACTS)
      .upsert(rows, { onConflict: 'lead_id,email', ignoreDuplicates: true })
    if (!error) contacts_added += rows.length
  }

  return { success: true, data: { inserted: insertedCount, duplicates, contacts_added } }
}
```

- [ ] **Step 2: Add `LeadContactInsert` import at top of `src/services/leadService.ts`**

Change line 2 from:
```ts
import { Lead, LeadInsert, LeadListRow, LeadMapPin } from '@/types/lead.types'
```
to:
```ts
import { Lead, LeadInsert, LeadContactInsert, LeadListRow, LeadMapPin } from '@/types/lead.types'
```

- [ ] **Step 3: Commit**

```bash
git add src/services/leadService.ts
git commit -m "feat: bulkInsertLeads merges contacts into existing leads"
```

---

### Task 5: Import page — show `contacts_added` in summary

**Files:**
- Modify: `src/app/(dashboard)/import/page.tsx`

**Interfaces:**
- Consumes: `bulkInsertLeads` returning `contacts_added` (Task 4)

- [ ] **Step 1: Update `ImportSummary` type and `handleConfirm` in `import/page.tsx`**

Change the `ImportSummary` interface (lines 13–17) to:
```ts
interface ImportSummary {
  inserted: number
  duplicates: string[]
  errors: Array<{ row: number; reason: string }>
  contacts_added: number
}
```

Change `setSummary(...)` in `handleConfirm` (lines 85–90) to:
```ts
    setSummary({
      inserted: result.data.inserted,
      duplicates: result.data.duplicates,
      errors: parseErrors,
      contacts_added: result.data.contacts_added,
    })
```

- [ ] **Step 2: Update the "done" summary UI**

Replace the summary display block inside `{step === 'done' && summary && (` (lines 329–346) with:

```tsx
      {step === 'done' && summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
          <div className="text-5xl">✓</div>
          <h2 className="text-xl font-bold text-emerald-600">Import Complete</h2>
          <div className="text-gray-600 space-y-1">
            <p><span className="font-semibold text-gray-900">{summary.inserted}</span> leads added</p>
            {summary.contacts_added > 0 && (
              <p><span className="font-semibold text-gray-900">{summary.contacts_added}</span> contacts added to existing leads</p>
            )}
            {summary.duplicates.length > 0 && (
              <p><span className="font-semibold text-gray-900">{summary.duplicates.length}</span> duplicates skipped</p>
            )}
            {summary.errors.length > 0 && (
              <p><span className="font-semibold text-red-500">{summary.errors.length}</span> rows failed validation</p>
            )}
          </div>
          <button
            onClick={handleReset}
            className="mt-4 px-6 py-2 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-primary)] transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/import/page.tsx
git commit -m "feat: import summary shows contacts_added count"
```

---

### Task 6: LeadDetailPanel — fetch and pass contacts

**Files:**
- Modify: `src/components/leads/LeadDetailPanel.tsx`

**Interfaces:**
- Consumes: `getContactsByLeadId` (Task 2), `LeadContact` (Task 1)
- Produces: `contacts: LeadContact[]` and `setContacts` passed as props to `LeadInfoTab`

- [ ] **Step 1: Add contacts state and fetch to `LeadDetailPanel`**

Add import at the top (after existing imports):
```ts
import { LeadContact } from '@/types/lead.types'
import { getContactsByLeadId } from '@/services/leadContactService'
```

Add state after the existing state declarations (after `const [deleteConfirm, ...]`):
```ts
  const [contacts, setContacts] = useState<LeadContact[]>([])
```

In `loadData`, add contacts fetch to the existing `Promise.all`:
```ts
  const loadData = useCallback(async () => {
    setLoading(true)
    scriptsLoadedRef.current = false
    const [leadRes, actRes, usersRes, assignedRes, contactsRes] = await Promise.all([
      getLeadById(leadId),
      getActivityForLead(leadId),
      getAllUsers(),
      getLeadAssignedScript(leadId),
      getContactsByLeadId(leadId),
    ])
    if (leadRes.success) setLead(leadRes.data)
    if (actRes.success) setActivity(actRes.data)
    if (usersRes.success) setTeamUsers(usersRes.data)
    if (assignedRes.success && assignedRes.data) setAssignedScriptId(assignedRes.data.script_id)
    if (contactsRes.success) setContacts(contactsRes.data)
    setLoading(false)
  }, [leadId])
```

- [ ] **Step 2: Pass contacts to `LeadInfoTab`**

In the JSX where `<LeadInfoTab` is rendered (around line 244), add the two new props:

```tsx
          <LeadInfoTab
            lead={lead}
            teamUsers={teamUsers}
            saving={saving}
            isAdmin={currentUser?.role === 'admin'}
            lastCallNote={activity.find((a) => a.type === 'call')?.summary ?? null}
            lastCallAt={activity.find((a) => a.type === 'call')?.created_at ?? null}
            lastCallOutcome={activity.find((a) => a.type === 'call')?.outcome ?? null}
            onStageChange={handleStageChange}
            onAssignmentChange={handleAssignmentChange}
            onCountChange={handleCountChange}
            assignedScriptTitle={allScripts.find((s) => s.id === assignedScriptId)?.title ?? null}
            onGoToScriptTab={() => setActiveTab('script')}
            contacts={contacts}
            onContactsChange={setContacts}
          />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/leads/LeadDetailPanel.tsx
git commit -m "feat: LeadDetailPanel fetches and passes contacts to LeadInfoTab"
```

---

### Task 7: LeadInfoTab — Contacts section UI

**Files:**
- Modify: `src/components/leads/tabs/LeadInfoTab.tsx`

**Interfaces:**
- Consumes: `contacts: LeadContact[]`, `onContactsChange: (c: LeadContact[]) => void`, `addContact`, `deleteContact` (Tasks 1, 2)

- [ ] **Step 1: Update Props interface in `LeadInfoTab.tsx`**

Add to the top-level imports:
```ts
import { LeadContact } from '@/types/lead.types'
import { addContact, deleteContact } from '@/services/leadContactService'
```

Change the `Props` interface to add:
```ts
interface Props {
  lead: Lead
  teamUsers: AppUser[]
  saving: boolean
  isAdmin?: boolean
  lastCallNote?: string | null
  lastCallAt?: string | null
  lastCallOutcome?: string | null
  onStageChange: (stage: PipelineStage) => void
  onAssignmentChange: (userId: string) => void
  onCountChange?: (field: 'call_count' | 'message_count' | 'email_count', delta: 1 | -1) => void
  assignedScriptTitle?: string | null
  onGoToScriptTab?: () => void
  contacts?: LeadContact[]
  onContactsChange?: (contacts: LeadContact[]) => void
}
```

- [ ] **Step 2: Add ContactsSection component inside `LeadInfoTab.tsx`**

Add this component above the `export default function LeadInfoTab` line:

```tsx
function ContactsSection({ leadId, contacts, onContactsChange }: {
  leadId: string
  contacts: LeadContact[]
  onContactsChange: (c: LeadContact[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', designation: '', phone: '', email: '', linkedin: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleAdd() {
    if (!form.name && !form.email && !form.phone) return
    setSaving(true)
    const res = await addContact({
      lead_id: leadId,
      name: form.name.trim() || null,
      designation: form.designation.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      linkedin: form.linkedin.trim() || null,
    })
    if (res.success) {
      onContactsChange([...contacts, res.data])
      setForm({ name: '', designation: '', phone: '', email: '', linkedin: '' })
      setShowForm(false)
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    const res = await deleteContact(id)
    if (res.success) onContactsChange(contacts.filter(c => c.id !== id))
    setDeletingId(null)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Contacts</p>
      <div className="space-y-2">
        {contacts.map(c => (
          <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2.5 relative group">
            <button
              onClick={() => handleDelete(c.id)}
              disabled={deletingId === c.id}
              className="absolute top-2 right-2 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-40"
              title="Remove contact"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <div className="pr-6">
              <p className="text-sm font-medium text-gray-800">
                {c.name || <span className="text-gray-400 italic">Unnamed</span>}
                {c.designation && (
                  <span className="ml-1.5 text-xs font-normal text-gray-400">· {c.designation}</span>
                )}
              </p>
              {c.phone && <p className="text-xs text-gray-500 mt-0.5">{c.phone}</p>}
              {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
              {c.linkedin && (
                <a href={c.linkedin} target="_blank" rel="noreferrer"
                  className="text-xs text-[var(--color-brand-accent)] hover:underline break-all">
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        ))}

        {contacts.length === 0 && !showForm && (
          <p className="text-xs text-gray-400 italic">No contacts yet</p>
        )}

        {showForm ? (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
            {[
              { key: 'name', placeholder: 'Name' },
              { key: 'designation', placeholder: 'Designation (e.g. Principal)' },
              { key: 'phone', placeholder: 'Phone' },
              { key: 'email', placeholder: 'Email' },
              { key: 'linkedin', placeholder: 'LinkedIn URL' },
            ].map(({ key, placeholder }) => (
              <input
                key={key}
                type="text"
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-accent)]"
              />
            ))}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleAdd}
                disabled={saving || (!form.name && !form.email && !form.phone)}
                className="px-3 py-1.5 rounded-md bg-[var(--color-brand-accent)] text-white text-xs font-semibold hover:bg-[var(--color-brand-primary)] disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-md border border-gray-200 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full border border-dashed border-gray-200 rounded-lg py-1.5 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
          >
            + Add contact
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add `useState` import if not already present**

The file already imports from React — ensure `useState` is included:
```ts
import { useState } from 'react'
```
(Check the existing imports; if `useState` is missing, add it.)

- [ ] **Step 4: Use `ContactsSection` in `LeadInfoTab`**

In the `export default function LeadInfoTab(...)` signature, destructure the new props:
```ts
export default function LeadInfoTab({ lead, teamUsers, saving, isAdmin, lastCallNote, lastCallAt, lastCallOutcome, onStageChange, onAssignmentChange, onCountChange, assignedScriptTitle, onGoToScriptTab, contacts = [], onContactsChange }: Props) {
```

Add the `ContactsSection` below the Outreach counters block (after the closing `</div>` of the Outreach section, before the `founderRows` block):

```tsx
      {onContactsChange && (
        <ContactsSection
          leadId={lead.id}
          contacts={contacts}
          onContactsChange={onContactsChange}
        />
      )}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/leads/tabs/LeadInfoTab.tsx
git commit -m "feat: LeadInfoTab shows contacts section with add/delete UI"
```

---

## Self-Review

**Spec coverage:**
- ✅ `lead_contacts` table with RLS — Task 1
- ✅ `LeadContact` type + `_contacts` on `LeadInsert` — Task 1
- ✅ `getContactsByLeadId`, `addContact`, `deleteContact` — Task 2
- ✅ Import parser maps founder fields to `_contacts` — Task 3
- ✅ `bulkInsertLeads` merges contacts into existing leads — Task 4
- ✅ `contacts_added` counter in import summary — Task 5
- ✅ `LeadDetailPanel` fetches contacts — Task 6
- ✅ `LeadInfoTab` contact cards + add/delete — Task 7
- ✅ Backwards compat: `parseImportedNotes` stays for old leads — Task 7 (not touched)

**Type consistency check:**
- `LeadContactInsert = Omit<LeadContact, 'id' | 'created_at'>` — used in Task 4 bulk insert and Task 2 service ✅
- `addContact` in service takes `LeadContactInsert` — `ContactsSection` calls it with `{ lead_id, name, designation, phone, email, linkedin }` which matches ✅
- `onConflict: 'lead_id,email'` — matches the unique index column names ✅

**Placeholder scan:** No TBDs, all code blocks complete. ✅
