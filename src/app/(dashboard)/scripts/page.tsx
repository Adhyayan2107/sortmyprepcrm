'use client'

import { useState, useRef } from 'react'
import { CONTACT_TYPES } from '@/lib/constants'
import { ContactType } from '@/types/script.types'
import { useScripts } from '@/hooks/useScripts'
import { createScript } from '@/services/scriptService'
import { useUser } from '@/hooks/useUser'
import ScriptCard from '@/components/scripts/ScriptCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

export default function ScriptsPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState<ContactType>(CONTACT_TYPES[0])
  const { scripts, loading, refetch } = useScripts(activeTab)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setNewContent(reader.result)
      }
    }
    reader.readAsText(file)
    // Reset so same file can be re-selected if needed
    e.target.value = ''
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !newTitle.trim()) return
    setSaving(true)
    const res = await createScript(
      { contact_type: activeTab, title: newTitle.trim(), content: newContent.trim() },
      user.id
    )
    if (res.success) {
      setNewTitle('')
      setNewContent('')
      setShowCreate(false)
      await refetch()
    }
    setSaving(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">Call Scripts</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-primary)] transition-colors"
        >
          {showCreate ? 'Cancel' : '+ New Script'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
          <h2 className="font-semibold text-gray-800">New Script — {activeTab}</h2>
          <input
            type="text"
            required
            placeholder="Script title…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 font-medium">Content</span>
            <button
              type="button"
              className="text-xs text-[#2E86AB] hover:underline cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              Import from file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
          <textarea
            rows={6}
            placeholder="Script content (markdown supported)…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none font-mono"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-semibold disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Script'}
          </button>
        </form>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {CONTACT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === type
                ? 'border-b-2 border-[var(--color-brand-accent)] text-[var(--color-brand-accent)]'
                : 'text-gray-500 hover:text-gray-700'
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
    </div>
  )
}
