'use client'

import { Suspense } from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLeadRows } from '@/hooks/useLeads'
import { PIPELINE_STAGES } from '@/lib/constants'
import { PipelineStage } from '@/types/pipeline.types'
import { Lead, LeadListRow } from '@/types/lead.types'
import { AppUser } from '@/types/user.types'
import { getAllUsers } from '@/services/userService'
import { bulkAssignLeads } from '@/services/leadService'
import StageBadge from '@/components/ui/StageBadge'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import LeadFormModal from '@/components/leads/LeadFormModal'
import ScriptsModal from '@/components/scripts/ScriptsModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'
import { formatDate, formatCurriculum } from '@/utils/formatters'
import { useUser } from '@/hooks/useUser'

function LeadsPageInner() {
  const { rows, loading, error, refetch } = useLeadRows()
  const { user: currentUser } = useUser()
  const [viewMode, setViewMode] = useState<'all' | 'mine'>('all')
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRow, setEditRow] = useState<LeadListRow | null>(null)

  useEffect(() => {
    getAllUsers().then((res) => { if (res.success) setUsers(res.data) })
  }, [])

  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('view') === 'mine') setViewMode('mine')
    const q = searchParams.get('search')
    if (q !== null) setSearch(q)
  }, [searchParams])

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
      const matchMine = viewMode === 'all' || r.assigned_to === currentUser?.id
      return matchSearch && matchStage && matchCountry && matchAssigned && matchMine
    })
  }, [rows, search, stageFilter, countryFilter, assignedFilter, viewMode, currentUser])

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

  function handleLeadCreated(_lead: Lead) {
    refetch()
    setShowAddModal(false)
  }

  function handleLeadEdited(_lead: Lead) {
    refetch()
    setEditRow(null)
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">
            {viewMode === 'mine' ? 'My Leads' : 'All Leads'}
            <span className="ml-2 text-base font-normal text-gray-400">({filtered.length})</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* All / Mine toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'all' ? 'bg-[#0F172A] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setViewMode('mine')}
              className={`px-3 py-1.5 font-medium transition-colors ${
                viewMode === 'mine' ? 'bg-[#0F172A] text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Mine
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
          >
            + Add Lead
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <input
          type="text"
          placeholder="Search name or country…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="col-span-2 sm:col-span-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as PipelineStage | 'All')}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="All">All Stages</option>
          {PIPELINE_STAGES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={countryFilter}
          onChange={(e) => setCountryFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="">All Countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        >
          <option value="">All Reps</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
          ))}
        </select>
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
                  <th className="px-4 py-3 w-10" />
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
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditRow(row)}
                          className="text-slate-400 hover:text-[#2563EB] transition-colors"
                          title="Edit lead"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
                          </svg>
                        </button>
                      </td>
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

      {showAddModal && (
        <LeadFormModal
          mode="create"
          onSave={handleLeadCreated}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editRow && (
        <LeadFormModal
          mode="edit"
          initial={editRow}
          onSave={handleLeadEdited}
          onClose={() => setEditRow(null)}
        />
      )}
    </div>
  )
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  )
}
