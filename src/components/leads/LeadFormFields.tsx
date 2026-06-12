'use client'

import { PIPELINE_STAGES, LEAD_SOURCES, CURRICULA } from '@/lib/constants'

const INPUT_CLS =
  'border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#2E86AB]'
const LABEL_CLS = 'block text-xs font-semibold text-slate-500 uppercase mb-1'

export interface LeadFormValues {
  name: string
  country: string
  city: string
  website: string
  phone: string
  email: string
  stage: string
  source: string
  curriculum: string[]
  lat: string
  lng: string
  notes: string
}

interface LeadFormFieldsProps {
  values: LeadFormValues
  onChange: (values: LeadFormValues) => void
}

export default function LeadFormFields({ values, onChange }: LeadFormFieldsProps) {
  function set(key: keyof LeadFormValues, value: string) {
    onChange({ ...values, [key]: value })
  }

  function toggleCurriculum(item: string) {
    const next = values.curriculum.includes(item)
      ? values.curriculum.filter((c) => c !== item)
      : [...values.curriculum, item]
    onChange({ ...values, curriculum: next })
  }

  return (
    <>
      <div>
        <label className={LABEL_CLS}>Name *</label>
        <input className={INPUT_CLS} value={values.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className={LABEL_CLS}>Country *</label>
        <input className={INPUT_CLS} value={values.country} onChange={(e) => set('country', e.target.value)} required />
      </div>
      <div>
        <label className={LABEL_CLS}>City</label>
        <input className={INPUT_CLS} value={values.city} onChange={(e) => set('city', e.target.value)} />
      </div>
      <div>
        <label className={LABEL_CLS}>Website</label>
        <input type="url" className={INPUT_CLS} value={values.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <label className={LABEL_CLS}>Phone</label>
        <input type="tel" className={INPUT_CLS} value={values.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div>
        <label className={LABEL_CLS}>Email</label>
        <input type="email" className={INPUT_CLS} value={values.email} onChange={(e) => set('email', e.target.value)} />
      </div>
      <div>
        <label className={LABEL_CLS}>Stage</label>
        <select className={INPUT_CLS} value={values.stage} onChange={(e) => set('stage', e.target.value)}>
          {PIPELINE_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>Source</label>
        <select className={INPUT_CLS} value={values.source} onChange={(e) => set('source', e.target.value)}>
          <option value="">— select —</option>
          {LEAD_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={LABEL_CLS}>Curriculum</label>
        <div className="grid grid-cols-2 gap-1">
          {CURRICULA.map((c) => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={values.curriculum.includes(c)}
                onChange={() => toggleCurriculum(c)}
                className="rounded"
              />
              {c}
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLS}>Latitude</label>
          <input type="number" step="any" className={INPUT_CLS} value={values.lat} onChange={(e) => set('lat', e.target.value)} />
        </div>
        <div>
          <label className={LABEL_CLS}>Longitude</label>
          <input type="number" step="any" className={INPUT_CLS} value={values.lng} onChange={(e) => set('lng', e.target.value)} />
        </div>
      </div>
      <div>
        <label className={LABEL_CLS}>Notes</label>
        <textarea
          className={INPUT_CLS + ' resize-none'}
          rows={3}
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </div>
    </>
  )
}
