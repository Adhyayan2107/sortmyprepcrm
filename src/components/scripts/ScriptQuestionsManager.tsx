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

function SortableRow({
  q,
  onDelete,
  deleteConfirmId,
  onConfirmDelete,
  onCancelDelete,
}: {
  q: ScriptQuestion
  onDelete: (id: string) => void
  deleteConfirmId: string | null
  onConfirmDelete: (id: string) => void
  onCancelDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const [open, setOpen] = useState(false)

  return (
    <div ref={setNodeRef} style={style} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 touch-none"
          title="Drag to reorder"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm8-16a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-left text-sm font-medium text-gray-800 flex items-center justify-between gap-2 min-w-0"
        >
          <span className="truncate">{q.question}</span>
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {deleteConfirmId === q.id ? (
          <div className="flex items-center gap-1.5 text-xs shrink-0">
            <span className="text-red-600 font-semibold">Delete?</span>
            <button onClick={() => onConfirmDelete(q.id)} className="px-2 py-0.5 rounded bg-red-600 text-white font-semibold hover:bg-red-700">Yes</button>
            <button onClick={onCancelDelete} className="text-gray-400 hover:underline">No</button>
          </div>
        ) : (
          <button
            onClick={() => onDelete(q.id)}
            className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-3 pt-1 text-sm text-gray-600 border-t border-gray-100 bg-gray-50 leading-relaxed whitespace-pre-wrap">
          {q.answer ?? <span className="text-gray-400 italic">No answer provided.</span>}
        </div>
      )}
    </div>
  )
}

export default function ScriptQuestionsManager({ scriptId }: { scriptId: string }) {
  const [questions, setQuestions] = useState<ScriptQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [newA, setNewA] = useState('')
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    getQuestionsByScript(scriptId).then((res) => {
      if (res.success) setQuestions(res.data)
      setLoading(false)
    })
  }, [scriptId])

  async function handleAdd() {
    if (!newQ.trim()) return
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

  async function handleConfirmDelete(id: string) {
    const res = await deleteQuestion(id)
    if (res.success) setQuestions((prev) => prev.filter((q) => q.id !== id))
    setDeleteConfirmId(null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = questions.findIndex((q) => q.id === active.id)
    const newIndex = questions.findIndex((q) => q.id === over.id)
    const reordered = arrayMove(questions, oldIndex, newIndex).map((q, i) => ({ ...q, position: i + 1 }))
    setQuestions(reordered)
    reorderQuestions(reordered.map((q) => ({ id: q.id, position: q.position })))
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          {questions.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {questions.map((q) => (
                    <SortableRow
                      key={q.id}
                      q={q}
                      onDelete={(id) => setDeleteConfirmId(id)}
                      deleteConfirmId={deleteConfirmId}
                      onConfirmDelete={handleConfirmDelete}
                      onCancelDelete={() => setDeleteConfirmId(null)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {showForm ? (
            <div className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
              <input
                autoFocus
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="Question…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
              />
              <textarea
                rows={3}
                value={newA}
                onChange={(e) => setNewA(e.target.value)}
                placeholder="Answer / talking points… (optional)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)] resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={adding || !newQ.trim()}
                  className="px-4 py-1.5 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
                >
                  {adding ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewQ(''); setNewA('') }}
                  className="px-4 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-400 hover:text-[var(--color-brand-accent)] hover:border-[var(--color-brand-accent)] transition-colors"
            >
              + Add question
            </button>
          )}
        </>
      )}
    </div>
  )
}
