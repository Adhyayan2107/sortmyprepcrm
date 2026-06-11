'use client'

import { PIPELINE_STAGES } from '@/lib/constants'
import { PipelineStage } from '@/types/pipeline.types'
import { AppUser } from '@/types/user.types'

export interface MapFilters {
  country: string
  stage: PipelineStage | 'All'
  assignedTo: string
}

interface MapFilterBarProps {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  countries: string[]
  users: AppUser[]
}

export default function MapFilterBar({ filters, onChange, countries, users }: MapFilterBarProps) {
  function set<K extends keyof MapFilters>(key: K, value: MapFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
      <select
        value={filters.country}
        onChange={(e) => set('country', e.target.value)}
        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
      >
        <option value="">All Countries</option>
        {countries.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={filters.stage}
        onChange={(e) => set('stage', e.target.value as PipelineStage | 'All')}
        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
      >
        <option value="All">All Stages</option>
        {PIPELINE_STAGES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={filters.assignedTo}
        onChange={(e) => set('assignedTo', e.target.value)}
        className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
      >
        <option value="">All Reps</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
        ))}
      </select>
    </div>
  )
}
