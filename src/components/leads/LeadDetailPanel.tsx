'use client'

import { useEffect, useState } from 'react'
import { Lead } from '@/types/lead.types'
import { PipelineStage } from '@/types/pipeline.types'
import { PIPELINE_STAGES } from '@/lib/constants'
import { getLeadById, updateLeadStage } from '@/services/leadService'
import StageBadge from '@/components/ui/StageBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { formatDate, formatCurriculum } from '@/utils/formatters'

interface LeadDetailPanelProps {
  leadId: string
  onClose: () => void
  onStageChange?: (id: string, stage: PipelineStage) => void
}

export default function LeadDetailPanel({ leadId, onClose, onStageChange }: LeadDetailPanelProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    getLeadById(leadId).then((res) => {
      if (res.success) setLead(res.data)
      setLoading(false)
    })
  }, [leadId])

  async function handleStageChange(stage: PipelineStage) {
    if (!lead) return
    setSaving(true)
    const res = await updateLeadStage(lead.id, stage)
    if (res.success) {
      setLead(res.data)
      onStageChange?.(lead.id, stage)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-[var(--color-brand-primary)] truncate pr-4">
          {lead?.name ?? 'Lead Details'}
        </h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSpinner />
        ) : !lead ? (
          <p className="text-center text-gray-400 mt-12">Lead not found</p>
        ) : (
          <div className="px-5 py-4 space-y-5">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">
                {[lead.city, lead.country].filter(Boolean).join(', ')}
              </p>
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
                  onChange={(e) => handleStageChange(e.target.value as PipelineStage)}
                  disabled={saving}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] disabled:opacity-60"
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <StageBadge stage={lead.stage} />
              </div>
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
          </div>
        )}
      </div>
    </div>
  )
}
