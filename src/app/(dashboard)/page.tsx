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
          <MapView pins={filteredPins} onPinClick={(id) => setSelectedId(id)} updatedPin={updatedPin} />
        </>
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
