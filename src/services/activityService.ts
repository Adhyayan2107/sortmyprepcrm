import { createClient } from '@/lib/supabase'
import { ActivityLog } from '@/types/activity.types'
import { PipelineStage } from '@/types/pipeline.types'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export async function getActivityForLead(
  leadId: string
): Promise<ServiceResult<ActivityLog[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.ACTIVITY_LOG)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as ActivityLog[] }
}

export async function addNote(
  leadId: string,
  summary: string,
  doneBy: string
): Promise<ServiceResult<ActivityLog>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.ACTIVITY_LOG)
    .insert({
      lead_id: leadId,
      type: 'note',
      summary,
      done_by: doneBy,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // update last_activity
  await supabase
    .from(TABLES.LEADS)
    .update({ last_activity: new Date().toISOString() })
    .eq('id', leadId)

  return { success: true, data: data as ActivityLog }
}

export async function logCall(
  leadId: string,
  notes: string,
  doneBy: string
): Promise<ServiceResult<ActivityLog>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.ACTIVITY_LOG)
    .insert({ lead_id: leadId, type: 'call', summary: notes, done_by: doneBy })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase
    .from(TABLES.LEADS)
    .update({ last_activity: new Date().toISOString() })
    .eq('id', leadId)

  return { success: true, data: data as ActivityLog }
}

export async function logStageChange(
  leadId: string,
  fromStage: PipelineStage,
  toStage: PipelineStage,
  doneBy: string
): Promise<ServiceResult<ActivityLog>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.ACTIVITY_LOG)
    .insert({
      lead_id: leadId,
      type: 'stage_change',
      summary: `Stage changed from "${fromStage}" to "${toStage}"`,
      done_by: doneBy,
      from_stage: fromStage,
      to_stage: toStage,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as ActivityLog }
}
