'use client'

import { Lead } from '@/types/lead.types'
import { PipelineStage } from '@/types/pipeline.types'
import { AppUser } from '@/types/user.types'
import { PIPELINE_STAGES } from '@/lib/constants'
import StageBadge from '@/components/ui/StageBadge'
import { formatDate, formatCurriculum } from '@/utils/formatters'

interface Props {
  lead: Lead
  teamUsers: AppUser[]
  saving: boolean
  onStageChange: (stage: PipelineStage) => void
  onAssignmentChange: (userId: string) => void
  onViewScripts?: () => void
}

export default function LeadInfoTab({ lead, teamUsers, saving, onStageChange, onAssignmentChange, onViewScripts }: Props) {
  return (
    <div className="px-5 py-4 space-y-5">
      <div className="space-y-1">
        <p className="text-sm text-gray-500">{[lead.city, lead.country].filter(Boolean).join(', ')}</p>
        {lead.website && (
          <a href={lead.website} target="_blank" rel="noreferrer"
            className="text-sm text-[var(--color-brand-accent)] hover:underline break-all">
            {lead.website}
          </a>
        )}
        {lead.phone && <p className="text-sm text-gray-600">{lead.phone}</p>}
        {lead.email && <p className="text-sm text-gray-600">{lead.email}</p>}
      </div>

      <div className="flex flex-wrap gap-1">
        {(lead.curriculum ?? []).map((c) => (
          <span key={c} className="inline-block bg-[var(--color-brand-light)] text-[var(--color-brand-primary)] text-xs px-2 py-0.5 rounded-full font-medium">
            {c}
          </span>
        ))}
        {(!lead.curriculum || lead.curriculum.length === 0) && (
          <span className="text-xs text-gray-400">No curriculum listed</span>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Pipeline Stage</p>
        <div className="flex items-center gap-2">
          <select
            value={lead.stage}
            onChange={(e) => onStageChange(e.target.value as PipelineStage)}
            disabled={saving}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] disabled:opacity-60"
          >
            {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <StageBadge stage={lead.stage} />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assigned To</p>
        <select
          value={lead.assigned_to ?? ''}
          onChange={(e) => onAssignmentChange(e.target.value)}
          disabled={saving}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] disabled:opacity-60"
        >
          <option value="">Unassigned</option>
          {teamUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Source</p>
          <p className="font-medium text-gray-700">{lead.source ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Curriculum</p>
          <p className="font-medium text-gray-700">{formatCurriculum(lead.curriculum)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Added</p>
          <p className="font-medium text-gray-700">{formatDate(lead.created_at)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Last Activity</p>
          <p className="font-medium text-gray-700">{formatDate(lead.last_activity)}</p>
        </div>
      </div>

      {lead.notes && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{lead.notes}</p>
        </div>
      )}

      {onViewScripts && (
        <button
          onClick={onViewScripts}
          className="w-full border border-[var(--color-brand-accent)] text-[var(--color-brand-accent)] rounded-lg py-2 text-sm font-medium hover:bg-[var(--color-brand-light)] transition-colors"
        >
          View Call Scripts
        </button>
      )}
    </div>
  )
}
