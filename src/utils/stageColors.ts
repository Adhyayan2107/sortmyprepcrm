import { PipelineStage } from '@/types/pipeline.types'

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

export function getStageBgClass(stage: PipelineStage): string {
  const map: Record<PipelineStage, string> = {
    'New Lead': 'bg-slate-400',
    'Contacted': 'bg-blue-400',
    'Responded': 'bg-sky-400',
    'Meeting Booked': 'bg-yellow-400',
    'Meeting Done': 'bg-orange-400',
    'Negotiating': 'bg-violet-400',
    'Confirmed': 'bg-emerald-400',
    'Blocked/Dead': 'bg-red-400',
  }
  return map[stage] ?? 'bg-slate-400'
}
