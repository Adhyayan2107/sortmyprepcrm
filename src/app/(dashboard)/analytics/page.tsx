'use client'

import { useEffect, useState, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getAnalyticsSummary, getRepOptions, AnalyticsSummary, OutreachFunnelStep, RepOption } from '@/services/analyticsService'
import { useUser } from '@/hooks/useUser'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ── Stage colors ──────────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  'Confirmed':     '#10B981',
  'Negotiating':   '#8B5CF6',
  'Meeting Done':  '#3B82F6',
  'Meeting Booked':'#60A5FA',
  'Responded':     '#F59E0B',
  'Contacted':     '#94A3B8',
  'New Lead':      '#CBD5E1',
  'Blocked/Dead':  '#FCA5A5',
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

// ── Outreach funnel icons ─────────────────────────────────────────────────────
function FunnelIcon({ type }: { type: OutreachFunnelStep['icon'] }) {
  const cls = 'w-6 h-6'
  if (type === 'email') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  )
  if (type === 'message') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
  if (type === 'call') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  )
  if (type === 'confirm') return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
  // leads
  return (
    <svg className={cls} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

const FUNNEL_ICON_COLORS: Record<OutreachFunnelStep['icon'], string> = {
  leads:   'bg-slate-100 text-slate-500',
  email:   'bg-blue-100 text-blue-600',
  message: 'bg-amber-100 text-amber-600',
  call:    'bg-violet-100 text-violet-600',
  confirm: 'bg-emerald-100 text-emerald-600',
}

// ── Outreach Flow ─────────────────────────────────────────────────────────────
function OutreachFlow({ steps }: { steps: OutreachFunnelStep[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-6">Outreach Conversion Flow</h2>
      <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2 shrink-0">
            {/* Step bubble */}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${FUNNEL_ICON_COLORS[step.icon]}`}>
                <FunnelIcon type={step.icon} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{step.count}</p>
              <p className="text-xs text-slate-500 text-center whitespace-nowrap">{step.label}</p>
            </div>

            {/* Arrow + rate between steps */}
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center gap-1 px-1">
                <p className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  {steps[i + 1].rate !== null ? `${steps[i + 1].rate}%` : ''}
                </p>
                <svg className="w-6 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 10">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M0 5h20M15 1l5 4-5 4" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AI Insights ───────────────────────────────────────────────────────────────
function InsightsPanel({ summary, repName }: { summary: AnalyticsSummary; repName?: string }) {
  const [insights, setInsights] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  async function loadInsights() {
    setLoading(true)
    try {
      const res = await fetch('/api/analytics-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary, repName }),
      })
      const { insights: data } = await res.json()
      setInsights(data)
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
      setFetched(true)
    }
  }

  if (!fetched) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 text-amber-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-700">AI Insights</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">Get Groq-powered analysis of your outreach data.</p>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="mt-auto w-full py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
        >
          {loading ? 'Analysing…' : 'Generate Insights'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 text-amber-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-700">AI Insights</h2>
        </div>
        <button
          onClick={loadInsights}
          disabled={loading}
          className="text-xs text-[#2563EB] hover:underline disabled:opacity-50"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map((n) => (
            <div key={n} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2.5 bg-emerald-50 rounded-lg px-3 py-2.5">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p
                className="text-xs text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: insight.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'),
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">No insights available — check your AI API key.</p>
      )}
    </div>
  )
}

// ── Main analytics inner ──────────────────────────────────────────────────────
function AnalyticsInner() {
  const { user, loading: userLoading } = useUser()
  const [reps, setReps] = useState<RepOption[]>([])
  const [selectedRepId, setSelectedRepId] = useState<string>('')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  // On load: if rep, auto-select self; if admin, default to all
  useEffect(() => {
    if (userLoading) return
    if (!isAdmin && user?.id) setSelectedRepId(user.id)
    if (isAdmin) {
      getRepOptions().then((res) => { if (res.success) setReps(res.data) })
    }
  }, [user, userLoading, isAdmin])

  useEffect(() => {
    if (userLoading) return
    setLoading(true)
    setData(null)
    const uid = isAdmin ? (selectedRepId || undefined) : (user?.id ?? undefined)
    getAnalyticsSummary(uid).then((res) => {
      if (res.success) setData(res.data)
      else setError(res.error)
      setLoading(false)
    })
  }, [selectedRepId, user, userLoading, isAdmin])

  if (userLoading || loading) return <LoadingSpinner />
  if (error) return <p className="text-center text-red-500 mt-12">{error}</p>
  if (!data) return null

  const { kpi, outreachFunnel, stageFunnel, repPerformance, topCountries } = data
  const maxFunnel = Math.max(...stageFunnel.map((f) => f.count), 1)

  const viewingRepName = isAdmin
    ? (selectedRepId ? reps.find((r) => r.id === selectedRepId)?.name : undefined)
    : (user?.name ?? undefined)

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header + Rep Selector */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {viewingRepName ? `Viewing: ${viewingRepName}` : 'Whole team overview'}
          </p>
        </div>

        {isAdmin && (
          <select
            value={selectedRepId}
            onChange={(e) => setSelectedRepId(e.target.value)}
            className="h-9 border border-slate-200 rounded-lg px-3 text-sm text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
          >
            <option value="">All Reps</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Assigned Leads" value={kpi.assigned} />
        <KpiCard label="Contacted" value={kpi.contacted} color="text-blue-600" sub="past New Lead" />
        <KpiCard label="Confirmed" value={kpi.confirmed} color="text-emerald-600" />
        <KpiCard
          label="Conversion Rate"
          value={`${kpi.conversionRate}%`}
          sub="assigned → confirmed"
          color={kpi.conversionRate > 5 ? 'text-emerald-600' : 'text-slate-900'}
        />
      </div>

      {/* Outreach Flow */}
      <OutreachFlow steps={outreachFunnel} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pipeline Breakdown</h2>
          <div className="space-y-2">
            {stageFunnel.map(({ stage, count }) => (
              <div key={stage} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-28 shrink-0 truncate">{stage}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(count / maxFunnel) * 100}%`,
                      backgroundColor: STAGE_COLORS[stage] ?? '#94A3B8',
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-700 w-7 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        <InsightsPanel summary={data} repName={viewingRepName} />
      </div>

      {/* Top Countries */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Countries by Lead Volume</h2>
        {topCountries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topCountries} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="country" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip
                cursor={{ fill: '#f1f5f9' }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rep Performance (admin all-team view only) */}
      {isAdmin && !selectedRepId && repPerformance.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Rep Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Rep</th>
                  <th className="pb-2 font-semibold text-right">Assigned</th>
                  <th className="pb-2 font-semibold text-right">Emailed</th>
                  <th className="pb-2 font-semibold text-right">Called</th>
                  <th className="pb-2 font-semibold text-right">Confirmed</th>
                  <th className="pb-2 font-semibold text-right">Conv.%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {repPerformance.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 font-medium text-slate-800">{rep.name}</td>
                    <td className="py-2.5 text-right text-slate-600">{rep.assigned}</td>
                    <td className="py-2.5 text-right text-slate-600">{rep.emailed}</td>
                    <td className="py-2.5 text-right text-slate-600">{rep.called}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-semibold ${rep.confirmed > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {rep.confirmed}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
                      <span className={`font-semibold ${rep.convRate > 5 ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {rep.convRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AnalyticsInner />
    </Suspense>
  )
}
