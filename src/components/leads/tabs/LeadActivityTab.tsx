'use client'

import { ActivityLog } from '@/types/activity.types'
import ActivityTimeline from '@/components/leads/ActivityTimeline'

interface Props {
  activity: ActivityLog[]
  noteText: string
  addingNote: boolean
  onNoteChange: (text: string) => void
  onAddNote: () => void
}

export default function LeadActivityTab({ activity, noteText, addingNote, onNoteChange, onAddNote }: Props) {
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
        <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Timeline</p>
        <ActivityTimeline entries={activity} />
      </div>
    </div>
  )
}
