'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { useLeadPins } from '@/hooks/useLeads'
import { PipelineStage } from '@/types/pipeline.types'
import LeadDetailPanel from '@/components/leads/LeadDetailPanel'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
})

export default function MapPage() {
  const { pins, loading, refetch } = useLeadPins()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [updatedPin, setUpdatedPin] = useState<{ id: string; stage: PipelineStage } | null>(null)

  function handleStageChange(id: string, stage: PipelineStage) {
    setUpdatedPin({ id, stage })
    refetch()
  }

  return (
    <div className="relative h-full w-full">
      {loading ? (
        <LoadingSpinner />
      ) : (
        <MapView
          pins={pins}
          onPinClick={(id) => setSelectedId(id)}
          updatedPin={updatedPin}
        />
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
            onStageChange={handleStageChange}
          />
        </>
      )}
    </div>
  )
}
