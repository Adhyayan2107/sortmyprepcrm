'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ScriptQuestion } from '@/types/script.types'
import { getQuestionsByScript, addQuestion, deleteQuestion, reorderQuestions } from '@/services/scriptQuestionsService'

interface Props {
  scriptId: string | null
  isAdmin: boolean
}

function SortableQuestion({
  q,
  isAdmin,
  isOpen,
  onToggle,
  onDelete,
}: {
  q: ScriptQuestion
  isAdmin: boolean
  isOpen: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {isAdmin && (
          <button
            {...attributes}
            {...listeners}
            className="text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
            title="Drag to reorder"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        )}
        <button onClick={onToggle} className="flex-1 text-left text-sm font-medium text-slate-800 flex items-center justify-between gap-2">
          <span>{q.question}</span>
          <svg
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isAdmin && (
          <button
            onClick={onDelete}
            className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
            title="Delete question"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {isOpen && q.answer && (
        <div className="px-4 pb-3 pt-0 text-sm text-slate-600 border-t border-slate-100 bg-slate-50 leading-relaxed whitespace-pre-wrap">
          {q.answer}
        </div>
      )}
    </div>
  )
}

export default function CallQuestionsTab({ scriptId, isAdmin }: Props) {
  const [questions, setQuestions] = useState<ScriptQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

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

  async function handleAdd() {
    if (!scriptId || !newQ.trim()) return
    setAdding(true)
    const res = await addQuestion(scriptId, newQ.trim(), newA.trim())
    if (res.success) {
      setQuestions((prev) => [...prev, res.data])
      setNewQ('')
      setNewA('')
      setShowForm(false)
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    const res = await deleteQuestion(id)
    if (res.success) setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({ ...q, sort_order: i + 1 }))
    setQuestions(reordered)
    reorderQuestions(reordered.map((q) => ({ id: q.id, sort_order: q.sort_order })))
  }

  if (!scriptId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-slate-400 text-sm">No script selected — assign a script to see questions.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-4 px-2 space-y-3">
      {loading ? (
        <p className="text-slate-400 text-sm text-center py-8">Loading…</p>
      ) : questions.length === 0 && !showForm ? (
        <p className="text-slate-400 text-sm text-center py-8">No questions for this script yet.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {questions.map((q) => (
                <SortableQuestion
                  key={q.id}
                  q={q}
                  isAdmin={isAdmin}
                  isOpen={openIds.has(q.id)}
                  onToggle={() => toggleOpen(q.id)}
                  onDelete={() => handleDelete(q.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isAdmin && (
        showForm ? (
          <div className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
            <input
              autoFocus
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="Question…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
            <textarea
              rows={3}
              value={newA}
              onChange={(e) => setNewA(e.target.value)}
              placeholder="Answer / talking points… (optional)"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={adding || !newQ.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#2563EB] text-white text-sm font-semibold disabled:opacity-60 hover:bg-[#1D4ED8] transition-colors"
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNewQ(''); setNewA('') }}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-400 hover:text-[#2563EB] hover:border-[#2563EB] transition-colors"
          >
            + Add question
          </button>
        )
      )}
    </div>
  )
}
