'use client'

import { Suspense } from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLeadRows } from '@/hooks/useLeads'
import { PipelineStage } from '@/types/pipeline.types'
import { Lead, LeadListRow } from '@/types/lead.types'
import { AppUser } from '@/types/user.types'
import { getAllUsers } from '@/services/userService'
import { bulkAssignLeads } from '@/services/leadService'
import { useUser } from '@/hooks/useUser'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import LeadFormModal from '@/components/leads/LeadFormModal'
import ScriptsModal from '@/components/scripts/ScriptsModal'
import LeadsFilterBar from '@/components/leads/LeadsFilterBar'
import BulkAssignBar from '@/components/leads/BulkAssignBar'
import LeadsTable from '@/components/leads/LeadsTable'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

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

  const searchParams = useSearchParams()

  useEffect(() => {
    getAllUsers().then((res) => { if (res.success) setUsers(res.data) })
  }, [])

  useEffect(() => {
    if (searchParams.get('view') === 'mine') setViewMode('mine')
    const q = searchParams.get('search')
    if (q !== null) setSearch(q)
  }, [searchParams])

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country))].sort(),
    [rows]
  )

  const filtered = useMemo(() => rows.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.country.toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'All' || r.stage === stageFilter
    const matchCountry = !countryFilter || r.country === countryFilter
    const matchAssigned = !assignedFilter || r.assigned_to === assignedFilter
    const matchMine = viewMode === 'all' || r.assigned_to === currentUser?.id
    return matchSearch && matchStage && matchCountry && matchAssigned && matchMine
  }), [rows, search, stageFilter, countryFilter, assignedFilter, viewMode, currentUser])

  function toggleSelect(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleSelectAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((r) => r.id)))
  }

  async function handleBulkAssign() {
    if (selected.size === 0) return
    setBulkSaving(true)
    const res = await bulkAssignLeads([...selected], bulkAssignTo === '' ? null : bulkAssignTo)
    if (res.success) { setSelected(new Set()); setBulkAssignTo(''); await refetch() }
    setBulkSaving(false)
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">
          {viewMode === 'mine' ? 'My Leads' : 'All Leads'}
          <span className="ml-2 text-base font-normal text-gray-400">({filtered.length})</span>
        </h1>
        <div className="flex items-center gap-2">
          {/* All / Mine toggle — mobile only (sidebar handles this on desktop) */}
          <div className="md:hidden flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['all', 'mine'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 font-medium transition-colors ${viewMode === m ? 'bg-[#0F172A] text-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {m === 'all' ? 'All' : 'Mine'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
          >
            + Add Lead
          </button>
        </div>
      </div>

      <LeadsFilterBar
        search={search} stageFilter={stageFilter} countryFilter={countryFilter} assignedFilter={assignedFilter}
        countries={countries} users={users}
        onSearch={setSearch} onStage={setStageFilter} onCountry={setCountryFilter} onAssigned={setAssignedFilter}
      />

      {selected.size > 0 && (
        <BulkAssignBar
          selectedCount={selected.size} bulkAssignTo={bulkAssignTo} saving={bulkSaving} users={users}
          onAssignToChange={setBulkAssignTo} onAssign={handleBulkAssign} onClear={() => setSelected(new Set())}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={rows.length === 0 ? 'Import your first CSV to get started' : 'Try adjusting your filters'}
        />
      ) : (
        <LeadsTable
          rows={filtered} selected={selected} users={users}
          onSelect={toggleSelect} onSelectAll={toggleSelectAll}
          onRowClick={setSelectedId} onEdit={setEditRow}
        />
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
          onSave={(_lead: Lead) => { refetch(); setShowAddModal(false) }}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {editRow && (
        <LeadFormModal
          mode="edit"
          initial={editRow}
          onSave={(_lead: Lead) => { refetch(); setEditRow(null) }}
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
