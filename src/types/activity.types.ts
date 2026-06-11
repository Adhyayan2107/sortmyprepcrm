export type ActivityType = 'note' | 'call' | 'meeting' | 'stage_change' | 'email'

export interface ActivityLog {
  id: string
  lead_id: string
  type: ActivityType
  summary: string | null
  outcome: string | null
  done_by: string | null
  from_stage: string | null
  to_stage: string | null
  fathom_id: string | null
  callhippo_id: string | null
  recording_url: string | null
  created_at: string
}
