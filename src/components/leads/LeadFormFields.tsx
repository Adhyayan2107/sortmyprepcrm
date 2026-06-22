'use client'

import { useState } from 'react'
import { PIPELINE_STAGES, LEAD_SOURCES, CURRICULA, LEAD_TYPES } from '@/lib/constants'
import type { LeadType } from '@/lib/constants'

const INPUT_CLS =
  'border border-slate-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-[#2563EB]'
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
  lead_type: LeadType | ''
  curriculum: string[]
  lat: string
  lng: string
  notes: string
  call_count: string
  message_count: string
  email_count: string
}

interface LeadFormFieldsProps {
  values: LeadFormValues
  onChange: (values: LeadFormValues) => void
}

interface MapboxContext {
  id: string
  text: string
}

interface MapboxFeature {
  center: [number, number]
  text: string
  place_type?: string[]
  context?: MapboxContext[]
}

// Extract city + country from a Mapbox geocoding feature
function extractLocation(feature: MapboxFeature): { city: string; country: string } {
  const context = feature.context ?? []
  let city = ''
  let country = ''
  for (const ctx of context) {
    if (!city && (ctx.id.startsWith('place.') || ctx.id.startsWith('locality.'))) city = ctx.text
    if (!country && ctx.id.startsWith('country.')) country = ctx.text
  }
  // If the feature itself is a city/place
  if (!city && feature.place_type?.includes('place')) city = feature.text
  return { city, country }
}

// Parse coordinates out of common Google Maps URL formats
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  // /@lat,lng,zoom — standard browser URL when viewing a location
  const atMatch = url.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/)
  if (atMatch) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }

  // ?q=lat,lng — coordinate search query
  const qMatch = url.match(/[?&]q=(-?\d+\.?\d+),(-?\d+\.?\d+)/)
  if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) }

  // ll=lat,lng — older embed format
  const llMatch = url.match(/[?&]ll=(-?\d+\.?\d+),(-?\d+\.?\d+)/)
  if (llMatch) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) }

  return null
}

export default function LeadFormFields({ values, onChange }: LeadFormFieldsProps) {
  const [addressInput, setAddressInput] = useState('')
  const [gmapsInput, setGmapsInput] = useState('')
  const [locating, setLocating] = useState(false)
  const [locStatus, setLocStatus] = useState<{ type: 'error' | 'ok'; msg: string } | null>(null)

  function set(key: keyof LeadFormValues, value: string) {
    onChange({ ...values, [key]: value })
  }

  function toggleCurriculum(item: string) {
    const next = values.curriculum.includes(item)
      ? values.curriculum.filter((c) => c !== item)
      : [...values.curriculum, item]
    onChange({ ...values, curriculum: next })
  }

  async function fetchMapbox(query: string): Promise<MapboxFeature | null> {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1`
    const res = await fetch(url)
    const data = await res.json()
    return data.features?.[0] ?? null
  }

  // A: forward geocode address → fills lat, lng, city, country
  async function geocodeAddress() {
    if (!addressInput.trim()) return
    setLocating(true)
    setLocStatus(null)
    try {
      const feature = await fetchMapbox(encodeURIComponent(addressInput))
      if (!feature) { setLocStatus({ type: 'error', msg: 'Address not found' }); return }
      const [lng, lat] = feature.center
      const { city, country } = extractLocation(feature)
      onChange({
        ...values,
        lat: String(lat),
        lng: String(lng),
        city: city || values.city,
        country: country || values.country,
      })
      setLocStatus({ type: 'ok', msg: `Found: ${[city, country].filter(Boolean).join(', ')}` })
    } catch {
      setLocStatus({ type: 'error', msg: 'Geocoding failed — check your connection' })
    } finally {
      setLocating(false)
    }
  }

  // B: parse Google Maps URL → extract coords → reverse geocode for city + country
  async function useGoogleMapsLink() {
    const coords = parseGoogleMapsUrl(gmapsInput.trim())
    if (!coords) {
      setLocStatus({
        type: 'error',
        msg: gmapsInput.includes('goo.gl')
          ? 'Short links not supported — open the full map URL from your browser'
          : 'Could not read coordinates from this link',
      })
      return
    }
    setLocating(true)
    setLocStatus(null)
    try {
      // Reverse geocode to fill city + country
      const feature = await fetchMapbox(`${coords.lng},${coords.lat}`)
      const { city, country } = feature ? extractLocation(feature) : { city: '', country: '' }
      onChange({
        ...values,
        lat: String(coords.lat),
        lng: String(coords.lng),
        city: city || values.city,
        country: country || values.country,
      })
      setLocStatus({
        type: 'ok',
        msg: `Filled: ${[city, country].filter(Boolean).join(', ')} (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`,
      })
      setGmapsInput('')
    } catch {
      // Coords extracted — just fill them even if reverse geocode fails
      onChange({ ...values, lat: String(coords.lat), lng: String(coords.lng) })
      setLocStatus({ type: 'ok', msg: `Coords filled (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})` })
    } finally {
      setLocating(false)
    }
  }

  return (
    <>
      <div>
        <label className={LABEL_CLS}>Name *</label>
        <input className={INPUT_CLS} value={values.name} onChange={(e) => set('name', e.target.value)} required />
      </div>
      <div>
        <label className={LABEL_CLS}>Lead Type *</label>
        <div className="flex gap-2">
          {LEAD_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('lead_type', t)}
              className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                values.lead_type === t
                  ? t === 'School'
                    ? 'bg-violet-600 border-violet-600 text-white'
                    : t === 'Tuition Center'
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
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
              <input type="checkbox" checked={values.curriculum.includes(c)} onChange={() => toggleCurriculum(c)} className="rounded" />
              {c}
            </label>
          ))}
        </div>
      </div>

      {/* Outreach counters */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase">Previous Outreach</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={LABEL_CLS}>Cold Calls</label>
            <input type="number" min="0" className={INPUT_CLS + ' bg-white'} value={values.call_count} onChange={(e) => set('call_count', e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Messages</label>
            <input type="number" min="0" className={INPUT_CLS + ' bg-white'} value={values.message_count} onChange={(e) => set('message_count', e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Emails</label>
            <input type="number" min="0" className={INPUT_CLS + ' bg-white'} value={values.email_count} onChange={(e) => set('email_count', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Location section */}
      <div className="rounded-xl border border-slate-200 p-3 space-y-3 bg-slate-50">
        <p className="text-xs font-semibold text-slate-500 uppercase">Location</p>

        {/* A: Address → geocode */}
        <div>
          <label className={LABEL_CLS}>Address or place name</label>
          <div className="flex gap-2">
            <input
              className={INPUT_CLS + ' bg-white'}
              placeholder="e.g. Knowledge Village, Dubai"
              value={addressInput}
              onChange={(e) => { setAddressInput(e.target.value); setLocStatus(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); geocodeAddress() } }}
            />
            <button
              type="button"
              onClick={geocodeAddress}
              disabled={locating || !addressInput.trim()}
              className="px-3 py-2 rounded-lg bg-[#2563EB] text-white text-xs font-semibold disabled:opacity-50 shrink-0 hover:bg-[#1D4ED8] transition-colors"
            >
              {locating ? '…' : 'Locate'}
            </button>
          </div>
        </div>

        {/* B: Google Maps link */}
        <div>
          <label className={LABEL_CLS}>Or paste a Google Maps link</label>
          <div className="flex gap-2">
            <input
              className={INPUT_CLS + ' bg-white'}
              placeholder="https://maps.google.com/..."
              value={gmapsInput}
              onChange={(e) => { setGmapsInput(e.target.value); setLocStatus(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); useGoogleMapsLink() } }}
            />
            <button
              type="button"
              onClick={useGoogleMapsLink}
              disabled={locating || !gmapsInput.trim()}
              className="px-3 py-2 rounded-lg bg-slate-700 text-white text-xs font-semibold disabled:opacity-50 shrink-0 hover:bg-slate-900 transition-colors"
            >
              {locating ? '…' : 'Use'}
            </button>
          </div>
        </div>

        {/* Status message */}
        {locStatus && (
          <p className={`text-xs px-2 py-1.5 rounded-lg ${
            locStatus.type === 'ok'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-red-600 bg-red-50'
          }`}>
            {locStatus.msg}
          </p>
        )}

        {/* Manual lat/lng */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLS}>Latitude</label>
            <input type="number" step="any" className={INPUT_CLS + ' bg-white'} value={values.lat} onChange={(e) => set('lat', e.target.value)} />
          </div>
          <div>
            <label className={LABEL_CLS}>Longitude</label>
            <input type="number" step="any" className={INPUT_CLS + ' bg-white'} value={values.lng} onChange={(e) => set('lng', e.target.value)} />
          </div>
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>Notes</label>
        <textarea className={INPUT_CLS + ' resize-none'} rows={3} value={values.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
    </>
  )
}
