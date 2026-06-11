import { LeadInsert } from '@/types/lead.types'

interface ImportPreviewTableProps {
  leads: LeadInsert[]
}

export default function ImportPreviewTable({ leads }: ImportPreviewTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {['Name', 'Country', 'City', 'Stage', 'Curriculum', 'Source'].map((h) => (
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
