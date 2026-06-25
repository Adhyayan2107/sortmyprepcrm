'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CONTACT_TYPES } from '@/lib/constants'
import { ContactType, ScriptWithScore } from '@/types/script.types'
import { getScriptLeaderboard } from '@/services/scriptService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

const STAGE_MAX = 7

function RankBadge({ rank }: { rank: number }) {
  const medalCls = rank === 1
    ? 'bg-amber-100 text-amber-700 border border-amber-300'
    : rank === 2
    ? 'bg-slate-100 text-slate-600 border border-slate-300'
    : rank === 3
    ? 'bg-orange-100 text-orange-700 border border-orange-300'
    : 'bg-slate-50 text-slate-500 border border-slate-200'
  return (
    <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${medalCls}`}>
      {rank}
    </span>
  )
}

function RankingsPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (CONTACT_TYPES.includes(searchParams.get('type') as ContactType)
    ? searchParams.get('type')
    : CONTACT_TYPES[0]) as ContactType

  const [allData, setAllData] = useState<ScriptWithScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScriptLeaderboard().then((res) => {
      if (res.success) setAllData(res.data)
      setLoading(false)
    })
  }, [])

  const tabData = allData.filter((s) => s.contact_type === activeTab)
  const withUsage = tabData.filter((s) => s.lead_count > 0)
  const noUsage = tabData.filter((s) => s.lead_count === 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">Script Rankings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Scripts ranked by lead-stage progress per category.</p>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {CONTACT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => router.push(`/rankings?type=${encodeURIComponent(type)}`)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === type
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {type}s
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {withUsage.length === 0 && (
            <EmptyState
              title="No rankings yet"
              description={`Assign ${activeTab} scripts to leads — rankings update as leads advance through stages.`}
            />
          )}
          {withUsage.map((s, i) => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
              <div className="shrink-0 flex items-center justify-center w-8">
                <RankBadge rank={i + 1} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">{s.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {s.contact_type} · {s.lead_count} lead{s.lead_count !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xl font-bold text-[#2563EB]">{s.avg_points.toFixed(1)}</div>
                <div className="text-xs text-slate-400">avg pts</div>
              </div>
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-sm font-semibold text-slate-700">{s.total_points}</div>
                <div className="text-xs text-slate-400">total</div>
              </div>
              <div className="w-20 shrink-0 hidden md:block">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] rounded-full"
                    style={{ width: `${Math.min((s.avg_points / STAGE_MAX) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 mt-0.5 text-center">{STAGE_MAX} max</p>
              </div>
            </div>
          ))}
          {noUsage.length > 0 && withUsage.length > 0 && (
            <p className="text-xs text-slate-400 pt-2">
              {noUsage.length} script{noUsage.length !== 1 ? 's' : ''} not yet assigned to any lead
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function RankingsPage() {
  return (
    <Suspense fallback={null}>
      <RankingsPageInner />
    </Suspense>
  )
}
