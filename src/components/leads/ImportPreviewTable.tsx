import { LeadInsert } from '@/types/lead.types'
import { LeadType } from '@/lib/constants'

interface ImportPreviewTableProps {
  leads: LeadInsert[]
}

const TYPE_BADGE: Record<LeadType, string> = {
  'School': 'bg-violet-100 text-violet-700',
  'Tuition Center': 'bg-amber-100 text-amber-700',
  'Personal Teacher': 'bg-emerald-100 text-emerald-700',
}

export default function ImportPreviewTable({ leads }: ImportPreviewTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Type', 'Country', 'City', 'Stage', 'Curriculum', 'Source'].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {leads.slice(0, 50).map((lead, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{lead.name}</td>
              <td className="px-3 py-2">
                {lead.lead_type ? (
                  <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_BADGE[lead.lead_type]}`}>
                    {lead.lead_type}
                  </span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </td>
              <td className="px-3 py-2 text-gray-600">{lead.country}</td>
              <td className="px-3 py-2 text-gray-600">{lead.city ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{lead.stage}</td>
              <td className="px-3 py-2 text-gray-600">{lead.curriculum?.join(', ') ?? '—'}</td>
              <td className="px-3 py-2 text-gray-600">{lead.source ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {leads.length > 50 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Showing first 50 of {leads.length} rows
        </p>
      )}
    </div>
  )
}
