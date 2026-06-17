import { createClient } from '@/lib/supabase'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export interface KpiData {
  totalLeads: number
  leadsThisWeek: number
  confirmedLeads: number
  conversionRate: number
}

export interface StageFunnelItem {
  stage: string
  count: number
}

export interface RepPerformanceRow {
  id: string
  name: string
  assigned: number
  confirmed: number
  avgStagePoints: number
}

export interface CountryLeadItem {
  country: string
  count: number
}

export interface AnalyticsSummary {
  kpi: KpiData
  funnel: StageFunnelItem[]
  repPerformance: RepPerformanceRow[]
  topCountries: CountryLeadItem[]
}

// Stage order for computing avg stage points (reuse STAGE_POINTS if available)
const STAGE_ORDER: Record<string, number> = {
  'New Lead': 1,
  'Contacted': 2,
  'Responded': 3,
  'Meeting Booked': 4,
  'Meeting Done': 5,
  'Negotiating': 6,
  'Confirmed': 7,
  'Blocked/Dead': 0,
}

export async function getAnalyticsSummary(): Promise<ServiceResult<AnalyticsSummary>> {
  const supabase = createClient()

  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const [leadsRes, usersRes] = await Promise.all([
    supabase.from(TABLES.LEADS).select('id, stage, country, assigned_to, created_at'),
    supabase.from(TABLES.USERS).select('id, name'),
  ])

  if (leadsRes.error) return { success: false, error: leadsRes.error.message }
  if (usersRes.error) return { success: false, error: usersRes.error.message }

  const leads = leadsRes.data as {
    id: string; stage: string; country: string; assigned_to: string | null; created_at: string
  }[]
  const users = usersRes.data as { id: string; name: string | null }[]

  // KPIs
  const totalLeads = leads.length
  const leadsThisWeek = leads.filter((l) => new Date(l.created_at) >= oneWeekAgo).length
  const confirmedLeads = leads.filter((l) => l.stage === 'Confirmed').length
  const conversionRate = totalLeads > 0 ? Math.round((confirmedLeads / totalLeads) * 100) : 0

  // Stage funnel
  const stageCounts: Record<string, number> = {}
  for (const lead of leads) {
    stageCounts[lead.stage] = (stageCounts[lead.stage] ?? 0) + 1
  }
  const funnel: StageFunnelItem[] = Object.entries(stageCounts)
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => (STAGE_ORDER[b.stage] ?? 0) - (STAGE_ORDER[a.stage] ?? 0))

  // Rep performance
  const repMap: Record<string, { name: string; assigned: number; stagePoints: number; confirmed: number }> = {}
  for (const user of users) {
    repMap[user.id] = { name: user.name ?? user.id.slice(0, 8), assigned: 0, stagePoints: 0, confirmed: 0 }
  }
  for (const lead of leads) {
    if (lead.assigned_to && repMap[lead.assigned_to]) {
      repMap[lead.assigned_to].assigned++
      repMap[lead.assigned_to].stagePoints += STAGE_ORDER[lead.stage] ?? 0
      if (lead.stage === 'Confirmed') repMap[lead.assigned_to].confirmed++
    }
  }
  const repPerformance: RepPerformanceRow[] = Object.entries(repMap)
    .map(([id, r]) => ({
      id,
      name: r.name,
      assigned: r.assigned,
      confirmed: r.confirmed,
      avgStagePoints: r.assigned > 0 ? Math.round((r.stagePoints / r.assigned) * 10) / 10 : 0,
    }))
    .filter((r) => r.assigned > 0)
    .sort((a, b) => b.assigned - a.assigned)

  // Top countries
  const countryCounts: Record<string, number> = {}
  for (const lead of leads) {
    if (lead.country) countryCounts[lead.country] = (countryCounts[lead.country] ?? 0) + 1
  }
  const topCountries: CountryLeadItem[] = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    success: true,
    data: {
      kpi: { totalLeads, leadsThisWeek, confirmedLeads, conversionRate },
      funnel,
      repPerformance,
      topCountries,
    },
  }
}
