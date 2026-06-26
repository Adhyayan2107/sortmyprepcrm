# Lead Contacts — Design Spec
_2026-06-27_

## Problem

Founder/contact data per lead is currently stored as a freetext blob in the `notes` column (`"Founder: Name\nFounder Phone: 123\n..."`). The import deduplication drops a row entirely when a lead with the same `name + country` already exists, silently losing any new contact data for that school. This makes multi-contact schools (Principal, CEO, Founder) impossible to track properly.

## Goal

1. Store contacts relationally in a `lead_contacts` table.
2. During import, if a lead already exists, add its contacts to `lead_contacts` instead of skipping.
3. Show contacts as structured cards in the lead detail UI with add/delete support.

---

## Database

### New table: `lead_contacts`

```sql
create table lead_contacts (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  name        text,
  designation text,   -- "Principal", "CEO", "Founder", etc.
  phone       text,
  email       text,
  linkedin    text,
  created_at  timestamptz not null default now()
);

-- Prevents the same person being added twice to the same lead
create unique index lead_contacts_lead_email_uidx
  on lead_contacts(lead_id, email)
  where email is not null and email <> '';
```

### RLS

```sql
alter table lead_contacts enable row level security;

create policy "authenticated read"  on lead_contacts for select using (auth.role() = 'authenticated');
create policy "authenticated insert" on lead_contacts for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete" on lead_contacts for delete using (auth.role() = 'authenticated');
```

Migration file: `db/11_lead_contacts.sql`

---

## Import Logic

### Parser changes (`src/utils/importParser.ts`)

`LeadInsert` gains an optional `_contacts` field (underscore-prefixed, stripped before DB insert):

```ts
_contacts?: Array<{
  name: string | null
  designation: string | null
  phone: string | null
  email: string | null
  linkedin: string | null
}>
```

In `transformRows`, founder fields (`founder_name`, `founder_number`, `founder_email`, `founder_linkedin`) are mapped into `_contacts[0]` instead of being concatenated into `notes`. Fields `num_teachers`, `category_of_lead`, `type_col` stay in `notes` as before.

### Service changes (`src/services/leadService.ts`)

`bulkInsertLeads` new flow:

```
for each incoming lead:
  if name+country already exists in DB:
    → upsert contacts into lead_contacts for that lead_id
    → add lead name to `duplicates` list (UI still shows it as a duplicate lead)
    → increment `contacts_added` counter
  else:
    → insert lead
    → insert _contacts into lead_contacts for the new lead_id
```

Return type gains `contacts_added: number`.

Deduplication within the incoming batch: same as today — first occurrence wins, rest are duplicates.

Contact insert uses `on conflict (lead_id, email) do nothing` so re-importing the same file is safe.

### Types (`src/types/lead.types.ts`)

```ts
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
```

---

## Service Layer

New file: `src/services/leadContactService.ts`

```ts
getContactsByLeadId(leadId: string): Promise<ServiceResult<LeadContact[]>>
addContact(leadId: string, contact: Omit<LeadContact, 'id' | 'lead_id' | 'created_at'>): Promise<ServiceResult<LeadContact>>
deleteContact(contactId: string): Promise<ServiceResult<null>>
```

---

## UI

### `LeadInfoTab` — Contacts section

Replaces the `parseImportedNotes` hack for founder fields. Reads from `lead_contacts` via `getContactsByLeadId`.

Layout (below the existing phone/email/website fields):

```
── CONTACTS ──────────────────────────────
[Card] Dilip Vasu · Principal
       📞 +91-9654506004
       ✉  dilip@choithram.com
       🔗 linkedin.com/...          [🗑]

[Card] Sumit Nandedkar · CEO
       ✉  sumit@hotmail.com         [🗑]

[+ Add contact]
──────────────────────────────────────────
```

"Add contact" expands an inline form with fields: Name, Designation, Phone, Email, LinkedIn. Submit calls `addContact`. No edit — delete and re-add.

The existing `parseImportedNotes` function and its display block stay in place for backwards compat with leads imported before this change.

### `getLeadById` change

Fetch contacts alongside the lead:

```ts
// In LeadDetailPanel or wherever getLeadById is called:
const [lead, contacts] = await Promise.all([
  getLeadById(id),
  getContactsByLeadId(id),
])
```

Pass `contacts` and `onContactsChange` down to `LeadInfoTab`.

### Import summary (`import/page.tsx`)

`ImportSummary` type gains `contacts_added: number`. The "done" screen adds:

```
109 leads added
 23 contacts added to existing leads
  4 duplicates skipped (same lead, same contact)
```

---

## What is NOT in scope

- Editing a contact (delete + re-add covers it, YAGNI)
- Migrating existing notes-blob contacts to the new table (old leads display fine via `parseImportedNotes`)
- Contact-level outreach tracking (separate feature if needed later)
- Admin-only vs. user-level contact permissions (same RLS as leads)

---

## Files touched

| File | Change |
|---|---|
| `db/11_lead_contacts.sql` | New migration |
| `src/types/lead.types.ts` | Add `LeadContact`, `_contacts` on `LeadInsert` |
| `src/utils/importParser.ts` | Map founder fields to `_contacts` instead of notes |
| `src/services/leadContactService.ts` | New service |
| `src/services/leadService.ts` | Update `bulkInsertLeads` |
| `src/components/leads/tabs/LeadInfoTab.tsx` | Contacts section + add/delete UI |
| `src/components/leads/LeadDetailPanel.tsx` | Fetch + pass contacts |
| `src/app/(dashboard)/import/page.tsx` | Show `contacts_added` in summary |
