'use client'

import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CONTACT_TYPES } from '@/lib/constants'
import { ContactType } from '@/types/script.types'
import { useScripts } from '@/hooks/useScripts'
import ScriptCard from '@/components/scripts/ScriptCard'
import NewScriptModal from '@/components/scripts/NewScriptModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import EmptyState from '@/components/ui/EmptyState'

function ScriptsPageInner() {
  const searchParams = useSearchParams()
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-primary)]">{activeTab}s</h1>
          <p className="text-sm text-slate-500 mt-0.5">Call scripts for this contact type.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors"
        >
          + New Script
        </button>
      </div>

      {/* Contact type tabs — mobile only (sidebar handles this on desktop) */}
      <div className="md:hidden flex border-b border-gray-200 mb-6 overflow-x-auto">
        {CONTACT_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setActiveTab(type)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === type ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-gray-500 hover:text-gray-700'
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
