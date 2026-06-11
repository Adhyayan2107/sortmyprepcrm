'use client'

import { useState, useRef } from 'react'
import { parseCSVFile } from '@/utils/csvParser'
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
  const [leads, setLeads] = useState<LeadInsert[]>([])
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; reason: string }>>([])
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await parseCSVFile(file)
    setLeads(result.valid)
    setParseErrors(result.errors)
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
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[var(--color-brand-primary)] mb-6">Import Leads</h1>

      {step === 'upload' && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500 mb-2">
            Upload a CSV with columns: <code className="bg-gray-100 px-1 rounded">name, country, city, lat, lng, website, phone, email, curriculum, source</code>
          </p>
          <p className="text-xs text-gray-400 mb-6">Curriculum is pipe-separated: IB|IGCSE|A-Levels</p>
          <label className="cursor-pointer inline-block bg-[var(--color-brand-accent)] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-brand-primary)] transition-colors">
            Choose CSV File
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">
                {leads.length} valid row{leads.length !== 1 ? 's' : ''} ready to import
              </p>
              {parseErrors.length > 0 && (
                <p className="text-sm text-red-500">{parseErrors.length} row{parseErrors.length !== 1 ? 's' : ''} with errors (will be skipped)</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
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
              <p className="text-sm font-semibold text-red-700">Rows with errors (skipped):</p>
              {parseErrors.map((e, i) => (
                <p key={i} className="text-sm text-red-600">Row {e.row}: {e.reason}</p>
              ))}
            </div>
          )}

          <ImportPreviewTable leads={leads} />
        </div>
      )}

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
