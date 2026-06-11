import Link from 'next/link'
import { Script } from '@/types/script.types'
import StarRating from '@/components/ui/StarRating'

interface ScriptCardProps {
  script: Script
}

export default function ScriptCard({ script }: ScriptCardProps) {
  const snippet = script.content
    ? script.content.slice(0, 120) + (script.content.length > 120 ? '…' : '')
    : 'No content yet.'

  return (
    <Link
      href={`/scripts/${script.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-[var(--color-brand-accent)] hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug">{script.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {script.document_url && (
            <svg className="w-3.5 h-3.5 text-[#2E86AB]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Has attached document">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          )}
          <span className="text-xs text-gray-400">{script.usage_count} uses</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-1.5">
        <StarRating
          value={Math.round(script.avg_rating ?? 0)}
          readonly
          size="sm"
        />
        {script.rating_count ? (
          <span className="text-xs text-gray-400">
            {script.avg_rating?.toFixed(1)} ({script.rating_count})
          </span>
        ) : (
          <span className="text-xs text-gray-400">No ratings yet</span>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2 leading-relaxed">{snippet}</p>
    </Link>
  )
}
