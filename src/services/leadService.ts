import { createClient } from '@/lib/supabase'
import { Lead, LeadInsert, LeadContactInsert, LeadListRow, LeadMapPin } from '@/types/lead.types'
import { PipelineStage } from '@/lib/constants'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export async function getAllLeadPins(): Promise<ServiceResult<LeadMapPin[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .select('id, name, lat, lng, stage, lead_type, country, city, assigned_to')
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadMapPin[] }
}

export async function getAllLeadRows(): Promise<ServiceResult<LeadListRow[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .select('id, name, country, city, stage, lead_type, curriculum, source, created_at, assigned_to')
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadListRow[] }
}

export async function getLeadById(id: string): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

export async function updateLeadStage(
  id: string,
  stage: PipelineStage
): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .update({ stage, last_activity: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

export async function updateLeadAssignment(
  id: string,
  assignedTo: string | null
): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .update({ assigned_to: assignedTo, last_activity: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

export async function bulkAssignLeads(
  ids: string[],
  assignedTo: string | null
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from(TABLES.LEADS)
    .update({ assigned_to: assignedTo, last_activity: new Date().toISOString() })
    .in('id', ids)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function saveIntelAnnotation(
  id: string,
  annotation: string
): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .update({ intel_annotation: annotation })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

export async function createLead(lead: LeadInsert): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .insert(lead)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

export async function updateLeadDetails(
  id: string,
  updates: Partial<Omit<LeadInsert, 'stage'>> & { stage?: string; notes?: string | null }
): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .update({ ...updates, last_activity: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

export async function saveCallOutcome(
  id: string,
  updates: { next_callback?: string | null; stage?: string }
): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  // Split UPDATE and SELECT: a RLS SELECT policy that differs from UPDATE would
  // cause .select().single() after update to return no rows and mask the write.
  const { error: updateErr } = await supabase
    .from(TABLES.LEADS)
    .update({ ...updates, last_activity: new Date().toISOString() })
    .eq('id', id)
  if (updateErr) return { success: false, error: updateErr.message }

  const { data, error: fetchErr } = await supabase
    .from(TABLES.LEADS)
    .select('*')
    .eq('id', id)
    .single()
  if (fetchErr) return { success: false, error: fetchErr.message }
  return { success: true, data: data as Lead }
}

export async function deleteLead(id: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase.from(TABLES.LEADS).delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function bulkDeleteLeads(ids: string[]): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase.from(TABLES.LEADS).delete().in('id', ids)
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function incrementLeadCount(
  id: string,
  field: 'call_count' | 'message_count' | 'email_count',
  delta: 1 | -1
): Promise<ServiceResult<Lead>> {
  const supabase = createClient()
  const { data: current, error: fetchErr } = await supabase
    .from(TABLES.LEADS)
    .select(field)
    .eq('id', id)
    .single()
  if (fetchErr) return { success: false, error: fetchErr.message }
  const next = Math.max(0, ((current as Record<string, number>)[field] ?? 0) + delta)
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .update({ [field]: next })
    .eq('id', id)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}

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

    if (existingMap.has(key)) {
      duplicates.push(lead.name)
      const existingId = existingMap.get(key)
      if (existingId && _contacts?.length) {
        contactsForExisting.push({ lead_id: existingId, contacts: _contacts })
      }
    } else if (seenInBatch.has(key)) {
      // Same school, another contact row — accumulate contacts, don't count as duplicate
      if (_contacts?.length) {
        const entry = toInsertContacts.find(e => e.key === key)
        if (entry) entry.contacts = [...(entry.contacts ?? []), ..._contacts]
      }
    } else {
      seenInBatch.add(key)
      toInsert.push(leadData)
      toInsertContacts.push({ key, contacts: _contacts })
    }
  }

  // Insert new leads and get back their ids
  let contacts_added = 0
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
      const { error } = await supabase
        .from(TABLES.LEAD_CONTACTS)
        .upsert(newContactRows, { onConflict: 'lead_id,email', ignoreDuplicates: true })
      if (!error) contacts_added += newContactRows.length
    }
  }

  // Upsert contacts for already-existing leads
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
