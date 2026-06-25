'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CONTACT_TYPES } from '@/lib/constants'
import { ContactType, Script } from '@/types/script.types'
import { getScriptsByContactType, incrementUsageCount } from '@/services/scriptService'
import StarRating from '@/components/ui/StarRating'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface ScriptsModalProps {
  onClose: () => void
}

export default function ScriptsModal({ onClose }: ScriptsModalProps) {
  const [activeTab, setActiveTab] = useState<ContactType>(CONTACT_TYPES[1]) // default: Coaching Center
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    setLoading(true)
    getScriptsByContactType(activeTab).then((res) => {
      if (res.success) setScripts(res.data)
      setLoading(false)
    })
  }, [activeTab])

  async function handleOpen(scriptId: string) {
    await incrementUsageCount(scriptId)
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-[var(--color-brand-primary)]">Call Scripts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {CONTACT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
                activeTab === type
                  ? 'border-b-2 border-[var(--color-brand-accent)] text-[var(--color-brand-accent)]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {type}s
            </button>
          ))}
        </div>

        {/* Scripts list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <LoadingSpinner />
          ) : scripts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No scripts for {activeTab}s yet.</p>
          ) : (
            scripts.map((script) => (
              <Link
                key={script.id}
                href={`/scripts/${script.id}`}
                onClick={() => handleOpen(script.id)}
                className="block border border-gray-200 rounded-lg p-3 hover:border-[var(--color-brand-accent)] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{script.title}</p>
                  <span className="text-xs text-gray-400 shrink-0">{script.usage_count} uses</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <StarRating value={Math.round(script.avg_rating ?? 0)} readonly size="sm" />
                  <span className="text-xs text-gray-400">
                    {script.avg_rating?.toFixed(1) ?? '—'}
                  </span>
                </div>
                {script.content && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{script.content.slice(0, 100)}</p>
                )}
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
