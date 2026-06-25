'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Lead } from '@/types/lead.types'
import { Script } from '@/types/script.types'
import { PipelineStage } from '@/lib/constants'
import { PIPELINE_STAGES, CONTACT_TYPES } from '@/lib/constants'
import { useUser } from '@/hooks/useUser'
import { getLeadById, getAllLeadRows, saveCallOutcome, incrementLeadCount } from '@/services/leadService'
import { getLeadAssignedScript, getScriptsByContactType, assignScriptToLead } from '@/services/scriptService'
import { logCall, logStageChange } from '@/services/activityService'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import StageBadge from '@/components/ui/StageBadge'

const TYPE_BADGE: Record<string, string> = {
  School: 'bg-violet-100 text-violet-700',
  'Tuition Center': 'bg-amber-100 text-amber-700',
  'Private Teacher': 'bg-emerald-100 text-emerald-700',
  'Personal Teacher': 'bg-emerald-100 text-emerald-700',
  Aggregators: 'bg-cyan-100 text-cyan-700',
}


function parsePointers(raw: string | null): string[] {
  if (!raw) return ['']
  const lines = raw.split('\n').filter((l) => l.trim())
  return lines.length > 0 ? lines : ['']
}

function ScriptPickerModal({
  scripts,
  onSelect,
  onClose,
}: {
  scripts: Script[]
  onSelect: (s: Script) => void
  onClose?: () => void
}) {
  const grouped = scripts.reduce<Record<string, Script[]>>((acc, s) => {
    if (!acc[s.contact_type]) acc[s.contact_type] = []
    acc[s.contact_type].push(s)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">Choose a Call Script</h2>
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {Object.keys(grouped).length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No scripts available yet.</p>
          )}
          {Object.entries(grouped).map(([type, group]) => (
            <div key={type}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">{type}</p>
              <div className="space-y-1">
                {group.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => onSelect(s)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50 transition-colors group"
                  >
                    <p className="text-sm font-medium text-slate-800 group-hover:text-[#2563EB]">{s.title}</p>
                    {s.content && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{s.content.slice(0, 80)}…</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CallPage() {
  const { leadId } = useParams<{ leadId: string }>()
  const router = useRouter()
  const { user } = useUser()

  const [lead, setLead] = useState<Lead | null>(null)
  const [script, setScript] = useState<Script | null>(null)
  const [allScripts, setAllScripts] = useState<Script[]>([])
  const [showScriptPicker, setShowScriptPicker] = useState(false)
  const [loading, setLoading] = useState(true)

  // Queue of assigned lead IDs for navigation
  const [queue, setQueue] = useState<string[]>([])
  const [queueIdx, setQueueIdx] = useState(0)

  // Right panel state
  const [callNotes, setCallNotes] = useState('')
  const [pointers, setPointers] = useState<string[]>([''])
  const [nextCallback, setNextCallback] = useState('')
  const [newStage, setNewStage] = useState<PipelineStage | ''>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Script tab
  const [scriptTab, setScriptTab] = useState<'script' | 'notes'>('script')

  // Load all scripts once (for picker + auto-default)
  useEffect(() => {
    Promise.all(CONTACT_TYPES.map((t) => getScriptsByContactType(t))).then((results) => {
      setAllScripts(results.flatMap((r) => (r.success ? r.data : [])))
    })
  }, [])

  const loadLead = useCallback(async (id: string) => {
    setLoading(true)
    setSaved(false)
    setCallNotes('')
    // Reset picker and script state so prev/next never carries over stale state
    setScript(null)
    setShowScriptPicker(false)

    const [leadRes, assignedRes] = await Promise.all([
      getLeadById(id),
      getLeadAssignedScript(id),
    ])

    if (leadRes.success) {
      const l = leadRes.data
      setLead(l)
      setPointers(parsePointers(l.next_action))
      setNextCallback(l.next_callback ?? '')
      setNewStage(l.stage)
    }

    if (assignedRes.success && assignedRes.data) {
      setScript(assignedRes.data.script)
    } else {
      setScript(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (!leadId) return
    loadLead(leadId)
  }, [leadId, loadLead])

  // Build the navigation queue from all visible leads (RLS scopes this per role)
  useEffect(() => {
    getAllLeadRows().then((res) => {
      if (!res.success) return
      const ids = res.data.map((r) => r.id)
      const currentIdx = ids.indexOf(leadId)
      setQueue(ids)
      setQueueIdx(currentIdx >= 0 ? currentIdx : 0)
    })
  }, [leadId])

  async function handleSelectScript(s: Script) {
    setScript(s)
    setShowScriptPicker(false)
    if (leadId) {
      await assignScriptToLead(s.id, leadId, user?.id)
    }
  }

  function updatePointer(i: number, val: string) {
    setPointers((prev) => prev.map((p, j) => (j === i ? val : p)))
  }

  function removePointer(i: number) {
    setPointers((prev) => prev.filter((_, j) => j !== i))
  }

  function addPointer() {
    setPointers((prev) => [...prev, ''])
  }

  async function handleSave() {
    if (!lead || !user) return
    setSaving(true)

    const nextAction = pointers.filter((p) => p.trim()).join('\n') || null

    const updates: { next_callback?: string | null; next_action?: string | null; stage?: string } = {
      next_action: nextAction,
      next_callback: nextCallback || null,
    }

    if (newStage && newStage !== lead.stage) {
      updates.stage = newStage
      await logStageChange(lead.id, lead.stage, newStage as PipelineStage, user.id)
    }

    await saveCallOutcome(lead.id, updates)

    // Generate a default note when the rep didn't write anything
    const callbackFormatted = nextCallback
      ? new Date(nextCallback + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : null
    const effectiveNotes = callNotes.trim()
      || (callbackFormatted ? `Call done. Next call on ${callbackFormatted}.` : 'Call done.')

    await logCall(lead.id, effectiveNotes, user.id, nextAction, nextCallback || null)
    await incrementLeadCount(lead.id, 'call_count', 1)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)

    if (newStage && newStage !== lead.stage) {
      setLead((prev) => prev ? { ...prev, stage: newStage as PipelineStage } : prev)
    }

    // Invalidate Next.js router cache so leads page shows updated stage on next visit
    router.refresh()
  }

  function goNext() {
    const nextIdx = queueIdx + 1
    if (nextIdx < queue.length) {
      router.push(`/call/${queue[nextIdx]}`)
    }
  }

  function goPrev() {
    const prevIdx = queueIdx - 1
    if (prevIdx >= 0) {
      router.push(`/call/${queue[prevIdx]}`)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <LoadingSpinner />
    </div>
  )

  if (!lead) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-400">Lead not found.</p>
    </div>
  )

  return (
    <>
      {showScriptPicker && (
        <ScriptPickerModal
          scripts={allScripts}
          onSelect={handleSelectScript}
          onClose={() => setShowScriptPicker(false)}
        />
      )}

      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900">{lead.name}</h1>
              <p className="text-xs text-slate-400">{[lead.city, lead.country].filter(Boolean).join(', ')}</p>
            </div>
            {lead.lead_type && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_BADGE[lead.lead_type]}`}>
                {lead.lead_type}
              </span>
            )}
            <StageBadge stage={lead.stage} />
          </div>

          {/* Queue navigation */}
          <div className="flex items-center gap-2">
            {queue.length > 1 && (
              <span className="text-xs text-slate-400">
                {queueIdx + 1} / {queue.length}
              </span>
            )}
            <button
              onClick={goPrev}
              disabled={queueIdx === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={goNext}
              disabled={queueIdx >= queue.length - 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Main 3-column layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Lead Details */}
          <div className="w-64 shrink-0 bg-white border-r border-slate-200 overflow-y-auto p-4 space-y-4">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Contact</p>
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-emerald-600 transition-colors">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mt-1 transition-colors break-all">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {lead.email}
                </a>
              )}
              {lead.website && (
                <a href={lead.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:underline mt-1 break-all">
                  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Website
                </a>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Outreach</p>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Calls</span><span className="font-semibold">{lead.call_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Messages</span><span className="font-semibold">{lead.message_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Emails</span><span className="font-semibold">{lead.email_count}</span>
                </div>
              </div>
            </div>

            {lead.curriculum && lead.curriculum.length > 0 && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Curriculum</p>
                <div className="flex flex-wrap gap-1">
                  {lead.curriculum.map((c) => (
                    <span key={c} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                  ))}
                </div>
              </div>
            )}

            {lead.notes && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Notes</p>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">{lead.notes}</p>
              </div>
            )}

            {lead.next_callback && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Next Callback</p>
                <p className="text-xs font-semibold text-amber-600">{lead.next_callback}</p>
              </div>
            )}
          </div>

          {/* CENTER — Script + Call Notes */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Tabs + Change Script */}
            <div className="flex items-center border-b border-slate-200 bg-white shrink-0 px-2">
              <div className="flex flex-1">
                {(['script', 'notes'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setScriptTab(t)}
                    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      scriptTab === t
                        ? 'border-[#2563EB] text-[#2563EB]'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {t === 'script' ? 'Call Script' : 'Call Notes'}
                  </button>
                ))}
              </div>
              {scriptTab === 'script' && (
                <button
                  onClick={() => setShowScriptPicker(true)}
                  className="text-xs font-medium text-slate-500 hover:text-[#2563EB] border border-slate-200 hover:border-[#2563EB] rounded-lg px-3 py-1.5 transition-colors shrink-0 mr-2"
                >
                  {script ? 'Change Script' : 'Pick Script'}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {scriptTab === 'script' ? (
                script ? (
                  <div className="max-w-2xl mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-slate-800">{script.title}</h2>
                      <span className="text-xs text-slate-400">{script.contact_type}</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-[15px] text-slate-700 leading-relaxed bg-white rounded-xl border border-slate-200 px-6 py-5 shadow-sm">
                      {script.content ?? 'No content on this script yet.'}
                    </pre>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-slate-400 text-sm">
                      No script assigned —{' '}
                      <button onClick={() => setShowScriptPicker(true)} className="text-[#2563EB] hover:underline font-medium">
                        assign one
                      </button>
                    </p>
                  </div>
                )
              ) : (
                <div className="max-w-2xl mx-auto">
                  <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Call Notes</p>
                  <textarea
                    rows={14}
                    placeholder="What happened on this call? Key points, objections, follow-ups…"
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none bg-white shadow-sm"
                  />
                  <p className="text-xs text-slate-400 mt-2">Saving will log this as a call in the activity timeline and increment the call counter.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — What to do next */}
          <div className="w-72 shrink-0 bg-white border-l border-slate-200 overflow-y-auto p-4 space-y-4">
            <p className="text-xs font-semibold text-slate-400 uppercase">What to do next</p>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Next Action Pointers</label>
              <div className="space-y-2">
                {pointers.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold w-5 shrink-0 text-right">{i + 1}.</span>
                    <input
                      value={p}
                      onChange={(e) => updatePointer(i, e.target.value)}
                      placeholder={`Action ${i + 1}…`}
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] min-w-0"
                    />
                    {pointers.length > 1 && (
                      <button
                        onClick={() => removePointer(i)}
                        className="text-slate-300 hover:text-red-400 transition-colors shrink-0 text-base leading-none"
                        title="Remove"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addPointer}
                  className="text-xs text-[#2563EB] hover:underline mt-1 ml-7"
                >
                  + Add pointer
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Next Callback Date</label>
              <input
                type="date"
                value={nextCallback}
                onChange={(e) => setNextCallback(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Update Stage</label>
              <select
                value={newStage}
                onChange={(e) => setNewStage(e.target.value as PipelineStage)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors"
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save & Log Call'}
            </button>

            {queue.length > 1 && (
              <button
                onClick={goNext}
                disabled={queueIdx >= queue.length - 1}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next Lead →
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
