'use client'

import { useState, useEffect } from 'react'
import { ScriptQuestion } from '@/types/script.types'
import { getQuestionsByScript } from '@/services/scriptQuestionsService'

interface Props {
  scriptId: string | null
}

export default function CallQuestionsTab({ scriptId }: Props) {
  const [questions, setQuestions] = useState<ScriptQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!scriptId) { setQuestions([]); return }
    setLoading(true)
    getQuestionsByScript(scriptId).then((res) => {
      if (res.success) setQuestions(res.data)
      setLoading(false)
    })
  }, [scriptId])

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (!scriptId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">No script selected — assign a script to see questions.</p>
      </div>
    )
  }

  if (loading) return <p className="text-slate-400 text-sm text-center py-8">Loading…</p>

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">No questions for this script yet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-4 px-2 space-y-2">
      {questions.map((q) => (
        <div key={q.id} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <button
            onClick={() => toggleOpen(q.id)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-slate-800"
          >
            <span>{q.question}</span>
            <svg
              className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${openIds.has(q.id) ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIds.has(q.id) && (
            <div className="px-4 pb-3 pt-0 text-sm text-slate-600 border-t border-slate-100 bg-slate-50 leading-relaxed whitespace-pre-wrap">
              {q.answer ?? <span className="text-slate-400 italic">No answer provided.</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
