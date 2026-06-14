'use client'

import { useState, useRef } from 'react'
import { ContactType } from '@/types/script.types'
import { createScript } from '@/services/scriptService'
import { useUser } from '@/hooks/useUser'

interface NewScriptModalProps {
  activeTab: ContactType
  onSaved: () => void
  onClose: () => void
}

export default function NewScriptModal({ activeTab, onSaved, onClose }: NewScriptModalProps) {
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
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-60">
              {saving ? 'Saving…' : 'Save Script'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
