'use client'

import { LeadListRow } from '@/types/lead.types'
import { AppUser } from '@/types/user.types'
import StageBadge from '@/components/ui/StageBadge'
import { formatDate } from '@/utils/formatters'

function LeadTypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-slate-400 text-xs">—</span>
  const display = type === 'Personal Teacher' ? 'Private Teacher' : type
  const cls =
    type === 'School'
      ? 'bg-violet-100 text-violet-700'
      : type === 'Tuition Center'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-emerald-100 text-emerald-700'
  return <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{display}</span>
}

interface LeadsTableProps {
  rows: LeadListRow[]
  selected: Set<string>
  users: AppUser[]
  isAdmin?: boolean
  sortKey?: string | null
  sortDir?: 'asc' | 'desc'
  onSort?: (key: string) => void
  onSelect: (id: string) => void
  onSelectAll: () => void
  onRowClick: (id: string) => void
  onEdit: (row: LeadListRow) => void
}

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H7v-3.414a2 2 0 01.586-1.414z" />
  </svg>
)

const ChevronIcon = () => (
  <svg className="w-4 h-4 text-slate-300 group-hover/row:text-slate-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
)

const HEADERS = ['Name', 'Type', 'Country', 'Stage', 'Assigned', 'Added']

export default function LeadsTable({ rows, selected, users, isAdmin, sortKey, sortDir, onSort, onSelect, onSelectAll, onRowClick, onEdit }: LeadsTableProps) {
  const allSelected = selected.size === rows.length && rows.length > 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {isAdmin && (
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={onSelectAll} className="rounded" />
                </th>
              )}
              {HEADERS.map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <button
                    onClick={() => onSort?.(h)}
                    className="flex items-center gap-1 hover:text-slate-800 transition-colors group"
                  >
                    {h}
                    <span className={`transition-colors ${sortKey === h ? 'text-[#2563EB]' : 'text-slate-300 group-hover:text-slate-400'}`}>
                      {sortKey === h ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                    </span>
                  </button>
                </th>
              ))}
              {isAdmin && <th className="px-4 py-3 w-10" />}
              <th className="px-2 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const assignedUser = users.find((u) => u.id === row.assigned_to)
              const isSelected = selected.has(row.id)
              const click = () => onRowClick(row.id)
              return (
                <tr
                  key={row.id}
                  className={`group/row hover:bg-[var(--color-brand-light)] transition-colors cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                >
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => onSelect(row.id)} className="rounded" />
                    </td>
                  )}
                  <td className="px-4 py-3 font-medium text-slate-900" onClick={click}>{row.name}</td>
                  <td className="px-4 py-3" onClick={click}><LeadTypeBadge type={row.lead_type} /></td>
                  <td className="px-4 py-3 text-slate-600" onClick={click}>{row.country}</td>
                  <td className="px-4 py-3" onClick={click}><StageBadge stage={row.stage} /></td>
                  <td className="px-4 py-3 text-slate-500" onClick={click}>{assignedUser?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500" onClick={click}>{formatDate(row.created_at)}</td>
                  {isAdmin && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => onEdit(row)} className="text-slate-400 hover:text-[#2563EB] transition-colors" title="Edit lead">
                        <EditIcon />
                      </button>
                    </td>
                  )}
                  <td className="px-2 py-3" onClick={click}>
                    <ChevronIcon />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
