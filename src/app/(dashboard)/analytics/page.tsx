'use client'

import { useEffect, useState, Suspense } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getAnalyticsSummary, AnalyticsSummary } from '@/services/analyticsService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const STAGE_COLORS: Record<string, string> = {
  'Confirmed': '#10B981',
  'Negotiating': '#8B5CF6',
  'Meeting Done': '#3B82F6',
  'Meeting Booked': '#60A5FA',
  'Responded': '#F59E0B',
  'Contacted': '#94A3B8',
  'New Lead': '#CBD5E1',
  'Blocked/Dead': '#FCA5A5',
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function AnalyticsInner() {
  const [data, setData] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAnalyticsSummary().then((res) => {
      if (res.success) setData(res.data)
      else setError(res.error)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-center text-red-500 mt-12">{error}</p>
  if (!data) return null

  const { kpi, funnel, repPerformance, topCountries } = data
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1)

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-400 mt-0.5">Overview of your pipeline and team performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Leads" value={kpi.totalLeads} />
        <KpiCard label="Added This Week" value={kpi.leadsThisWeek} color="text-blue-600" />
        <KpiCard label="Confirmed" value={kpi.confirmedLeads} color="text-emerald-600" />
        <KpiCard label="Conversion Rate" value={`${kpi.conversionRate}%`} sub="new → confirmed" color={kpi.conversionRate > 10 ? 'text-emerald-600' : 'text-slate-900'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Pipeline Funnel</h2>
          <div className="space-y-2">
            {funnel.map(({ stage, count }) => (
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

        {/* Top Countries */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Countries by Lead Volume</h2>
          {topCountries.length === 0 ? (
            <p className="text-sm text-slate-400 text-center mt-8">No data yet</p>
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
      </div>

      {/* Rep Performance */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Rep Performance</h2>
        {repPerformance.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No leads assigned to reps yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Rep</th>
                  <th className="pb-2 font-semibold text-right">Assigned</th>
                  <th className="pb-2 font-semibold text-right">Confirmed</th>
                  <th className="pb-2 font-semibold text-right">Avg Stage</th>
                  <th className="pb-2 font-semibold text-right">Conv. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {repPerformance.map((rep) => {
                  const conv = rep.assigned > 0 ? Math.round((rep.confirmed / rep.assigned) * 100) : 0
                  return (
                    <tr key={rep.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-medium text-slate-800">{rep.name}</td>
                      <td className="py-2.5 text-right text-slate-600">{rep.assigned}</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold ${rep.confirmed > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {rep.confirmed}
                        </span>
                      </td>
                      <td className="py-2.5 text-right text-slate-600">{rep.avgStagePoints}/7</td>
                      <td className="py-2.5 text-right">
                        <span className={`font-semibold ${conv > 10 ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {conv}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
