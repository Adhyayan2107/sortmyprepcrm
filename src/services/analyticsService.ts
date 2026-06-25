import { createClient } from '@/lib/supabase'
import { ServiceResult } from '@/types/api.types'
import { TABLES, STAGE_POINTS } from '@/lib/constants'

export interface KpiData {
  assigned: number
  contacted: number
  confirmed: number
  conversionRate: number
}

export interface OutreachFunnelStep {
  label: string
  count: number
  rate: number | null  // % conversion from previous step (null for first)
  icon: 'email' | 'message' | 'call' | 'confirm' | 'leads'
}

export interface StageFunnelItem {
  stage: string
  count: number
}

export interface RepPerformanceRow {
  id: string
  name: string
  assigned: number
  emailed: number
  called: number
  confirmed: number
  convRate: number
}

export interface CountryLeadItem {
  country: string
  count: number
}

export interface AnalyticsSummary {
  kpi: KpiData
  outreachFunnel: OutreachFunnelStep[]
  stageFunnel: StageFunnelItem[]
  repPerformance: RepPerformanceRow[]
  topCountries: CountryLeadItem[]
}

export interface RepOption {
  id: string
  name: string
}

const RESPONDED_STAGES = new Set(['Responded', 'Meeting Booked', 'Meeting Done', 'Negotiating', 'Confirmed'])

type LeadRow = {
  id: string
  stage: string
  country: string
  assigned_to: string | null
  email_count: number
  message_count: number
  call_count: number
}

function buildOutreachFunnel(leads: LeadRow[]): OutreachFunnelStep[] {
  const assigned = leads.length
  const emailed = leads.filter((l) => l.email_count > 0).length
  const responded = leads.filter((l) => RESPONDED_STAGES.has(l.stage)).length
  const called = leads.filter((l) => l.call_count > 0).length
  const confirmed = leads.filter((l) => l.stage === 'Confirmed').length

  const pct = (num: number, den: number) =>
    den > 0 ? Math.round((num / den) * 100) : 0

  return [
    { label: 'Assigned',  count: assigned,  rate: null,                    icon: 'leads'   },
    { label: 'Emailed',   count: emailed,   rate: pct(emailed, assigned),  icon: 'email'   },
    { label: 'Responded', count: responded, rate: pct(responded, emailed), icon: 'message' },
    { label: 'Called',    count: called,    rate: pct(called, assigned),   icon: 'call'    },
    { label: 'Confirmed', count: confirmed, rate: pct(confirmed, called),  icon: 'confirm' },
  ]
}

export async function getRepOptions(): Promise<ServiceResult<RepOption[]>> {
  const supabase = createClient()
  const { data, error } = await supabase.from(TABLES.USERS).select('id, name')
  if (error) return { success: false, error: error.message }
  return { success: true, data: (data as { id: string; name: string | null }[]).map((u) => ({ id: u.id, name: u.name ?? u.id.slice(0, 8) })) }
}

export async function getAnalyticsSummary(
  userId?: string   // if provided: filter to leads assigned to this user
): Promise<ServiceResult<AnalyticsSummary>> {
  const supabase = createClient()

  let query = supabase
    .from(TABLES.LEADS)
    .select('id, stage, country, assigned_to, email_count, message_count, call_count')

  if (userId) query = query.eq('assigned_to', userId)

  const [leadsRes, usersRes] = await Promise.all([
    query,
    supabase.from(TABLES.USERS).select('id, name'),
  ])

  if (leadsRes.error) return { success: false, error: leadsRes.error.message }
  if (usersRes.error) return { success: false, error: usersRes.error.message }

  const leads = leadsRes.data as LeadRow[]
  const users = usersRes.data as { id: string; name: string | null }[]

  // KPIs
  const assigned = leads.length
  const contacted = leads.filter((l) => l.stage !== 'New Lead' && l.stage !== 'Blocked/Dead').length
  const confirmed = leads.filter((l) => l.stage === 'Confirmed').length
  const conversionRate = assigned > 0 ? Math.round((confirmed / assigned) * 100) : 0

  // Stage funnel
  const stageCounts: Record<string, number> = {}
  for (const l of leads) {
    stageCounts[l.stage] = (stageCounts[l.stage] ?? 0) + 1
  }
  const stageFunnel: StageFunnelItem[] = Object.entries(stageCounts)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => (STAGE_POINTS[b.stage] ?? 0) - (STAGE_POINTS[a.stage] ?? 0))

  // Outreach funnel
  const outreachFunnel = buildOutreachFunnel(leads)

  // Rep performance (only meaningful when viewing all reps, i.e. no userId filter)
  const repMap: Record<string, { name: string; assigned: number; emailed: number; called: number; confirmed: number }> = {}
  for (const u of users) {
    repMap[u.id] = { name: u.name ?? u.id.slice(0, 8), assigned: 0, emailed: 0, called: 0, confirmed: 0 }
  }
  for (const l of leads) {
    if (l.assigned_to && repMap[l.assigned_to]) {
      repMap[l.assigned_to].assigned++
      if (l.email_count > 0) repMap[l.assigned_to].emailed++
      if (l.call_count > 0) repMap[l.assigned_to].called++
      if (l.stage === 'Confirmed') repMap[l.assigned_to].confirmed++
    }
  }
  const repPerformance: RepPerformanceRow[] = Object.entries(repMap)
    .map(([id, r]) => ({
      id,
      name: r.name,
      assigned: r.assigned,
      emailed: r.emailed,
      called: r.called,
      confirmed: r.confirmed,
      convRate: r.assigned > 0 ? Math.round((r.confirmed / r.assigned) * 100) : 0,
    }))
    .filter((r) => r.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned)

  // Top countries
  const countryCounts: Record<string, number> = {}
  for (const l of leads) {
    if (l.country) countryCounts[l.country] = (countryCounts[l.country] ?? 0) + 1
  }
  const topCountries: CountryLeadItem[] = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    success: true,
    data: {
      kpi: { assigned, contacted, confirmed, conversionRate },
      outreachFunnel,
      stageFunnel,
      repPerformance,
      topCountries,
    },
  }
}
