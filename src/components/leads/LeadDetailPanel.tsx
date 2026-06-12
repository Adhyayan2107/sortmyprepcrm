'use client'

import { useEffect, useState } from 'react'
import { Lead } from '@/types/lead.types'
import { PipelineStage } from '@/types/pipeline.types'
import { ActivityLog } from '@/types/activity.types'
import { AppUser } from '@/types/user.types'
import { getLeadById, updateLeadStage, updateLeadAssignment } from '@/services/leadService'
import { getActivityForLead, addNote, logStageChange } from '@/services/activityService'
import { getAllUsers } from '@/services/userService'
import { getScriptsByContactType, assignScriptToLead, removeScriptFromLead, getLeadAssignedScript } from '@/services/scriptService'
import { Script } from '@/types/script.types'
import { CONTACT_TYPES, PIPELINE_STAGES } from '@/lib/constants'
import { useUser } from '@/hooks/useUser'
import StageBadge from '@/components/ui/StageBadge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ActivityTimeline from '@/components/leads/ActivityTimeline'
import IntelBrief from '@/components/leads/IntelBrief'
import LeadFormModal from '@/components/leads/LeadFormModal'
import { formatDate, formatCurriculum } from '@/utils/formatters'

const STAGE_POINTS: Record<string, number> = Object.fromEntries(
  PIPELINE_STAGES.map((s, i) => [s, s === 'Blocked/Dead' ? 0 : i + 1])
)

interface LeadDetailPanelProps {
  leadId: string
  onClose: () => void
  onStageChange?: (id: string, stage: PipelineStage) => void
  onViewScripts?: (leadId: string) => void
}

export default function LeadDetailPanel({
  leadId,
  onClose,
  onStageChange,
  onViewScripts,
}: LeadDetailPanelProps) {
  const { user: currentUser } = useUser()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'intel' | 'script'>('info')
  const [showEditModal, setShowEditModal] = useState(false)
  const [allScripts, setAllScripts] = useState<Script[]>([])
  const [assignedScriptId, setAssignedScriptId] = useState<string>('')
  const [assigningSaving, setAssigningSaving] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getLeadById(leadId),
      getActivityForLead(leadId),
      getAllUsers(),
      getLeadAssignedScript(leadId),
      // Fetch all scripts for the assignment dropdown
      Promise.all(CONTACT_TYPES.map((t) => getScriptsByContactType(t))),
    ]).then(([leadRes, actRes, usersRes, assignedRes, scriptGroups]) => {
      if (leadRes.success) setLead(leadRes.data)
      if (actRes.success) setActivity(actRes.data)
      if (usersRes.success) setTeamUsers(usersRes.data)
      if (assignedRes.success && assignedRes.data) setAssignedScriptId(assignedRes.data.script_id)
      const allS = scriptGroups.flatMap((r) => (r.success ? r.data : []))
      setAllScripts(allS)
      setLoading(false)
    })
  }, [leadId])

  async function handleStageChange(stage: PipelineStage) {
    if (!lead || !currentUser) return
    setSaving(true)
    const prevStage = lead.stage
    const res = await updateLeadStage(lead.id, stage)
    if (res.success) {
      setLead(res.data)
      await logStageChange(lead.id, prevStage, stage, currentUser.id)
      const actRes = await getActivityForLead(lead.id)
      if (actRes.success) setActivity(actRes.data)
      onStageChange?.(lead.id, stage)
    }
    setSaving(false)
  }

  async function handleAssignmentChange(assignedTo: string) {
    if (!lead) return
    setSaving(true)
    const val = assignedTo === '' ? null : assignedTo
    const res = await updateLeadAssignment(lead.id, val)
    if (res.success) setLead(res.data)
    setSaving(false)
  }

  async function handleAssignScript(scriptId: string) {
    if (!lead || !currentUser) return
    setAssigningSaving(true)
    if (scriptId === '') {
      await removeScriptFromLead(lead.id)
      setAssignedScriptId('')
    } else {
      const res = await assignScriptToLead(scriptId, lead.id, currentUser.id)
      if (res.success) setAssignedScriptId(scriptId)
    }
    setAssigningSaving(false)
  }

  async function handleAddNote() {
    if (!noteText.trim() || !lead || !currentUser) return
    setAddingNote(true)
    const res = await addNote(lead.id, noteText.trim(), currentUser.id)
    if (res.success) {
      setActivity((prev) => [res.data, ...prev])
      setNoteText('')
    }
    setAddingNote(false)
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-[var(--color-brand-primary)] truncate pr-4">
          {lead?.name ?? 'Lead Details'}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {lead && (
            <button
              onClick={() => setShowEditModal(true)}
              className="text-slate-400 hover:text-[#2E86AB] transition-colors"
              title="Edit lead"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {([
          { key: 'info', label: 'Info' },
          { key: 'script', label: 'Script' },
          { key: 'activity', label: 'Activity' },
          { key: 'intel', label: 'Intel' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-b-2 border-[var(--color-brand-accent)] text-[var(--color-brand-accent)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LoadingSpinner />
        ) : !lead ? (
          <p className="text-center text-gray-400 mt-12">Lead not found</p>
        ) : activeTab === 'info' ? (
          <div className="px-5 py-4 space-y-5">
            {/* Contact */}
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

            {/* Curriculum tags */}
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

            {/* Stage */}
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

            {/* Assign to */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assigned To</p>
              <select
                value={lead.assigned_to ?? ''}
                onChange={(e) => handleAssignmentChange(e.target.value)}
                disabled={saving}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] disabled:opacity-60"
              >
                <option value="">Unassigned</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
                ))}
              </select>
            </div>

            {/* Meta */}
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
                onClick={() => onViewScripts(lead.id)}
                className="w-full border border-[var(--color-brand-accent)] text-[var(--color-brand-accent)] rounded-lg py-2 text-sm font-medium hover:bg-[var(--color-brand-light)] transition-colors"
              >
                View Call Scripts
              </button>
            )}
          </div>
        ) : activeTab === 'script' ? (
          <div className="px-5 py-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assigned Script</p>
              <p className="text-xs text-gray-400 mb-3">
                Select the script being used for this lead. Points are tracked as the lead advances through stages.
              </p>
              <select
                value={assignedScriptId}
                onChange={(e) => handleAssignScript(e.target.value)}
                disabled={assigningSaving}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E86AB] disabled:opacity-60"
              >
                <option value="">— No script assigned —</option>
                {CONTACT_TYPES.map((type) => {
                  const group = allScripts.filter((s) => s.contact_type === type)
                  if (group.length === 0) return null
                  return (
                    <optgroup key={type} label={type}>
                      {group.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </div>
            {lead && assignedScriptId && (
              <div className="bg-[#F0F8FF] rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-[#1E3A5F] uppercase">Points Earned</p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold text-[#2E86AB]">
                    {STAGE_POINTS[lead.stage] ?? 0}
                  </span>
                  <span className="text-sm text-gray-400 mb-1">/ 7 pts · {lead.stage}</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-[#2E86AB]/20">
                  <div
                    className="h-full bg-[#2E86AB] rounded-full transition-all"
                    style={{ width: `${((STAGE_POINTS[lead.stage] ?? 0) / 7) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  Reaches 7 pts when stage is Confirmed
                </p>
              </div>
            )}
          </div>
        ) : activeTab === 'intel' ? (
          <div className="px-5 py-4">
            <IntelBrief
              lead={lead}
              onUpdate={(updates) => setLead((prev) => prev ? { ...prev, ...updates } : prev)}
            />
          </div>
        ) : (
          /* Activity tab */
          <div className="px-5 py-4 space-y-4">
            {/* Add note */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Note</p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Write a note…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
              />
              <button
                onClick={handleAddNote}
                disabled={!noteText.trim() || addingNote}
                className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--color-brand-primary)] transition-colors"
              >
                {addingNote ? 'Saving…' : 'Save Note'}
              </button>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Timeline</p>
              <ActivityTimeline entries={activity} />
            </div>
          </div>
        )}
      </div>

      {showEditModal && lead && (
        <LeadFormModal
          mode="edit"
          initial={lead}
          onSave={(updated) => { setLead(updated); setShowEditModal(false) }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}
