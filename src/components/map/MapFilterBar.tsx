'use client'

import { useEffect, useRef, useState } from 'react'
import { PIPELINE_STAGES } from '@/lib/constants'
import { PipelineStage } from '@/lib/constants'
import { STAGE_COLORS } from '@/utils/stageColors'
import { AppUser } from '@/types/user.types'

export interface MapFilters {
  country: string
  stage: PipelineStage | 'All'
  assignedTo: string
}

interface Locations {
  hasIndia: boolean
  nonIndia: string[]
  indiaCities: string[]
}

interface MapFilterBarProps {
  filters: MapFilters
  onChange: (filters: MapFilters) => void
  locations: Locations
  users: AppUser[]
}

const SELECT_CLS =
  'h-8 bg-white border border-slate-200 rounded-lg px-2.5 text-sm text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors'

function ColorDot({ stage }: { stage: PipelineStage }) {
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
      style={{ backgroundColor: STAGE_COLORS[stage] ?? '#94A3B8' }}
    />
  )
}

function StageSelect({
  value,
  onChange,
}: {
  value: PipelineStage | 'All'
  onChange: (v: PipelineStage | 'All') => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={SELECT_CLS + ' flex items-center gap-2 pr-6 cursor-pointer select-none'}
        style={{ minWidth: 140 }}
      >
        {value !== 'All' && <ColorDot stage={value} />}
        <span className="truncate">{value === 'All' ? 'All Stages' : value}</span>
        <svg
          className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 min-w-[160px]">
          <button
            type="button"
            onClick={() => { onChange('All'); setOpen(false) }}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors ${value === 'All' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-slate-200 shrink-0" />
            All Stages
            {value === 'All' && <svg className="w-3.5 h-3.5 ml-auto text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
          </button>
          {PIPELINE_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-slate-50 transition-colors ${value === s ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
            >
              <ColorDot stage={s} />
              {s}
              {value === s && <svg className="w-3.5 h-3.5 ml-auto text-[#2563EB]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MapFilterBar({ filters, onChange, locations, users }: MapFilterBarProps) {
  function set<K extends keyof MapFilters>(key: K, value: MapFilters[K]) {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl p-1.5 shadow-sm border border-slate-200">
      <select value={filters.country} onChange={(e) => set('country', e.target.value)} className={SELECT_CLS}>
        <option value="">All Locations</option>
        {locations.hasIndia && (
          <optgroup label="India">
            <option value="India">All India</option>
            {locations.indiaCities.map((c) => <option key={c} value={`India:${c}`}>{c}</option>)}
          </optgroup>
        )}
        {locations.nonIndia.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <StageSelect
        value={filters.stage}
        onChange={(v) => set('stage', v)}
      />

      <select value={filters.assignedTo} onChange={(e) => set('assignedTo', e.target.value)} className={SELECT_CLS}>
        <option value="">All Reps</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
        ))}
      </select>
    </div>
  )
}
