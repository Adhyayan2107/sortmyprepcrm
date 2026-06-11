'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Script, ScriptRating } from '@/types/script.types'
import { ServiceResult } from '@/types/api.types'
import { getScriptById, updateScript, rateScript, getUserRating } from '@/services/scriptService'
import { useUser } from '@/hooks/useUser'
import StarRating from '@/components/ui/StarRating'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ScriptDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useUser()

  const [script, setScript] = useState<Script | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const [ratingNote, setRatingNote] = useState('')
  const [ratingNote2, setRatingNote2] = useState('')
  const [ratingSaved, setRatingSaved] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      getScriptById(id),
      user ? getUserRating(id, user.id) : Promise.resolve({ success: true, data: null } as ServiceResult<ScriptRating | null>),
    ]).then(([scriptRes, ratingRes]) => {
      if (scriptRes.success) {
        setScript(scriptRes.data)
        setEditTitle(scriptRes.data.title)
        setEditContent(scriptRes.data.content ?? '')
      }
      if (ratingRes.success && ratingRes.data) {
        setUserRating(ratingRes.data.rating)
        setRatingNote2(ratingRes.data.note ?? '')
      }
      setLoading(false)
    })
  }, [id, user])

  async function handleSaveEdit() {
    if (!script) return
    setSaving(true)
    const res = await updateScript(script.id, { title: editTitle, content: editContent })
    if (res.success) {
      setScript((prev) => prev ? { ...prev, title: editTitle, content: editContent } : null)
      setEditing(false)
    }
    setSaving(false)
  }

  async function handleArchive() {
    if (!script) return
    const res = await updateScript(script.id, { archived: true })
    if (res.success) router.push('/scripts')
  }

  async function handleRate() {
    if (!script || !user || userRating === 0) return
    setSaving(true)
    const res = await rateScript(script.id, user.id, userRating, ratingNote || undefined)
    if (res.success) {
      setRatingSaved(true)
      // refresh avg rating
      const updated = await getScriptById(script.id)
      if (updated.success) setScript(updated.data)
    }
    setSaving(false)
  }

  if (loading) return <LoadingSpinner />
  if (!script) return <p className="text-gray-500 p-4">Script not found.</p>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <button
        onClick={() => router.back()}
        className="text-sm text-[var(--color-brand-accent)] hover:underline mb-4 flex items-center gap-1"
      >
        ← Back to Scripts
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            {editing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-bold w-full border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{script.title}</h1>
            )}
            <p className="text-sm text-gray-400 mt-1">{script.contact_type} · {script.usage_count} uses</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {editing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
                >
                  Edit
                </button>
                <button
                  onClick={handleArchive}
                  className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-500 hover:bg-red-50"
                >
                  Archive
                </button>
              </>
            )}
          </div>
        </div>

        {/* Avg rating */}
        <div className="flex items-center gap-2">
          <StarRating value={Math.round(script.avg_rating ?? 0)} readonly size="sm" />
          <span className="text-sm text-gray-500">
            {script.avg_rating?.toFixed(1) ?? '—'} ({script.rating_count ?? 0} ratings)
          </span>
        </div>

        {/* Content */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Script Content</p>
          {editing ? (
            <textarea
              rows={12}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3">
              {script.content ?? 'No content yet.'}
            </pre>
          )}
        </div>

        {/* Rate this script */}
        <div className="border-t border-gray-200 pt-5">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Rate This Script</p>
          {ratingSaved && (
            <p className="text-sm text-emerald-600 mb-2">Rating saved!</p>
          )}
          <div className="space-y-3">
            <StarRating value={userRating} onChange={setUserRating} />
            <textarea
              rows={2}
              placeholder="Leave a note (optional)…"
              value={ratingNote}
              onChange={(e) => setRatingNote(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
            />
            {ratingNote2 && !ratingNote && (
              <p className="text-xs text-gray-400">Your previous note: {ratingNote2}</p>
            )}
            <button
              onClick={handleRate}
              disabled={userRating === 0 || saving}
              className="px-4 py-2 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Submit Rating'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
