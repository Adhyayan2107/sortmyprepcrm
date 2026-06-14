import { createClient } from '@/lib/supabase'
import { Script, ScriptInsert, ScriptRating, ScriptUpdate, ScriptWithScore } from '@/types/script.types'
import { ContactType } from '@/types/script.types'
import { ServiceResult } from '@/types/api.types'
import { TABLES, STAGE_POINTS } from '@/lib/constants'

export async function getScriptsByContactType(
  contactType: ContactType
): Promise<ServiceResult<Script[]>> {
  const supabase = createClient()

  const { data: scripts, error } = await supabase
    .from(TABLES.SCRIPTS)
    .select('*')
    .eq('contact_type', contactType)
    .eq('archived', false)
    .order('usage_count', { ascending: false })

  if (error) return { success: false, error: error.message }

  // Fetch avg ratings for each script
  const ids = (scripts ?? []).map((s: Script) => s.id)
  if (ids.length === 0) return { success: true, data: [] }

  const { data: ratings } = await supabase
    .from(TABLES.SCRIPT_RATINGS)
    .select('script_id, rating')
    .in('script_id', ids)

  const ratingMap = new Map<string, { sum: number; count: number }>()
  for (const r of ratings ?? []) {
    const entry = ratingMap.get(r.script_id) ?? { sum: 0, count: 0 }
    entry.sum += r.rating
    entry.count += 1
    ratingMap.set(r.script_id, entry)
  }

  const enriched = (scripts as Script[]).map((s) => {
    const entry = ratingMap.get(s.id)
    return {
      ...s,
      avg_rating: entry ? Math.round((entry.sum / entry.count) * 10) / 10 : undefined,
      rating_count: entry?.count ?? 0,
    }
  })

  // Sort by avg_rating desc
  enriched.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))

  return { success: true, data: enriched }
}

export async function getScriptById(id: string): Promise<ServiceResult<Script>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.SCRIPTS)
    .select('*')
    .eq('id', id)
    .single()

  if (error) return { success: false, error: error.message }

  const { data: ratings } = await supabase
    .from(TABLES.SCRIPT_RATINGS)
    .select('rating')
    .eq('script_id', id)

  const count = ratings?.length ?? 0
  const sum = (ratings ?? []).reduce((acc: number, r: { rating: number }) => acc + r.rating, 0)

  return {
    success: true,
    data: {
      ...(data as Script),
      avg_rating: count > 0 ? Math.round((sum / count) * 10) / 10 : undefined,
      rating_count: count,
    },
  }
}

export async function createScript(
  script: ScriptInsert,
  createdBy: string
): Promise<ServiceResult<Script>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.SCRIPTS)
    .insert({ ...script, created_by: createdBy })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Script }
}

export async function updateScript(
  id: string,
  updates: ScriptUpdate
): Promise<ServiceResult<Script>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.SCRIPTS)
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Script }
}

export async function rateScript(
  scriptId: string,
  ratedBy: string,
  rating: number,
  note?: string
): Promise<ServiceResult<ScriptRating>> {
  const supabase = createClient()

  // upsert: one rating per user per script
  const { data, error } = await supabase
    .from(TABLES.SCRIPT_RATINGS)
    .upsert(
      { script_id: scriptId, rated_by: ratedBy, rating, note: note ?? null },
      { onConflict: 'script_id,rated_by' }
    )
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as ScriptRating }
}

export async function incrementUsageCount(id: string): Promise<void> {
  const supabase = createClient()
  await supabase.rpc('increment_script_usage', { script_id: id })
}

export async function uploadScriptDocument(
  scriptId: string,
  file: File
): Promise<ServiceResult<{ url: string; name: string }>> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${scriptId}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('script-docs')
    .upload(path, file, { upsert: true })

  if (uploadError) return { success: false, error: uploadError.message }

  const { data: { publicUrl } } = supabase.storage
    .from('script-docs')
    .getPublicUrl(path)

  const { error: updateError } = await supabase
    .from(TABLES.SCRIPTS)
    .update({ document_url: publicUrl, document_name: file.name })
    .eq('id', scriptId)

  if (updateError) return { success: false, error: updateError.message }
  return { success: true, data: { url: publicUrl, name: file.name } }
}

export async function removeScriptDocument(scriptId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from(TABLES.SCRIPTS)
    .update({ document_url: null, document_name: null })
    .eq('id', scriptId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function getUserRating(
  scriptId: string,
  userId: string
): Promise<ServiceResult<ScriptRating | null>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.SCRIPT_RATINGS)
    .select('*')
    .eq('script_id', scriptId)
    .eq('rated_by', userId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as ScriptRating | null }
}

export async function assignScriptToLead(
  scriptId: string,
  leadId: string,
  assignedBy: string
): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from('script_lead_usage')
    .upsert(
      { script_id: scriptId, lead_id: leadId, assigned_by: assignedBy, assigned_at: new Date().toISOString() },
      { onConflict: 'lead_id' }
    )
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function removeScriptFromLead(leadId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from('script_lead_usage')
    .delete()
    .eq('lead_id', leadId)
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function getLeadAssignedScript(
  leadId: string
): Promise<ServiceResult<{ script_id: string; script: Script } | null>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('script_lead_usage')
    .select('script_id, script:scripts(id, title, contact_type, usage_count, content, archived, document_url, document_name, created_by, created_at)')
    .eq('lead_id', leadId)
    .maybeSingle()
  if (error) return { success: false, error: error.message }
  if (!data) return { success: true, data: null }
  return { success: true, data: { script_id: data.script_id, script: data.script as unknown as Script } }
}

export async function getScriptLeaderboard(): Promise<ServiceResult<ScriptWithScore[]>> {
  const supabase = createClient()
  const [{ data: usages, error: usageErr }, { data: scripts, error: scriptErr }] = await Promise.all([
    supabase
      .from('script_lead_usage')
      .select('script_id, lead:leads!inner(stage)'),
    supabase
      .from(TABLES.SCRIPTS)
      .select('id, title, contact_type, usage_count')
      .eq('archived', false),
  ])
  if (usageErr) return { success: false, error: usageErr.message }
  if (scriptErr) return { success: false, error: scriptErr.message }

  const scoreMap = new Map<string, { total: number; count: number }>()
  for (const u of usages ?? []) {
    const stage = (u.lead as unknown as { stage: string })?.stage ?? 'New Lead'
    const pts = STAGE_POINTS[stage] ?? 0
    const entry = scoreMap.get(u.script_id) ?? { total: 0, count: 0 }
    entry.total += pts
    entry.count += 1
    scoreMap.set(u.script_id, entry)
  }

  const enriched: ScriptWithScore[] = (scripts ?? []).map((s) => {
    const score = scoreMap.get(s.id)
    return {
      id: s.id,
      title: s.title,
      contact_type: s.contact_type as ContactType,
      usage_count: s.usage_count,
      total_points: score?.total ?? 0,
      lead_count: score?.count ?? 0,
      avg_points: score ? Math.round((score.total / score.count) * 10) / 10 : 0,
    }
  })

  enriched.sort((a, b) => b.avg_points - a.avg_points || b.total_points - a.total_points)
  return { success: true, data: enriched }
}
