'use client'

import dynamic from 'next/dynamic'
import { useState, useMemo, useEffect } from 'react'
import { useLeadPins } from '@/hooks/useLeads'
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
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updatedPin, setUpdatedPin] = useState<{ id: string; stage: PipelineStage } | null>(null)
  const [users, setUsers] = useState<AppUser[]>([])
  const [filters, setFilters] = useState<MapFilters>({ country: '', stage: 'All', assignedTo: '' })
  const [showScripts, setShowScripts] = useState(false)
  const [boxSelectedIds, setBoxSelectedIds] = useState<string[]>([])

  useEffect(() => {
    getAllUsers().then((res) => { if (res.success) setUsers(res.data) })
  }, [])

  const countries = useMemo(() => [...new Set(pins.map((p) => p.country))].sort(), [pins])

  const filteredPins = useMemo(() => {
    return pins.filter((p) => {
      if (filters.country && p.country !== filters.country) return false
      if (filters.stage !== 'All' && p.stage !== filters.stage) return false
      return true
    })
  }, [pins, filters])

  const boxSelectedLeads = useMemo(() => {
    return filteredPins.filter((p) => boxSelectedIds.includes(p.id))
  }, [filteredPins, boxSelectedIds])

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
            <span className="text-sm font-semibold text-[#1E3A5F]">
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
                  className="w-full text-left px-4 py-3 hover:bg-[#F0F8FF] transition-colors border-b border-gray-50 last:border-0"
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
