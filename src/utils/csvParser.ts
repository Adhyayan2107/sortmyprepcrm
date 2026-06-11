import Papa from 'papaparse'
import { CSVRow, LeadInsert } from '@/types/lead.types'
import { CURRICULA } from '@/lib/constants'

const REQUIRED_COLUMNS = ['name', 'country'] as const
const EXPECTED_COLUMNS = [
  'name', 'country', 'city', 'lat', 'lng',
  'website', 'phone', 'email', 'curriculum', 'source',
]

export interface ParsedCSVResult {
  valid: LeadInsert[]
  errors: Array<{ row: number; reason: string }>
}

export function parseCSVFile(file: File): Promise<ParsedCSVResult> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        resolve(validateAndTransformRows(results.data))
      },
      error: (err) => {
        resolve({ valid: [], errors: [{ row: 0, reason: err.message }] })
      },
    })
  })
}

function validateAndTransformRows(rows: Record<string, string>[]): ParsedCSVResult {
  const valid: LeadInsert[] = []
  const errors: Array<{ row: number; reason: string }> = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-indexed + header row

    for (const col of REQUIRED_COLUMNS) {
      if (!row[col]?.trim()) {
        errors.push({ row: rowNum, reason: `Missing required field: ${col}` })
        return
      }
    }

    const unknownCols = Object.keys(row).filter(
      (k) => !EXPECTED_COLUMNS.includes(k)
    )
    if (unknownCols.length > 0) {
      errors.push({ row: rowNum, reason: `Unknown columns: ${unknownCols.join(', ')}` })
      return
    }

    const lat = row.lat ? parseFloat(row.lat) : null
    const lng = row.lng ? parseFloat(row.lng) : null

    if (row.lat && isNaN(lat!)) {
      errors.push({ row: rowNum, reason: 'Invalid lat value' })
      return
    }
    if (row.lng && isNaN(lng!)) {
      errors.push({ row: rowNum, reason: 'Invalid lng value' })
      return
    }

    const curriculum = row.curriculum
      ? row.curriculum
          .split('|')
          .map((c) => c.trim())
          .filter((c) => (CURRICULA as readonly string[]).includes(c))
      : null

    valid.push({
      name: row.name.trim(),
      country: row.country.trim(),
      city: row.city?.trim() || null,
      lat,
      lng,
      website: row.website?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      curriculum: curriculum && curriculum.length > 0 ? curriculum : null,
      source: row.source?.trim() || null,
      stage: 'New Lead',
    })
  })

  return { valid, errors }
}
