'use client'

import { ActivityLog } from '@/types/activity.types'
import { AppUser } from '@/types/user.types'
import ActivityTimeline from '@/components/leads/ActivityTimeline'

interface Props {
  activity: ActivityLog[]
  users: AppUser[]
  noteText: string
  addingNote: boolean
  onNoteChange: (text: string) => void
  onAddNote: () => void
}

export default function LeadActivityTab({ activity, users, noteText, addingNote, onNoteChange, onAddNote }: Props) {
  const callCount = activity.filter((a) => a.type === 'call').length

  return (
    <div className="px-5 py-4 space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Add Note</p>
        <textarea
          value={noteText}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          placeholder="Write a note…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
        />
        <button
          onClick={onAddNote}
          disabled={!noteText.trim() || addingNote}
          className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--color-brand-primary)] transition-colors"
        >
          {addingNote ? 'Saving…' : 'Save Note'}
        </button>
      </div>
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase">Timeline</p>
          {callCount > 0 && (
            <span className="text-[11px] text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
              {callCount} call{callCount !== 1 ? 's' : ''} logged
            </span>
          )}
        </div>
        <ActivityTimeline entries={activity} users={users} />
      </div>
    </div>
  )
}
