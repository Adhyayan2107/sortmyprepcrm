'use client'

import { Suspense } from 'react'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLeadRows } from '@/hooks/useLeads'
import { PipelineStage } from '@/lib/constants'
import { Lead, LeadListRow } from '@/types/lead.types'
import { LeadType } from '@/lib/constants'
import { AppUser } from '@/types/user.types'
import { getAllUsers } from '@/services/userService'
import { bulkAssignLeads, bulkDeleteLeads } from '@/services/leadService'
import { useUser } from '@/hooks/useUser'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import LeadFormModal from '@/components/leads/LeadFormModal'
import ScriptsModal from '@/components/scripts/ScriptsModal'
import LeadsFilterBar from '@/components/leads/LeadsFilterBar'
import BulkAssignBar from '@/components/leads/BulkAssignBar'
import LeadsTable from '@/components/leads/LeadsTable'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

function pageTitle(viewMine: boolean, typeFilter: string | null): string {
  if (viewMine) {
    if (typeFilter === 'School') return 'My Schools'
    if (typeFilter === 'Tuition Center') return 'My Tuition Centers'
    if (typeFilter === 'Private Teacher') return 'My Private Teachers'
    return 'My Leads'
  }
  if (typeFilter === 'School') return 'Schools'
  if (typeFilter === 'Tuition Center') return 'Tuition Centers'
  if (typeFilter === 'Private Teacher') return 'Private Teachers'
  return 'All Leads'
}

function LeadsPageInner() {
  const { rows, loading, error, refetch } = useLeadRows()
  const { user: currentUser } = useUser()
  const searchParams = useSearchParams()

  // Derived from URL — sidebar links drive these
  const viewMine = searchParams.get('view') === 'mine'
  const typeFilter = searchParams.get('type') as LeadType | null

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<PipelineStage | 'All'>('All')
  const [countryFilter, setCountryFilter] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [users, setUsers] = useState<AppUser[]>([])
  const [bulkAssignTo, setBulkAssignTo] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [showScripts, setShowScripts] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editRow, setEditRow] = useState<LeadListRow | null>(null)

  useEffect(() => {
    getAllUsers().then((res) => { if (res.success) setUsers(res.data) })
  }, [])

  // Sync search query from URL (e.g. from map click-through)
  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null) setSearch(q)
  }, [searchParams])

  // Reset selection when URL-driven filters change
  useEffect(() => { setSelected(new Set()) }, [viewMine, typeFilter])

  const countries = useMemo(
    () => [...new Set(rows.map((r) => r.country))].sort(),
    [rows]
  )

  const filtered = useMemo(() => rows.filter((r) => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.country.toLowerCase().includes(search.toLowerCase())
    const matchStage = stageFilter === 'All' || r.stage === stageFilter
    const matchCountry = !countryFilter || r.country === countryFilter
    const matchAssigned = !assignedFilter || r.assigned_to === assignedFilter
    const matchMine = !viewMine || r.assigned_to === currentUser?.id
    const matchType = !typeFilter || r.lead_type === typeFilter
    return matchSearch && matchStage && matchCountry && matchAssigned && matchMine && matchType
  }), [rows, search, stageFilter, countryFilter, assignedFilter, viewMine, currentUser, typeFilter])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      let aVal: string = ''
      let bVal: string = ''
      if (sortKey === 'Name') { aVal = a.name; bVal = b.name }
      else if (sortKey === 'Type') { aVal = a.lead_type ?? ''; bVal = b.lead_type ?? '' }
      else if (sortKey === 'Country') { aVal = a.country; bVal = b.country }
      else if (sortKey === 'Stage') { aVal = a.stage; bVal = b.stage }
      else if (sortKey === 'Assigned') {
        aVal = users.find((u) => u.id === a.assigned_to)?.name ?? ''
        bVal = users.find((u) => u.id === b.assigned_to)?.name ?? ''
      }
      else if (sortKey === 'Added') { aVal = a.created_at; bVal = b.created_at }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortKey, sortDir, users])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

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

  async function handleBulkDelete() {
    if (selected.size === 0) return
    const confirmed = window.confirm(`Delete ${selected.size} lead${selected.size > 1 ? 's' : ''}? This cannot be undone.`)
    if (!confirmed) return
    setBulkDeleting(true)
    const res = await bulkDeleteLeads([...selected])
    if (res.success) { setSelected(new Set()); await refetch() }
    setBulkDeleting(false)
  }

  if (loading) return <LoadingSpinner />
  if (error) return <p className="text-red-500 p-4">{error}</p>

  return (
    <div className="px-4 py-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">
          {pageTitle(viewMine, typeFilter)}
          <span className="ml-2 text-base font-normal text-gray-400">({filtered.length})</span>
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
        >
          + Add Lead
        </button>
      </div>

      <LeadsFilterBar
        search={search} stageFilter={stageFilter} countryFilter={countryFilter} assignedFilter={assignedFilter}
        countries={countries} users={users}
        onSearch={setSearch} onStage={setStageFilter} onCountry={setCountryFilter} onAssigned={setAssignedFilter}
      />

      {selected.size > 0 && currentUser?.role === 'admin' && (
        <BulkAssignBar
          selectedCount={selected.size}
          totalCount={filtered.length}
          bulkAssignTo={bulkAssignTo}
          saving={bulkSaving}
          deleting={bulkDeleting}
          users={users}
          onAssignToChange={setBulkAssignTo}
          onAssign={handleBulkAssign}
          onDelete={handleBulkDelete}
          onClear={() => setSelected(new Set())}
          onSelectAll={toggleSelectAll}
        />
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No leads found"
          description={rows.length === 0 ? 'Import your first CSV to get started' : 'Try adjusting your filters'}
        />
      ) : (
        <LeadsTable
          rows={sorted} selected={selected} users={users}
          isAdmin={currentUser?.role === 'admin'}
          sortKey={sortKey} sortDir={sortDir} onSort={handleSort}
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
            onDelete={() => { setSelectedId(null); refetch() }}
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
