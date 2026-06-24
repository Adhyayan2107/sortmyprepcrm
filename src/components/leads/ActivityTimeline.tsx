import { ActivityLog, ActivityType } from '@/types/activity.types'
import { AppUser } from '@/types/user.types'
import { formatDate } from '@/utils/formatters'

interface ActivityTimelineProps {
  entries: ActivityLog[]
  users?: AppUser[]
}

const TYPE_COLOR: Record<ActivityType, string> = {
  note: 'bg-gray-400',
  call: 'bg-blue-500',
  meeting: 'bg-yellow-400',
  stage_change: 'bg-violet-400',
  email: 'bg-emerald-400',
}

function resolveUser(id: string | null, users: AppUser[]): string {
  if (!id) return 'Unknown'
  return users.find((u) => u.id === id)?.name ?? id.slice(0, 8)
}

interface ParsedCallOutcome {
  next_actions: string | null
  next_callback: string | null
}

function parseOutcome(outcome: string | null): ParsedCallOutcome | null {
  if (!outcome) return null
  try {
    return JSON.parse(outcome) as ParsedCallOutcome
  } catch {
    return null
  }
}

function formatCallbackDate(raw: string): string {
  const d = new Date(raw + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function CallEntry({ entry, users }: { entry: ActivityLog; users: AppUser[] }) {
  const outcome = parseOutcome(entry.outcome)
  const pointers = (outcome?.next_actions ?? '').split('\n').filter((l) => l.trim())

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 bg-blue-100/70">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          <span className="text-xs font-bold text-blue-700">Call</span>
          <span className="text-xs text-blue-500">by {resolveUser(entry.done_by, users)}</span>
        </div>
        <span className="text-[11px] text-blue-500 shrink-0">{formatDate(entry.created_at)}</span>
      </div>

      <div className="px-3 py-2.5 space-y-2.5">
        {/* Notes */}
        {entry.summary && (
          <div>
            <p className="text-[10px] font-semibold text-blue-600 uppercase mb-0.5">Notes</p>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{entry.summary}</p>
          </div>
        )}
        {!entry.summary && (
          <p className="text-xs text-slate-400 italic">No call notes recorded.</p>
        )}

        {/* Next actions */}
        {pointers.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">To-Dos After This Call</p>
            <ol className="space-y-0.5">
              {pointers.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <span className="text-blue-400 font-bold shrink-0">{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Callback date */}
        {outcome?.next_callback && (
          <div className="flex items-center gap-1.5 pt-0.5">
            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs font-semibold text-amber-600">
              Next callback: {formatCallbackDate(outcome.next_callback)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivityTimeline({ entries, users = [] }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-2">No activity yet.</p>
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => {
        if (entry.type === 'call') {
          return (
            <li key={entry.id}>
              <CallEntry entry={entry} users={users} />
            </li>
          )
        }

        // Default row for notes, stage_change, email, meeting
        return (
          <li key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_COLOR[entry.type as ActivityType] ?? 'bg-gray-400'}`} />
              <div className="w-px flex-1 bg-gray-200 mt-1" />
            </div>
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-700 capitalize">{entry.type.replace('_', ' ')}</span>
                {entry.done_by && (
                  <span className="text-xs text-gray-400">by {resolveUser(entry.done_by, users)}</span>
                )}
                <span className="text-xs text-gray-400">{formatDate(entry.created_at)}</span>
              </div>
              {entry.summary && (
                <p className="text-sm text-gray-600 mt-0.5 break-words">{entry.summary}</p>
              )}
              {entry.from_stage && entry.to_stage && (
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="line-through">{entry.from_stage}</span>
                  {' → '}
                  <span className="font-medium text-violet-700">{entry.to_stage}</span>
                </p>
              )}
              {entry.recording_url && (
                <a href={entry.recording_url} target="_blank" rel="noreferrer"
                  className="text-xs text-[var(--color-brand-accent)] hover:underline">
                  View recording
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
