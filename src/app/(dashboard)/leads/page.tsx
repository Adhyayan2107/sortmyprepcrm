'use client'

import { useState, useMemo } from 'react'
import { useLeadRows } from '@/hooks/useLeads'
import { PIPELINE_STAGES } from '@/lib/constants'
import { PipelineStage } from '@/types/pipeline.types'
import StageBadge from '@/components/ui/StageBadge'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurriculum } from '@/utils/formatters'

export default function LeadsPage() {
  const { rows, loading, error, refetch } = useLeadRows()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'All'>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.country.toLowerCase().includes(search.toLowerCase())
      const matchStage = stageFilter === 'All' || r.stage === stageFilter
      return matchSearch && matchStage
    })
  }, [rows, search, stageFilter])

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)] flex-1">
          Leads <span className="text-base font-normal text-gray-400">({filtered.length})</span>
        </h1>
        <input
          type="text"
          placeholder="Search by name or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | 'All')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
        >
          <option value="All">All Stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={rows.length === 0 ? 'Import your first CSV to get started' : 'Try adjusting your search or filter'}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Name', 'Country', 'City', 'Stage', 'Curriculum', 'Source', 'Added'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="hover:bg-[var(--color-brand-light)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-3 text-gray-600">{row.country}</td>
                    <td className="px-4 py-3 text-gray-600">{row.city ?? '—'}</td>
                    <td className="px-4 py-3"><StageBadge stage={row.stage} /></td>
                    <td className="px-4 py-3 text-gray-600">{formatCurriculum(row.curriculum)}</td>
                    <td className="px-4 py-3 text-gray-600">{row.source ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setSelectedId(null)}
          />
          <LeadDetailPanel
            leadId={selectedId}
            onClose={() => setSelectedId(null)}
            onStageChange={() => refetch()}
          />
        </>
      )}
    </div>
  )
}
