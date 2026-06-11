import { createClient } from '@/lib/supabase'
import { ActivityLog } from '@/types/activity.types'
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
