'use client'

import { useState } from 'react'
import { Lead, LeadInsert } from '@/types/lead.types'
import { PipelineStage } from '@/lib/constants'
import { LeadType } from '@/lib/constants'
import { createLead, updateLeadDetails } from '@/services/leadService'
import LeadFormFields, { LeadFormValues } from './LeadFormFields'

interface LeadFormModalProps {
  mode: 'create' | 'edit'
  initial?: Partial<Lead>
  onSave: (lead: Lead) => void
  onClose: () => void
}

function toValues(initial?: Partial<Lead>): LeadFormValues {
  return {
    name: initial?.name ?? '',
    country: initial?.country ?? '',
    city: initial?.city ?? '',
    website: initial?.website ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    stage: initial?.stage ?? 'New Lead',
    source: initial?.source ?? '',
    lead_type: initial?.lead_type ?? '',
    curriculum: initial?.curriculum ?? [],
    lat: initial?.lat != null ? String(initial.lat) : '',
    lng: initial?.lng != null ? String(initial.lng) : '',
    notes: initial?.notes ?? '',
    call_count: String(initial?.call_count ?? 0),
    message_count: String(initial?.message_count ?? 0),
    email_count: String(initial?.email_count ?? 0),
  }
}

export default function LeadFormModal({ mode, initial, onSave, onClose }: LeadFormModalProps) {
  const [values, setValues] = useState<LeadFormValues>(() => toValues(initial))
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.name.trim() || !values.country.trim()) {
      setErrorMsg('Name and Country are required.')
      return
    }
    setSaving(true)
    setErrorMsg(null)

    if (mode === 'create') {
      const payload: LeadInsert = {
        name: values.name.trim(),
        country: values.country.trim(),
        city: values.city.trim() || null,
        website: values.website.trim() || null,
        phone: values.phone.trim() || null,
        email: values.email.trim() || null,
        stage: values.stage as PipelineStage,
        source: values.source || null,
        lead_type: values.lead_type ? (values.lead_type as LeadType) : null,
        curriculum: values.curriculum.length > 0 ? values.curriculum : null,
        lat: values.lat !== '' ? Number(values.lat) : null,
        lng: values.lng !== '' ? Number(values.lng) : null,
        call_count: Number(values.call_count) || 0,
        message_count: Number(values.message_count) || 0,
        email_count: Number(values.email_count) || 0,
      }
      const res = await createLead(payload)
      if (!res.success) { setErrorMsg(res.error); setSaving(false); return }
      onSave(res.data)
    } else {
      if (!initial?.id) return
      const init = toValues(initial)
      type UpdatePayload = Partial<Omit<LeadInsert, 'stage'>> & { stage?: string; notes?: string | null }
      const updates: UpdatePayload = {}
      if (values.name !== init.name) updates.name = values.name.trim()
      if (values.country !== init.country) updates.country = values.country.trim()
      if (values.city !== init.city) updates.city = values.city.trim() || null
      if (values.website !== init.website) updates.website = values.website.trim() || null
      if (values.phone !== init.phone) updates.phone = values.phone.trim() || null
      if (values.email !== init.email) updates.email = values.email.trim() || null
      if (values.stage !== init.stage) updates.stage = values.stage
      if (values.source !== init.source) updates.source = values.source || null
      if (values.lead_type !== init.lead_type) updates.lead_type = values.lead_type ? (values.lead_type as LeadType) : null
      if (JSON.stringify(values.curriculum) !== JSON.stringify(init.curriculum))
        updates.curriculum = values.curriculum.length > 0 ? values.curriculum : null
      if (values.lat !== init.lat) updates.lat = values.lat !== '' ? Number(values.lat) : null
      if (values.lng !== init.lng) updates.lng = values.lng !== '' ? Number(values.lng) : null
      if (values.notes !== init.notes) updates.notes = values.notes.trim() || null
      if (values.call_count !== init.call_count) updates.call_count = Number(values.call_count) || 0
      if (values.message_count !== init.message_count) updates.message_count = Number(values.message_count) || 0
      if (values.email_count !== init.email_count) updates.email_count = Number(values.email_count) || 0
      const res = await updateLeadDetails(initial.id, updates)
      if (!res.success) { setErrorMsg(res.error); setSaving(false); return }
      onSave(res.data)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">
            {mode === 'create' ? 'Add Lead' : 'Edit Lead'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto px-6 py-4 space-y-4">
            <LeadFormFields values={values} onChange={setValues} />
            {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
