'use client'

import { Lead } from '@/types/lead.types'
import { PipelineStage } from '@/lib/constants'
import { AppUser } from '@/types/user.types'
import { PIPELINE_STAGES } from '@/lib/constants'
import StageBadge from '@/components/ui/StageBadge'
import { formatDate, formatCurriculum } from '@/utils/formatters'

interface Props {
  lead: Lead
  teamUsers: AppUser[]
  saving: boolean
  isAdmin?: boolean
  lastCallNote?: string | null
  lastCallAt?: string | null
  lastCallOutcome?: string | null
  onStageChange: (stage: PipelineStage) => void
  onAssignmentChange: (userId: string) => void
  onCountChange?: (field: 'call_count' | 'message_count' | 'email_count', delta: 1 | -1) => void
  onViewScripts?: () => void
}

function formatCallbackDate(raw: string): string {
  const d = new Date(raw + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(raw: string): boolean {
  return new Date(raw + 'T00:00:00') < new Date()
}

function CallRecapCard({ lead, lastCallNote, lastCallAt, lastCallOutcome }: { lead: Lead; lastCallNote?: string | null; lastCallAt?: string | null; lastCallOutcome?: string | null }) {
  const pointers = (lead.next_action ?? '').split('\n').filter((l) => l.trim())

  const parsedOutcome = lastCallOutcome ? (() => { try { return JSON.parse(lastCallOutcome) } catch { return null } })() : null
  const effectiveCallback = lead.next_callback || parsedOutcome?.next_callback || null

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-100/70">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-xs font-bold text-blue-700">Last Call Recap</span>
        </div>
        {lastCallAt && (
          <span className="text-[11px] text-blue-500">{formatDate(lastCallAt)}</span>
        )}
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* Next call date — always visible for every lead */}
        <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
          !effectiveCallback
            ? 'bg-slate-50 border border-slate-200'
            : isOverdue(effectiveCallback)
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <svg className={`w-3.5 h-3.5 shrink-0 ${
            !effectiveCallback ? 'text-slate-400' : isOverdue(effectiveCallback) ? 'text-red-500' : 'text-amber-500'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p className={`text-[10px] font-semibold uppercase ${
              !effectiveCallback ? 'text-slate-400' : isOverdue(effectiveCallback) ? 'text-red-500' : 'text-amber-500'
            }`}>
              {!effectiveCallback ? 'Next Call' : isOverdue(effectiveCallback) ? 'Overdue Callback' : 'Next Call'}
            </p>
            <p className={`text-xs font-bold ${
              !effectiveCallback ? 'text-slate-400' : isOverdue(effectiveCallback) ? 'text-red-700' : 'text-amber-700'
            }`}>
              {effectiveCallback ? formatCallbackDate(effectiveCallback) : 'Not scheduled'}
            </p>
          </div>
        </div>

        {/* Next action pointers */}
        {pointers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1.5">To-Dos</p>
            <ol className="space-y-1">
              {pointers.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className="text-blue-400 font-bold shrink-0 mt-px">{i + 1}.</span>
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Last call notes */}
        {lastCallNote ? (
          <div>
            <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">What Happened</p>
            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line line-clamp-4">{lastCallNote}</p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">No call has been logged yet.</p>
        )}
      </div>
    </div>
  )
}

function CounterRow({
  label, icon, value, field, onCountChange,
}: {
  label: string
  icon: React.ReactNode
  value: number
  field: 'call_count' | 'message_count' | 'email_count'
  onCountChange?: (field: 'call_count' | 'message_count' | 'email_count', delta: 1 | -1) => void
}) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCountChange?.(field, -1)}
          disabled={value <= 0}
          className="w-6 h-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors text-sm font-medium"
        >
          −
        </button>
        <span className="w-7 text-center text-sm font-semibold text-slate-800">{value}</span>
        <button
          onClick={() => onCountChange?.(field, 1)}
          className="w-6 h-6 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors text-sm font-medium"
        >
          +
        </button>
      </div>
    </div>
  )
}

// Structured notes written by the importer follow the pattern "Key: Value\n..."
// This parses them into displayable founder fields + remaining free-form text.
function parseImportedNotes(notes: string | null) {
  if (!notes) return { founderRows: [], freeText: null }

  const IMPORT_KEYS: Record<string, { label: string; isLink?: boolean }> = {
    'Type':            { label: 'Type' },
    'Category':        { label: 'Category' },
    'Founder':         { label: 'Name' },
    'Founder Phone':   { label: 'Phone' },
    'Founder Email':   { label: 'Email' },
    'Founder LinkedIn':{ label: 'LinkedIn', isLink: true },
    'No. of Teachers': { label: 'No. of Teachers' },
  }

  const founderRows: Array<{ label: string; value: string; isLink: boolean }> = []
  const freeLines: string[] = []

  for (const line of notes.split('\n')) {
    let matched = false
    for (const [key, meta] of Object.entries(IMPORT_KEYS)) {
      if (line.startsWith(`${key}: `)) {
        const value = line.slice(`${key}: `.length).trim()
        if (value) founderRows.push({ label: meta.label, value, isLink: !!meta.isLink })
        matched = true
        break
      }
    }
    if (!matched && line.trim()) freeLines.push(line)
  }

  return { founderRows, freeText: freeLines.length ? freeLines.join('\n') : null }
}

export default function LeadInfoTab({ lead, teamUsers, saving, isAdmin, lastCallNote, lastCallAt, lastCallOutcome, onStageChange, onAssignmentChange, onCountChange, onViewScripts }: Props) {
  const { founderRows, freeText } = parseImportedNotes(lead.notes)

  return (
    <div className="px-5 py-4 space-y-5">
      <CallRecapCard lead={lead} lastCallNote={lastCallNote} lastCallAt={lastCallAt} lastCallOutcome={lastCallOutcome} />

      <div className="space-y-1">
        {lead.lead_type && (
          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full mb-1 ${
            lead.lead_type === 'School'
              ? 'bg-violet-100 text-violet-700'
              : lead.lead_type === 'Tuition Center'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}>
            {lead.lead_type}
          </span>
        )}
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
        {isAdmin ? (
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
        ) : (
          <p className="text-sm text-gray-700">
            {teamUsers.find((u) => u.id === lead.assigned_to)?.name ?? 'Unassigned'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Lead Type</p>
          <p className="font-medium text-gray-700">{lead.lead_type ?? '—'}</p>
        </div>
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

      {/* Outreach counters */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Outreach</p>
        <div className="space-y-1.5">
          <CounterRow
            label="Cold Calls"
            field="call_count"
            value={lead.call_count ?? 0}
            onCountChange={onCountChange}
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
          />
          <CounterRow
            label="Messages"
            field="message_count"
            value={lead.message_count ?? 0}
            onCountChange={onCountChange}
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
          <CounterRow
            label="Emails"
            field="email_count"
            value={lead.email_count ?? 0}
            onCountChange={onCountChange}
            icon={
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>
      </div>

      {founderRows.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Founder / Contact</p>
          <div className="bg-slate-50 rounded-lg px-3 py-2 space-y-1.5">
            {founderRows.map(({ label, value, isLink }) => (
              <div key={label} className="flex gap-2 text-sm">
                <span className="text-gray-400 shrink-0 w-24">{label}</span>
                {isLink ? (
                  <a href={value} target="_blank" rel="noreferrer"
                    className="text-[var(--color-brand-accent)] hover:underline break-all">
                    {value}
                  </a>
                ) : (
                  <span className="text-gray-700 break-all">{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {freeText && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
          <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-line">{freeText}</p>
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
