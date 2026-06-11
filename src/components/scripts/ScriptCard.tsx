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
        <span className="text-xs text-gray-400 shrink-0">{script.usage_count} uses</span>
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
