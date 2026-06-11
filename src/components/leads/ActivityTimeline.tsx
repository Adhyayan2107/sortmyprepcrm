import { ActivityLog, ActivityType } from '@/types/activity.types'
import { formatDate } from '@/utils/formatters'

interface ActivityTimelineProps {
  entries: ActivityLog[]
}

const TYPE_LABEL: Record<ActivityType, string> = {
  note: 'Note',
  call: 'Call',
  meeting: 'Meeting',
  stage_change: 'Stage Changed',
  email: 'Email',
}

const TYPE_COLOR: Record<ActivityType, string> = {
  note: 'bg-gray-400',
  call: 'bg-blue-400',
  meeting: 'bg-yellow-400',
  stage_change: 'bg-violet-400',
  email: 'bg-emerald-400',
}

export default function ActivityTimeline({ entries }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400 py-2">No activity yet.</p>
  }

  return (
    <ul className="space-y-3">
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${TYPE_COLOR[entry.type as ActivityType] ?? 'bg-gray-400'}`} />
            <div className="w-px flex-1 bg-gray-200 mt-1" />
          </div>
          <div className="pb-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-700">
                {TYPE_LABEL[entry.type as ActivityType] ?? entry.type}
              </span>
              <span className="text-xs text-gray-400">{formatDate(entry.created_at)}</span>
            </div>
            {entry.summary && (
              <p className="text-sm text-gray-600 mt-0.5 break-words">{entry.summary}</p>
            )}
            {entry.recording_url && (
              <a
                href={entry.recording_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[var(--color-brand-accent)] hover:underline"
              >
                View recording
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
