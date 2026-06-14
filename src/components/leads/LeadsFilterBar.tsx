'use client'

import { PipelineStage } from '@/types/pipeline.types'
import { AppUser } from '@/types/user.types'
import { PIPELINE_STAGES } from '@/lib/constants'

interface LeadsFilterBarProps {
  search: string
  stageFilter: PipelineStage | 'All'
  countryFilter: string
  assignedFilter: string
  countries: string[]
  users: AppUser[]
  onSearch: (v: string) => void
  onStage: (v: PipelineStage | 'All') => void
  onCountry: (v: string) => void
  onAssigned: (v: string) => void
}

const SELECT_CLS = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]'

export default function LeadsFilterBar({
  search, stageFilter, countryFilter, assignedFilter,
  countries, users, onSearch, onStage, onCountry, onAssigned,
}: LeadsFilterBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
      <input
        type="text"
        placeholder="Search name or country…"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        className={`${SELECT_CLS} col-span-2 sm:col-span-1`}
      />
      <select value={stageFilter} onChange={(e) => onStage(e.target.value as PipelineStage | 'All')} className={SELECT_CLS}>
        <option value="All">All Stages</option>
        {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={countryFilter} onChange={(e) => onCountry(e.target.value)} className={SELECT_CLS}>
        <option value="">All Countries</option>
        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={assignedFilter} onChange={(e) => onAssigned(e.target.value)} className={SELECT_CLS}>
        <option value="">All Reps</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>)}
      </select>
    </div>
  )
}
