'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo, useEffect } from 'react'
import { useLeadPins } from '@/hooks/useLeads'
import { useUser } from '@/hooks/useUser'
import { PipelineStage } from '@/types/pipeline.types'
import { AppUser } from '@/types/user.types'
import { getAllUsers } from '@/services/userService'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import MapFilterBar, { MapFilters } from '@/components/map/MapFilterBar'
import ScriptsModal from '@/components/scripts/ScriptsModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StageBadge from '@/components/ui/StageBadge'

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
})

export default function MapPage() {
  const { pins, loading, refetch } = useLeadPins()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin'
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updatedPin, setUpdatedPin] = useState<{ id: string; stage: PipelineStage } | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [filters, setFilters] = useState<MapFilters>({ country: '', stage: 'All', assignedTo: '' })
  const [showScripts, setShowScripts] = useState(false)
  const [boxSelectedIds, setBoxSelectedIds] = useState<string[]>([])
  const [exportName, setExportName] = useState('selected-leads')

  useEffect(() => {
    getAllUsers().then((res) => { if (res.success) setUsers(res.data) })
  }, [])

  // Reps only see their assigned leads on the map
  const visiblePins = useMemo(
    () => (isAdmin ? pins : pins.filter((p) => p.assigned_to === user?.id)),
    [pins, isAdmin, user]
  )

  const countries = useMemo(() => [...new Set(visiblePins.map((p) => p.country))].sort(), [visiblePins])

  const filteredPins = useMemo(() => {
    return visiblePins.filter((p) => {
      if (filters.country && p.country !== filters.country) return false
      if (filters.stage !== 'All' && p.stage !== filters.stage) return false
      return true
    })
  }, [visiblePins, filters])

  const boxSelectedLeads = useMemo(() => {
    return filteredPins.filter((p) => boxSelectedIds.includes(p.id))
  }, [filteredPins, boxSelectedIds])

  function handleExportCSV() {
    if (boxSelectedLeads.length === 0) return
    const header = 'Name,Country,City,Stage,Latitude,Longitude'
    const rows = boxSelectedLeads.map((l) =>
      [l.name, l.country, l.city ?? '', l.stage, l.lat ?? '', l.lng ?? '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exportName.trim() || 'selected-leads'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleStageChange(id: string, stage: PipelineStage) {
    setUpdatedPin({ id, stage })
    refetch()
  }

  return (
    <div className="relative h-full w-full">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          <MapFilterBar filters={filters} onChange={setFilters} countries={countries} users={users} />
          <MapView
            pins={filteredPins}
            onPinClick={(id) => setSelectedId(id)}
            updatedPin={updatedPin}
            onBoxSelect={(ids) => setBoxSelectedIds(ids)}
          />
        </>
      )}

      {/* Box-select results panel */}
      {boxSelectedIds.length > 0 && (
        <div
          className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col"
          style={{ top: 0, bottom: 0, borderRadius: '1rem 0 0 1rem' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-[#0F172A]">
              {boxSelectedLeads.length} lead{boxSelectedLeads.length !== 1 ? 's' : ''} in selected area
            </span>
            <button
              type="button"
              onClick={() => setBoxSelectedIds([])}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none font-medium"
              aria-label="Clear selection"
            >
              ×
            </button>
          </div>
          <div className="overflow-y-auto flex-1 py-2">
            {boxSelectedLeads.length === 0 ? (
              <p className="text-sm text-gray-400 px-4 py-3">No leads found in this area.</p>
            ) : (
              boxSelectedLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-[#EFF6FF] transition-colors border-b border-gray-50 last:border-0"
                  onClick={() => setSelectedId(lead.id)}
                >
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{lead.country}</span>
                    <StageBadge stage={lead.stage} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Export footer */}
          {boxSelectedLeads.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Export as CSV</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={exportName}
                  onChange={(e) => setExportName(e.target.value)}
                  placeholder="File name…"
                  className="flex-1 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2563EB] min-w-0"
                />
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedId && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSelectedId(null)} />
          <LeadDetailPanel
            leadId={selectedId}
            onClose={() => setSelectedId(null)}
            onStageChange={handleStageChange}
            onViewScripts={() => setShowScripts(true)}
          />
        </>
      )}

      {showScripts && <ScriptsModal onClose={() => setShowScripts(false)} />}
    </div>
  )
}
