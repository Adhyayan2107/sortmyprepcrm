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

export async function bulkInsertLeads(
  leads: LeadInsert[]
): Promise<ServiceResult<{ inserted: number; duplicates: string[] }>> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from(TABLES.LEADS)
    .select('name, country')

  const existingSet = new Set(
    (existing ?? []).map((r: { name: string; country: string }) => `${r.name}::${r.country}`)
  )

  const toInsert = leads.filter(
    (l) => !existingSet.has(`${l.name}::${l.country}`)
  )
  const duplicates = leads
    .filter((l) => existingSet.has(`${l.name}::${l.country}`))
    .map((l) => l.name)

  if (toInsert.length === 0) {
    return { success: true, data: { inserted: 0, duplicates } }
  }

  const { error } = await supabase.from(TABLES.LEADS).insert(toInsert)
  if (error) return { success: false, error: error.message }

  return { success: true, data: { inserted: toInsert.length, duplicates } }
}
