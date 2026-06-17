import { createClient } from '@/lib/supabase'
import { Lead, LeadInsert, LeadListRow, LeadMapPin } from '@/types/lead.types'
import { PipelineStage } from '@/types/pipeline.types'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export async function getAllLeadPins(): Promise<ServiceResult<LeadMapPin[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .select('id, name, lat, lng, stage, country, city')
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadMapPin[] }
}

export async function getAllLeadRows(): Promise<ServiceResult<LeadListRow[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEADS)
    .select('id, name, country, city, stage, curriculum, source, created_at, assigned_to')
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
): Promise<ServiceResult<{ inserted: number; duplicates: string[] }>> {
  const supabase = createClient()

  const { data: existing, error: existingError } = await supabase
    .from(TABLES.LEADS)
    .select('name, country')

  if (existingError) return { success: false, error: existingError.message }

  const existingSet = new Set(
    (existing ?? []).map((r: { name: string; country: string }) => `${r.name.toLowerCase()}::${r.country.toLowerCase()}`)
  )

  // Deduplicate within the incoming batch itself
  const seenInBatch = new Set<string>()
  const toInsert: LeadInsert[] = []
  const duplicates: string[] = []

  for (const lead of leads) {
    const key = `${lead.name.toLowerCase()}::${lead.country.toLowerCase()}`
    if (existingSet.has(key) || seenInBatch.has(key)) {
      duplicates.push(lead.name)
    } else {
      seenInBatch.add(key)
      toInsert.push(lead)
    }
  }

  if (toInsert.length === 0) {
    return { success: true, data: { inserted: 0, duplicates } }
  }

  const { error } = await supabase.from(TABLES.LEADS).insert(toInsert)
  if (error) return { success: false, error: error.message }

  return { success: true, data: { inserted: toInsert.length, duplicates } }
}
