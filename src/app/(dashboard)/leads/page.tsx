'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLeadRows } from '@/hooks/useLeads'
import { PIPELINE_STAGES } from '@/lib/constants'
import { PipelineStage } from '@/types/pipeline.types'
import { AppUser } from '@/types/user.types'
import { getAllUsers } from '@/services/userService'
import { bulkAssignLeads } from '@/services/leadService'
import StageBadge from '@/components/ui/StageBadge'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import ScriptsModal from '@/components/scripts/ScriptsModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurriculum } from '@/utils/formatters'

export default function LeadsPage() {
  const { rows, loading, error, refetch } = useLeadRows()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'All'>('All')
  const [countryFilter, setCountryFilter] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<AppUser[]>([])
  const [bulkAssignTo, setBulkAssignTo] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [showScripts, setShowScripts] = useState(false)

  useEffect(() => {
    getAllUsers().then((res) => { if (res.success) setUsers(res.data) })
  }, [])

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country))].sort(),
    [rows]
  )

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.country.toLowerCase().includes(search.toLowerCase())
      const matchStage = stageFilter === 'All' || r.stage === stageFilter
      const matchCountry = !countryFilter || r.country === countryFilter
      const matchAssigned = !assignedFilter || r.assigned_to === assignedFilter
      return matchSearch && matchStage && matchCountry && matchAssigned
    })
  }, [rows, search, stageFilter, countryFilter, assignedFilter])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((r) => r.id)))
    }
  }

  async function handleBulkAssign() {
    if (selected.size === 0) return
    setBulkSaving(true)
    const val = bulkAssignTo === '' ? null : bulkAssignTo
    const res = await bulkAssignLeads([...selected], val)
    if (res.success) {
      setSelected(new Set())
      setBulkAssignTo('')
      await refetch()
    }
    setBulkSaving(false)
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header + Filters */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-[var(--color-brand-primary)] flex-1">
            Leads <span className="text-base font-normal text-gray-400">({filtered.length})</span>
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Search name or country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
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
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
          >
            <option value="">All Countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
          >
            <option value="">All Reps</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk assign bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 bg-[var(--color-brand-light)] border border-[var(--color-brand-accent)] rounded-lg px-4 py-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--color-brand-primary)]">
            {selected.size} selected
          </span>
          <select
            value={bulkAssignTo}
            onChange={(e) => setBulkAssignTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
          >
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
            ))}
          </select>
          <button
            onClick={handleBulkAssign}
            disabled={bulkSaving}
            className="px-3 py-1 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-60"
          >
            {bulkSaving ? 'Saving…' : 'Assign'}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={rows.length === 0 ? 'Import your first CSV to get started' : 'Try adjusting your filters'}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  {['Name', 'Country', 'City', 'Stage', 'Curriculum', 'Source', 'Assigned', 'Added'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => {
                  const assignedUser = users.find((u) => u.id === row.assigned_to)
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-[var(--color-brand-light)] transition-colors ${
                        selected.has(row.id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(row.id)}
                          onChange={() => toggleSelect(row.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 cursor-pointer" onClick={() => setSelectedId(row.id)}>{row.name}</td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelectedId(row.id)}>{row.country}</td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelectedId(row.id)}>{row.city ?? '—'}</td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedId(row.id)}><StageBadge stage={row.stage} /></td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelectedId(row.id)}>{formatCurriculum(row.curriculum)}</td>
                      <td className="px-4 py-3 text-gray-600 cursor-pointer" onClick={() => setSelectedId(row.id)}>{row.source ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => setSelectedId(row.id)}>
                        {assignedUser ? assignedUser.name ?? '—' : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 cursor-pointer" onClick={() => setSelectedId(row.id)}>{formatDate(row.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedId(null)} />
          <LeadDetailPanel
            leadId={selectedId}
            onClose={() => setSelectedId(null)}
            onStageChange={() => refetch()}
            onViewScripts={() => setShowScripts(true)}
          />
        </>
      )}

      {showScripts && <ScriptsModal onClose={() => setShowScripts(false)} />}
    </div>
  )
}
