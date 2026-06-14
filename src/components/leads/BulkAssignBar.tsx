'use client'

import { AppUser } from '@/types/user.types'

interface BulkAssignBarProps {
  selectedCount: number
  bulkAssignTo: string
  saving: boolean
  users: AppUser[]
  onAssignToChange: (v: string) => void
  onAssign: () => void
  onClear: () => void
}

export default function BulkAssignBar({
  selectedCount, bulkAssignTo, saving, users,
  onAssignToChange, onAssign, onClear,
}: BulkAssignBarProps) {
  return (
    <div className="mb-3 flex items-center gap-3 bg-[var(--color-brand-light)] border border-[var(--color-brand-accent)] rounded-lg px-4 py-2 flex-wrap">
      <span className="text-sm font-medium text-[var(--color-brand-primary)]">
        {selectedCount} selected
      </span>
      <select
        value={bulkAssignTo}
        onChange={(e) => onAssignToChange(e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
      >
        <option value="">Unassigned</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
        ))}
      </select>
      <button
        onClick={onAssign}
        disabled={saving}
        className="px-3 py-1 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Assign'}
      </button>
      <button onClick={onClear} className="text-sm text-gray-500 hover:text-gray-700">
        Clear
      </button>
    </div>
  )
}
