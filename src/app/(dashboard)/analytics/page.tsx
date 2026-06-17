'use client'

import { useEffect, useState, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  getAnalyticsSummary, getRepOptions,
  AnalyticsSummary, OutreachFunnelStep, RepOption,
} from '@/services/analyticsService'
import { useUser } from '@/hooks/useUser'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

// ─── Stage colors ─────────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  'Confirmed':     '#10B981',
  'Negotiating':   '#8B5CF6',
  'Meeting Done':  '#3B82F6',
  'Meeting Booked':'#60A5FA',
  'Responded':     '#F59E0B',
  'Contacted':     '#94A3B8',
  'New Lead':      '#CBD5E1',
  'Blocked/Dead':  '#F87171',
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, accent,
}: {
  label: string; value: string | number; sub?: string
  accent: { bg: string; text: string; icon: React.ReactNode }
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4 items-start shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent.bg}`}>
        <span className={accent.text}>{accent.icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Funnel Step Icon ─────────────────────────────────────────────────────────
const STEP_STYLE: Record<OutreachFunnelStep['icon'], { bg: string; ring: string; text: string }> = {
  leads:   { bg: 'bg-slate-100',    ring: 'ring-slate-200',   text: 'text-slate-500'   },
  email:   { bg: 'bg-blue-50',      ring: 'ring-blue-200',    text: 'text-blue-500'    },
  message: { bg: 'bg-amber-50',     ring: 'ring-amber-200',   text: 'text-amber-500'   },
  call:    { bg: 'bg-violet-50',    ring: 'ring-violet-200',  text: 'text-violet-500'  },
  confirm: { bg: 'bg-emerald-50',   ring: 'ring-emerald-200', text: 'text-emerald-500' },
}

function FunnelStepIcon({ type }: { type: OutreachFunnelStep['icon'] }) {
  const s = 'w-7 h-7'
  if (type === 'email') return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
  if (type === 'message') return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
  if (type === 'call') return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
  if (type === 'confirm') return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  return <svg className={s} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}

// ─── Outreach Conversion Flow ─────────────────────────────────────────────────
function OutreachFlow({ steps }: { steps: OutreachFunnelStep[] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-6">
        Outreach Conversion Flow
      </p>
      <div className="flex items-stretch justify-between gap-2">
        {steps.map((step, i) => {
          const st = STEP_STYLE[step.icon]
          const nextRate = steps[i + 1]?.rate
          return (
            <div key={step.label} className="flex items-center gap-2 flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
                <div className={`w-16 h-16 rounded-2xl ring-2 flex items-center justify-center ${st.bg} ${st.ring} ${st.text}`}>
                  <FunnelStepIcon type={step.icon} />
                </div>
                <p className="text-[28px] font-bold text-slate-900 leading-none">{step.count}</p>
                <p className="text-xs text-slate-400 font-medium whitespace-nowrap">{step.label}</p>
              </div>

              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="flex flex-col items-center gap-1 shrink-0 w-12">
                  {nextRate !== null ? (
                    <span className={`text-[11px] font-bold ${nextRate === 0 ? 'text-red-400' : nextRate < 20 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {nextRate}%
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-300">—</span>
                  )}
                  <svg className="w-8 h-3 text-slate-300" viewBox="0 0 32 12" fill="none">
                    <path d="M0 6h28M22 1l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AI Insights Panel ────────────────────────────────────────────────────────
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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">AI Insights</h2>
            <p className="text-[11px] text-slate-400">Powered by Groq · based on current view</p>
          </div>
        </div>
        {fetched && (
          <button
            onClick={loadInsights}
            disabled={loading}
            className="text-xs text-[#2563EB] font-medium hover:underline disabled:opacity-40"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      {!fetched ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <p className="text-sm text-slate-400 text-center max-w-xs">
            Analyse your outreach data and get actionable recommendations.
          </p>
          <button
            onClick={loadInsights}
            disabled={loading}
            className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1D4ED8] transition-colors disabled:opacity-60 shadow-sm"
          >
            {loading ? 'Analysing…' : 'Generate Insights'}
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : insights && insights.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-4">
              <svg className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p
                className="text-xs text-slate-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.+?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400 text-center py-6">No insights returned — check your AI API key.</p>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function AnalyticsInner() {
  const { user, loading: userLoading } = useUser()
  const [reps, setReps] = useState<RepOption[]>([])
  const [selectedRepId, setSelectedRepId] = useState<string>('')
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (userLoading) return
    if (!isAdmin && user?.id) setSelectedRepId(user.id)
    if (isAdmin) getRepOptions().then((res) => { if (res.success) setReps(res.data) })
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
  if (error) return <p className="text-center text-red-500 mt-16">{error}</p>
  if (!data) return null

  const { kpi, outreachFunnel, stageFunnel, repPerformance, topCountries } = data
  const maxStage = Math.max(...stageFunnel.map((f) => f.count), 1)
  const viewingRepName = isAdmin
    ? (selectedRepId ? reps.find((r) => r.id === selectedRepId)?.name : undefined)
    : (user?.name ?? undefined)

  const kpiCards = [
    {
      label: 'Assigned Leads',
      value: kpi.assigned,
      sub: undefined,
      accent: {
        bg: 'bg-blue-50', text: 'text-blue-500',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      },
    },
    {
      label: 'Contacted',
      value: kpi.contacted,
      sub: 'past New Lead',
      accent: {
        bg: 'bg-violet-50', text: 'text-violet-500',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
      },
    },
    {
      label: 'Confirmed',
      value: kpi.confirmed,
      sub: 'deals closed',
      accent: {
        bg: 'bg-emerald-50', text: 'text-emerald-500',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
      },
    },
    {
      label: 'Conversion Rate',
      value: `${kpi.conversionRate}%`,
      sub: 'assigned → confirmed',
      accent: {
        bg: kpi.conversionRate > 5 ? 'bg-emerald-50' : 'bg-amber-50',
        text: kpi.conversionRate > 5 ? 'text-emerald-500' : 'text-amber-500',
        icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
      },
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              {viewingRepName ? `Viewing ${viewingRepName}'s pipeline` : 'Full team overview'}
            </p>
          </div>
          {isAdmin && (
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className="h-9 border border-slate-200 rounded-xl px-3 text-sm text-slate-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            >
              <option value="">All Reps</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((c) => <KpiCard key={c.label} {...c} />)}
        </div>

        {/* ── Outreach Flow ── */}
        <OutreachFlow steps={outreachFunnel} />

        {/* ── Pipeline + Countries ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Pipeline Breakdown */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Pipeline Breakdown
            </p>
            <div className="space-y-3">
              {stageFunnel.map(({ stage, count }) => (
                <div key={stage} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-32 shrink-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: STAGE_COLORS[stage] ?? '#94A3B8' }}
                    />
                    <span className="text-xs text-slate-500 truncate">{stage}</span>
                  </div>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxStage) * 100}%`,
                        backgroundColor: STAGE_COLORS[stage] ?? '#94A3B8',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-6 text-right shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Countries */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Top Countries
            </p>
            {topCountries.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topCountries} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="country" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} fill="#2563EB" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Rep Performance (admin all-team only) ── */}
        {isAdmin && !selectedRepId && repPerformance.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
              Rep Performance
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                    {['Rep', 'Assigned', 'Emailed', 'Called', 'Confirmed', 'Conv.%'].map((h, i) => (
                      <th key={h} className={`pb-3 font-semibold ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {repPerformance.map((rep) => (
                    <tr key={rep.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-medium text-slate-800">{rep.name}</td>
                      <td className="py-3 text-right text-slate-500">{rep.assigned}</td>
                      <td className="py-3 text-right text-slate-500">{rep.emailed}</td>
                      <td className="py-3 text-right text-slate-500">{rep.called}</td>
                      <td className="py-3 text-right">
                        <span className={`font-semibold ${rep.confirmed > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>
                          {rep.confirmed}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          rep.convRate > 10
                            ? 'bg-emerald-50 text-emerald-700'
                            : rep.convRate > 0
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
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

        {/* ── AI Insights (full width, bottom) ── */}
        <InsightsPanel summary={data} repName={viewingRepName} />

      </div>
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
