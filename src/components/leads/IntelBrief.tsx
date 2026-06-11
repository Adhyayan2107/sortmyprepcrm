'use client'

import { useState } from 'react'
import { Lead } from '@/types/lead.types'
import { saveIntelAnnotation } from '@/services/leadService'
import { formatDate } from '@/utils/formatters'

interface IntelBriefProps {
  lead: Lead
  onUpdate: (updates: Partial<Lead>) => void
}

export default function IntelBrief({ lead, onUpdate }: IntelBriefProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [annotation, setAnnotation] = useState(lead.intel_annotation ?? '')
  const [savingAnnotation, setSavingAnnotation] = useState(false)
  const [briefOpen, setBriefOpen] = useState(!!lead.intel_brief)

  async function handleGetIntel() {
    if (!lead.website) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, website: lead.website, name: lead.name }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error ?? 'Failed to generate brief'); return }
      onUpdate({ intel_brief: json.data.intel_brief, intel_fetched_at: json.data.intel_fetched_at })
      setBriefOpen(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveAnnotation() {
    setSavingAnnotation(true)
    const res = await saveIntelAnnotation(lead.id, annotation)
    if (res.success) onUpdate({ intel_annotation: annotation })
    setSavingAnnotation(false)
  }

  return (
    <div className="space-y-4">
      {/* Get Intel button */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase">Company Intel</p>
        <button
          onClick={handleGetIntel}
          disabled={loading || !lead.website}
          title={!lead.website ? 'No website on file' : undefined}
          className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-accent)] text-white text-xs font-medium disabled:opacity-50 hover:bg-[var(--color-brand-primary)] transition-colors"
        >
          {loading ? 'Fetching…' : lead.intel_brief ? 'Refresh Intel' : 'Get Intel'}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {lead.intel_brief && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setBriefOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-left"
          >
            <span className="text-xs font-medium text-gray-600">
              AI Brief
              {lead.intel_fetched_at && (
                <span className="ml-2 font-normal text-gray-400">
                  · Last fetched {formatDate(lead.intel_fetched_at)}
                </span>
              )}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${briefOpen ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {briefOpen && (
            <div className="px-3 py-3">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {lead.intel_brief}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Annotation */}
      {lead.intel_brief && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Your Annotation</p>
          <textarea
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            rows={3}
            placeholder="Add your own notes about this intel…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
          />
          <button
            onClick={handleSaveAnnotation}
            disabled={savingAnnotation || annotation === (lead.intel_annotation ?? '')}
            className="mt-1.5 px-4 py-1.5 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-50 hover:bg-[var(--color-brand-primary)] transition-colors"
          >
            {savingAnnotation ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {!lead.website && (
        <p className="text-xs text-gray-400 italic">
          No website on file — add one to enable intel generation.
        </p>
      )}
    </div>
  )
}
