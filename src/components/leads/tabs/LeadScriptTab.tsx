'use client'

import { Lead } from '@/types/lead.types'
import { Script } from '@/types/script.types'
import { CONTACT_TYPES, STAGE_POINTS } from '@/lib/constants'

interface Props {
  lead: Lead
  allScripts: Script[]
  assignedScriptId: string
  saving: boolean
  onAssign: (scriptId: string) => void
}

export default function LeadScriptTab({ lead, allScripts, assignedScriptId, saving, onAssign }: Props) {
  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Assigned Script</p>
        <p className="text-xs text-gray-400 mb-3">
          Select the script being used for this lead. Points are tracked as the lead advances through stages.
        </p>
        <select
          value={assignedScriptId}
          onChange={(e) => onAssign(e.target.value)}
          disabled={saving}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB] disabled:opacity-60"
        >
          <option value="">— No script assigned —</option>
          {CONTACT_TYPES.map((type) => {
            const group = allScripts.filter((s) => s.contact_type === type)
            if (group.length === 0) return null
            return (
              <optgroup key={type} label={type}>
                {group.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>

      {assignedScriptId && (
        <div className="bg-[#EFF6FF] rounded-xl p-4 space-y-2">
          <p className="text-xs font-semibold text-[#0F172A] uppercase">Points Earned</p>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[#2563EB]">{STAGE_POINTS[lead.stage] ?? 0}</span>
            <span className="text-sm text-gray-400 mb-1">/ 7 pts · {lead.stage}</span>
          </div>
          <div className="h-2 bg-white rounded-full overflow-hidden border border-[#2563EB]/20">
            <div
              className="h-full bg-[#2563EB] rounded-full transition-all"
              style={{ width: `${((STAGE_POINTS[lead.stage] ?? 0) / 7) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400">Reaches 7 pts when stage is Confirmed</p>
        </div>
      )}
    </div>
  )
}
