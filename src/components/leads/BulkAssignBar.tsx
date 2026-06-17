'use client'

import { AppUser } from '@/types/user.types'

interface BulkAssignBarProps {
  selectedCount: number
  totalCount: number
  bulkAssignTo: string
  saving: boolean
  deleting: boolean
  users: AppUser[]
  onAssignToChange: (v: string) => void
  onAssign: () => void
  onDelete: () => void
  onClear: () => void
  onSelectAll: () => void
}

export default function BulkAssignBar({
  selectedCount, totalCount, bulkAssignTo, saving, deleting, users,
  onAssignToChange, onAssign, onDelete, onClear, onSelectAll,
}: BulkAssignBarProps) {
  const allSelected = selectedCount === totalCount

  return (
    <div className="mb-3 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 flex-wrap">
      <span className="text-sm font-semibold text-blue-800">
        {selectedCount} selected
      </span>

      {!allSelected && (
        <button
          onClick={onSelectAll}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline"
        >
          Select all {totalCount}
        </button>
      )}

      <div className="h-4 w-px bg-blue-200 hidden sm:block" />

      {/* Assign */}
      <div className="flex items-center gap-2">
        <select
          value={bulkAssignTo}
          onChange={(e) => onAssignToChange(e.target.value)}
          className="border border-slate-200 rounded-lg px-2.5 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name ?? u.id.slice(0, 8)}</option>
          ))}
        </select>
        <button
          onClick={onAssign}
          disabled={saving || deleting}
          className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60 hover:bg-[#1D4ED8] transition-colors"
        >
          {saving ? 'Saving…' : 'Assign'}
        </button>
      </div>

      <div className="h-4 w-px bg-blue-200 hidden sm:block" />

      {/* Delete */}
      <button
        onClick={onDelete}
        disabled={saving || deleting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 text-sm font-semibold disabled:opacity-60 hover:bg-red-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        {deleting ? 'Deleting…' : 'Delete'}
      </button>

      <button onClick={onClear} className="ml-auto text-sm text-slate-500 hover:text-slate-700">
        ✕ Clear
      </button>
    </div>
  )
}
