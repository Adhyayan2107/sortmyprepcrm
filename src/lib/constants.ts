export const TABLES = {
  LEADS: 'leads',
  USERS: 'users',
  ACTIVITY_LOG: 'activity_log',
  SCRIPTS: 'scripts',
  SCRIPT_RATINGS: 'script_ratings',
} as const

export const PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Responded',
  'Meeting Booked',
  'Meeting Done',
  'Negotiating',
  'Confirmed',
  'Blocked/Dead',
] as const

export const CURRICULA = ['IB', 'IGCSE', 'A-Levels', 'AS-Levels'] as const

export const LEAD_SOURCES = ['Google Maps', 'Directory', 'Manual'] as const

export const CONTACT_TYPES = [
  'School',
  'Coaching Center',
  'Aggregator',
  'Private Teacher',
  'Career Counsellor',
  'Parent',
] as const

export type PipelineStage = (typeof PIPELINE_STAGES)[number]

export const LEAD_TYPES = ['School', 'Tuition Center', 'Private Teacher', 'Aggregators'] as const
export type LeadType = typeof LEAD_TYPES[number]

export const DEFAULT_MAP_CENTER: [number, number] = [45.0, 25.0]
export const DEFAULT_MAP_ZOOM = 4

export const STAGE_POINTS: Record<string, number> = Object.fromEntries(
  PIPELINE_STAGES.map((s, i) => [s, s === 'Blocked/Dead' ? 0 : i + 1])
)
