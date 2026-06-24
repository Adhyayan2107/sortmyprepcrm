'use client'

import { useEffect, useState } from 'react'
import { Lead } from '@/types/lead.types'
import { PipelineStage } from '@/types/pipeline.types'
import { ActivityLog } from '@/types/activity.types'
import { AppUser } from '@/types/user.types'
import { Script } from '@/types/script.types'
import { CONTACT_TYPES } from '@/lib/constants'
import { useUser } from '@/hooks/useUser'
import { getLeadById, updateLeadStage, updateLeadAssignment, incrementLeadCount, deleteLead } from '@/services/leadService'
import { getActivityForLead, addNote, logStageChange } from '@/services/activityService'
import { getAllUsers } from '@/services/userService'
import { getScriptsByContactType, assignScriptToLead, removeScriptFromLead, getLeadAssignedScript } from '@/services/scriptService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import LeadFormModal from '@/components/leads/LeadFormModal'
import IntelBrief from '@/components/leads/IntelBrief'
import LeadInfoTab from '@/components/leads/tabs/LeadInfoTab'
import LeadScriptTab from '@/components/leads/tabs/LeadScriptTab'
import LeadActivityTab from '@/components/leads/tabs/LeadActivityTab'

type TabKey = 'info' | 'script' | 'activity' | 'intel'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'script', label: 'Script' },
  { key: 'activity', label: 'Activity' },
  { key: 'intel', label: 'Intel' },
]

interface LeadDetailPanelProps {
  leadId: string
  onClose: () => void
  onStageChange?: (id: string, stage: PipelineStage) => void
  onViewScripts?: (leadId: string) => void
  onDelete?: (id: string) => void
}

export default function LeadDetailPanel({ leadId, onClose, onStageChange, onViewScripts, onDelete }: LeadDetailPanelProps) {
  const { user: currentUser } = useUser()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [teamUsers, setTeamUsers] = useState<AppUser[]>([])
  const [allScripts, setAllScripts] = useState<Script[]>([])
  const [assignedScriptId, setAssignedScriptId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assigningSaving, setAssigningSaving] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>('info')
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getLeadById(leadId),
      getActivityForLead(leadId),
      getAllUsers(),
      getLeadAssignedScript(leadId),
      Promise.all(CONTACT_TYPES.map((t) => getScriptsByContactType(t))),
    ]).then(([leadRes, actRes, usersRes, assignedRes, scriptGroups]) => {
      if (leadRes.success) setLead(leadRes.data)
      if (actRes.success) setActivity(actRes.data)
      if (usersRes.success) setTeamUsers(usersRes.data)
      if (assignedRes.success && assignedRes.data) setAssignedScriptId(assignedRes.data.script_id)
      setAllScripts(scriptGroups.flatMap((r) => (r.success ? r.data : [])))
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

  async function handleAssignmentChange(userId: string) {
    if (!lead) return
    setSaving(true)
    const res = await updateLeadAssignment(lead.id, userId === '' ? null : userId)
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

  async function handleDelete() {
    if (!lead) return
    const confirmed = window.confirm(`Delete "${lead.name}"? This cannot be undone.`)
    if (!confirmed) return
    const res = await deleteLead(lead.id)
    if (res.success) {
      onDelete?.(lead.id)
      onClose()
    }
  }

  async function handleCountChange(
    field: 'call_count' | 'message_count' | 'email_count',
    delta: 1 | -1
  ) {
    if (!lead) return
    // Optimistic update
    setLead((prev) => prev ? { ...prev, [field]: Math.max(0, (prev[field] ?? 0) + delta) } : prev)
    const res = await incrementLeadCount(lead.id, field, delta)
    if (res.success) setLead(res.data)
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
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
        <h2 className="text-base font-semibold text-[var(--color-brand-primary)] truncate pr-4">
          {lead?.name ?? 'Lead Details'}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {lead && (
            <>
              {currentUser?.role === 'admin' && (
                <button onClick={() => setShowEditModal(true)} className="text-slate-400 hover:text-[#2563EB] transition-colors" title="Edit lead">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
              )}
              {currentUser?.role === 'admin' && (
                <button onClick={handleDelete} className="text-slate-400 hover:text-red-500 transition-colors" title="Delete lead">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              <a
                href={`/call/${lead.id}`}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                title="Start call"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                Call
              </a>
            </>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {TABS.map(({ key, label }) => (
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
          <LeadInfoTab
            lead={lead}
            teamUsers={teamUsers}
            saving={saving}
            isAdmin={currentUser?.role === 'admin'}
            lastCallNote={activity.find((a) => a.type === 'call')?.summary ?? null}
            lastCallAt={activity.find((a) => a.type === 'call')?.created_at ?? null}
            onStageChange={handleStageChange}
            onAssignmentChange={handleAssignmentChange}
            onCountChange={handleCountChange}
            onViewScripts={onViewScripts ? () => onViewScripts(lead.id) : undefined}
          />
        ) : activeTab === 'script' ? (
          <LeadScriptTab
            lead={lead}
            allScripts={allScripts}
            assignedScriptId={assignedScriptId}
            saving={assigningSaving}
            onAssign={handleAssignScript}
          />
        ) : activeTab === 'intel' ? (
          <div className="px-5 py-4">
            <IntelBrief
              lead={lead}
              onUpdate={(updates) => setLead((prev) => prev ? { ...prev, ...updates } : prev)}
            />
          </div>
        ) : (
          <LeadActivityTab
            activity={activity}
            noteText={noteText}
            addingNote={addingNote}
            onNoteChange={setNoteText}
            onAddNote={handleAddNote}
          />
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
