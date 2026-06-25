import { PipelineStage } from '@/lib/constants'

export const STAGE_COLORS: Record<PipelineStage, string> = {
  'New Lead': '#94A3B8',
  'Contacted': '#60A5FA',
  'Responded': '#38BDF8',
  'Meeting Booked': '#FBBF24',
  'Meeting Done': '#FB923C',
  'Negotiating': '#A78BFA',
  'Confirmed': '#34D399',
  'Blocked/Dead': '#F87171',
}

export function getStageColor(stage: PipelineStage): string {
  return STAGE_COLORS[stage] ?? '#94A3B8'
}
