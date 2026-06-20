'use client'

import { useState, useRef } from 'react'
import { parseImportFile } from '@/utils/importParser'
import { batchGeocode } from '@/utils/geocoder'
import { bulkInsertLeads } from '@/services/leadService'
import { LeadInsert } from '@/types/lead.types'
import ImportPreviewTable from '@/components/leads/ImportPreviewTable'

type Step = 'upload' | 'preview' | 'done'

interface ImportSummary {
  inserted: number
  duplicates: string[]
  errors: Array<{ row: number; reason: string }>
}

export default function ImportPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [defaultCountry, setDefaultCountry] = useState('')
  const [leads, setLeads] = useState<LeadInsert[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; reason: string }>>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [processingMsg, setProcessingMsg] = useState<string | null>(null)
  const [geocodeProgress, setGeocodeProgress] = useState<{ done: number; total: number } | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setProcessingMsg('Parsing file…')
    setGeocodeProgress(null)

    const parsed = await parseImportFile(file, {
      defaultCountry: defaultCountry.trim() || undefined,
    })

    let finalLeads = parsed.valid

    if (parsed.geocodable > 0) {
      setProcessingMsg(`Geocoding locations…`)
      setGeocodeProgress({ done: 0, total: parsed.geocodable })
      finalLeads = await batchGeocode(parsed.valid, (done, total) => {
        setGeocodeProgress({ done, total })
      })
    }

    setLeads(finalLeads)
    setParseErrors(parsed.errors)
    setProcessingMsg(null)
    setGeocodeProgress(null)
    setStep('preview')
  }

  async function handleConfirm() {
    setImporting(true)
    setImportError(null)

    const result = await bulkInsertLeads(leads)

    if (!result.success) {
      setImportError(result.error)
      setImporting(false)
      return
    }

    setSummary({
      inserted: result.data.inserted,
      duplicates: result.data.duplicates,
      errors: parseErrors,
    })
    setStep('done')
    setImporting(false)
  }

  function handleReset() {
    setStep('upload')
    setLeads([])
    setParseErrors([])
    setSummary(null)
    setImportError(null)
    setProcessingMsg(null)
    setGeocodeProgress(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-brand-primary)] mb-6">Import Leads</h1>

      {/* ── Upload ── */}
      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
          {/* Template download */}
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-blue-800">Download the official import template</p>
              <p className="text-xs text-blue-500 mt-0.5">Includes all columns, colour-coded hints, and an Instructions sheet</p>
            </div>
            <a
              href="/SortMyPrep CRM - Lead Import Template.xlsx"
              download
              className="shrink-0 ml-4 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Download Template
            </a>
          </div>
          {/* Default country */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Default Country <span className="font-normal text-gray-400">(applied when your sheet has no Country column)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Singapore"
              value={defaultCountry}
              onChange={e => setDefaultCountry(e.target.value)}
              className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-accent)]"
            />
          </div>

          {/* File picker */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
            {processingMsg ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">{processingMsg}</p>
                {geocodeProgress && (
                  <div className="w-full max-w-xs mx-auto">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{geocodeProgress.done} / {geocodeProgress.total}</span>
                      <span>{Math.round((geocodeProgress.done / geocodeProgress.total) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-brand-accent)] transition-all duration-200"
                        style={{ width: `${(geocodeProgress.done / geocodeProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                {!geocodeProgress && (
                  <div className="w-6 h-6 border-2 border-[var(--color-brand-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
                )}
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-1">
                  Supports <strong>.xlsx</strong> and <strong>.csv</strong>
                </p>
                <p className="text-xs text-gray-400 mb-4">
                  Columns auto-detected — any extra columns are safely ignored
                </p>
                <label className="cursor-pointer inline-block bg-[var(--color-brand-accent)] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-brand-primary)] transition-colors">
                  Choose File
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </>
            )}
          </div>

          {/* Column reference */}
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer font-medium text-gray-600 select-none">
              Supported column names
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 pl-2">
              <div><span className="font-medium text-gray-700">name</span> — or "Name of Center"</div>
              <div><span className="font-medium text-gray-700">country</span> — or use Default Country above</div>
              <div><span className="font-medium text-gray-700">city</span></div>
              <div><span className="font-medium text-gray-700">phone</span> — or "Centre / Admin Number"</div>
              <div><span className="font-medium text-gray-700">email</span> — or "Centre / Admin Email"</div>
              <div><span className="font-medium text-gray-700">website</span></div>
              <div><span className="font-medium text-gray-700">status of lead</span> — maps to pipeline stage</div>
              <div><span className="font-medium text-gray-700">type</span> — saved in notes</div>
              <div><span className="font-medium text-gray-700">founder name / number / email / linkedin</span> — saved in notes</div>
              <div><span className="font-medium text-gray-700">number of teachers</span> — saved in notes</div>
              <div><span className="font-medium text-gray-700">google maps link</span> — auto-extracts coordinates</div>
              <div><span className="font-medium text-gray-700">lat / lng</span> — manual coordinates</div>
              <div><span className="font-medium text-gray-700">curriculum</span> — pipe-separated: IB|IGCSE|A-Levels</div>
              <div><span className="font-medium text-gray-700">source</span></div>
            </div>
          </details>
        </div>
      )}

      {/* ── Preview ── */}
      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">
                {leads.length} valid row{leads.length !== 1 ? 's' : ''} ready to import
              </p>
              {parseErrors.length > 0 && (
                <p className="text-sm text-red-500">
                  {parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} skipped (see below)
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={importing || leads.length === 0}
                className="px-4 py-2 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-primary)] disabled:opacity-60 transition-colors"
              >
                {importing ? 'Importing…' : `Confirm Import (${leads.length})`}
              </button>
            </div>
          </div>

          {importError && (
            <p className="text-sm text-red-500 bg-red-50 rounded-lg px-4 py-2">{importError}</p>
          )}

          {parseErrors.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 space-y-1">
              <p className="text-sm font-semibold text-red-700">Skipped rows:</p>
              {parseErrors.map((e, i) => (
                <p key={i} className="text-sm text-red-600">
                  {e.row > 0 ? `Row ${e.row}: ` : ''}{e.reason}
                </p>
              ))}
            </div>
          )}

          <ImportPreviewTable leads={leads} />
        </div>
      )}

      {/* ── Done ── */}
      {step === 'done' && summary && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-4">
          <div className="text-5xl">✓</div>
          <h2 className="text-xl font-bold text-emerald-600">Import Complete</h2>
          <div className="text-gray-600 space-y-1">
            <p><span className="font-semibold text-gray-900">{summary.inserted}</span> leads added</p>
            {summary.duplicates.length > 0 && (
              <p><span className="font-semibold text-gray-900">{summary.duplicates.length}</span> duplicates skipped</p>
            )}
            {summary.errors.length > 0 && (
              <p><span className="font-semibold text-red-500">{summary.errors.length}</span> rows failed validation</p>
            )}
          </div>
          <button
            onClick={handleReset}
            className="mt-4 px-6 py-2 rounded-lg bg-[var(--color-brand-accent)] text-white text-sm font-semibold hover:bg-[var(--color-brand-primary)] transition-colors"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  )
}
