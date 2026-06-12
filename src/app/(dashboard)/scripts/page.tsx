'use client'

import { Suspense } from 'react'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CONTACT_TYPES } from '@/lib/constants'
import { ContactType, ScriptWithScore } from '@/types/script.types'
import { useScripts } from '@/hooks/useScripts'
import { createScript, getScriptLeaderboard } from '@/services/scriptService'
import { useUser } from '@/hooks/useUser'
import ScriptCard from '@/components/scripts/ScriptCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

const STAGE_MAX = 7

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return (
    <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">
      {rank}
    </span>
  )
}

function ScriptRankings() {
  const [data, setData] = useState<ScriptWithScore[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScriptLeaderboard().then((res) => {
      if (res.success) setData(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingSpinner />

  const withUsage = data.filter((s) => s.lead_count > 0)
  const noUsage = data.filter((s) => s.lead_count === 0)

  return (
    <div className="space-y-4">
      {withUsage.length === 0 && (
        <EmptyState
          title="No rankings yet"
          description="Assign scripts to leads from the lead detail panel — rankings update as leads advance through stages."
        />
      )}
      {withUsage.map((s, i) => (
        <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="shrink-0 flex items-center justify-center w-8">
            <RankBadge rank={i + 1} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">{s.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.contact_type} · {s.lead_count} lead{s.lead_count !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold text-[#2563EB]">{s.avg_points.toFixed(1)}</div>
            <div className="text-xs text-gray-400">avg pts</div>
          </div>
          <div className="text-right shrink-0 hidden sm:block">
            <div className="text-sm font-semibold text-gray-700">{s.total_points}</div>
            <div className="text-xs text-gray-400">total</div>
          </div>
          <div className="w-20 shrink-0 hidden md:block">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2563EB] rounded-full"
                style={{ width: `${(s.avg_points / STAGE_MAX) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5 text-center">{STAGE_MAX} max</p>
          </div>
        </div>
      ))}
      {noUsage.length > 0 && withUsage.length > 0 && (
        <p className="text-xs text-gray-400 pt-2">
          {noUsage.length} script{noUsage.length !== 1 ? 's' : ''} not yet assigned to any lead
        </p>
      )}
    </div>
  )
}

function NewScriptModal({
  activeTab,
  onSaved,
  onClose,
}: {
  activeTab: ContactType
  onSaved: () => void
  onClose: () => void
}) {
  const { user } = useUser()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const name = file.name.toLowerCase()
    if (name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')) {
      setImporting(true)
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch('/api/extract-text', { method: 'POST', body: form })
        if (res.ok) {
          const { text } = await res.json()
          setContent(text ?? '')
        }
      } catch { /* silently fail */ }
      setImporting(false)
    } else {
      const reader = new FileReader()
      reader.onload = () => { if (typeof reader.result === 'string') setContent(reader.result) }
      reader.readAsText(file)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !title.trim()) return
    setSaving(true)
    const res = await createScript({ contact_type: activeTab, title: title.trim(), content: content.trim() }, user.id)
    if (res.success) { onSaved(); onClose() }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">New Script — {activeTab}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Title *</label>
              <input
                required
                placeholder="e.g. Initial outreach — IB school"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Content</label>
                <button
                  type="button"
                  disabled={importing}
                  onClick={() => fileRef.current?.click()}
                  className="text-xs text-[#2563EB] hover:underline disabled:opacity-50"
                >
                  {importing ? 'Extracting…' : 'Import from file (.txt, .md, .pdf, .docx)'}
                </button>
                <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" className="hidden" onChange={handleImport} />
              </div>
              <textarea
                rows={8}
                placeholder="Script content (markdown supported)…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Script'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ScriptsPageInner() {
  const searchParams = useSearchParams()
  const isRankings = searchParams.get('view') === 'rankings'
  const [activeTab, setActiveTab] = useState<ContactType>(() => {
    const t = searchParams.get('type')
    return CONTACT_TYPES.includes(t as ContactType) ? (t as ContactType) : CONTACT_TYPES[0]
  })
  const { scripts, loading, refetch } = useScripts(activeTab)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    const t = searchParams.get('type')
    if (t && CONTACT_TYPES.includes(t as ContactType)) setActiveTab(t as ContactType)
  }, [searchParams])

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">
          {isRankings ? 'Script Rankings' : 'Call Scripts'}
        </h1>
        {!isRankings && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
          >
            + New Script
          </button>
        )}
      </div>

      {isRankings ? (
        <ScriptRankings />
      ) : (
        <>
          {/* Contact type tabs */}
          <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
            {CONTACT_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  activeTab === type
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {type}s
              </button>
            ))}
          </div>

          {loading ? (
            <LoadingSpinner />
          ) : scripts.length === 0 ? (
            <EmptyState
              title={`No scripts for ${activeTab}s yet`}
              description="Create the first one using the button above."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {scripts.map((script) => (
                <ScriptCard key={script.id} script={script} />
              ))}
            </div>
          )}
        </>
      )}

      {showModal && (
        <NewScriptModal
          activeTab={activeTab}
          onSaved={refetch}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

export default function ScriptsPage() {
  return (
    <Suspense fallback={null}>
      <ScriptsPageInner />
    </Suspense>
  )
}
