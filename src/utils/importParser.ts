import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { LeadInsert } from '@/types/lead.types'
import { CURRICULA } from '@/lib/constants'
import { PipelineStage } from '@/types/pipeline.types'

// Maps any known column header variant (lowercase) → internal field name
const COL_ALIAS: Record<string, string> = {
  // name
  name: 'name',
  'name of center': 'name',
  'name of centre': 'name',
  'center name': 'name',
  'centre name': 'name',
  'school name': 'name',
  organization: 'name',
  organisation: 'name',

  // country
  country: 'country',

  // city
  city: 'city',
  location: 'city',

  // stage / status
  stage: 'stage',
  status: 'stage',
  'status of lead': 'stage',
  'lead status': 'stage',
  'pipeline stage': 'stage',

  // phone
  phone: 'phone',
  'centre / admin number': 'phone',
  'center / admin number': 'phone',
  'admin number': 'phone',
  'contact number': 'phone',
  'phone number': 'phone',
  'centre number': 'phone',
  'center number': 'phone',

  // email
  email: 'email',
  'centre / admin email': 'email',
  'center / admin email': 'email',
  'admin email': 'email',

  // website
  website: 'website',
  'website url': 'website',
  url: 'website',

  // curriculum
  curriculum: 'curriculum',

  // source
  source: 'source',
  'lead source': 'source',

  // coordinates
  lat: 'lat',
  latitude: 'lat',
  lng: 'lng',
  longitude: 'lng',

  // google maps link → extract coords
  google_maps_link: 'google_maps_link',
  'google maps link': 'google_maps_link',
  'maps link': 'google_maps_link',
  'google maps': 'google_maps_link',
  'maps url': 'google_maps_link',
  'google maps url': 'google_maps_link',
  'google map link': 'google_maps_link',

  // sheet-specific columns that get merged into notes
  type: 'type_col',
  'type of center': 'type_col',
  'type of centre': 'type_col',
  'founder name': 'founder_name',
  'founder number': 'founder_number',
  'founder email': 'founder_email',
  'founder linkedin': 'founder_linkedin',
  'number of teachers': 'num_teachers',
  'category of lead': 'category_of_lead',
  'lead category': 'category_of_lead',
}

const STAGE_MAP: Record<string, PipelineStage> = {
  'new lead': 'New Lead',
  new: 'New Lead',
  contacted: 'Contacted',
  responded: 'Responded',
  'meeting booked': 'Meeting Booked',
  'meeting done': 'Meeting Done',
  negotiating: 'Negotiating',
  confirmed: 'Confirmed',
  blocked: 'Blocked/Dead',
  dead: 'Blocked/Dead',
  'blocked/dead': 'Blocked/Dead',
  'blocked / dead': 'Blocked/Dead',
  lost: 'Blocked/Dead',
}

export interface ParsedImportResult {
  valid: LeadInsert[]
  errors: Array<{ row: number; reason: string }>
  geocodable: number // rows with city/country but no coords
}

export interface ImportOptions {
  defaultCountry?: string
}

export async function parseImportFile(
  file: File,
  options: ImportOptions = {}
): Promise<ParsedImportResult> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return parseXlsx(file, options)
  }
  return parseCsv(file, options)
}

// ─── XLSX ────────────────────────────────────────────────────────────────────

async function parseXlsx(file: File, options: ImportOptions): Promise<ParsedImportResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<(string | number | null)[]>(ws, {
    header: 1,
    defval: null,
  })

  if (!raw.length) {
    return { valid: [], errors: [{ row: 0, reason: 'Empty file' }], geocodable: 0 }
  }

  const headers = raw[0].map(v => (v == null ? '' : String(v).trim()))

  // Skip sub-header rows: if the first 5 primary columns of row 1 are all empty,
  // it's a continuation/sub-header row (like the follow-up tracking row in your sheet)
  let dataStart = 1
  if (raw.length > 1) {
    const row1Primary = raw[1].slice(0, 5).filter(v => v != null && String(v).trim() !== '')
    if (row1Primary.length === 0) dataStart = 2
  }

  // Build column-index → internal-field map
  const colMap: Record<number, string> = {}
  headers.forEach((h, i) => {
    const alias = COL_ALIAS[h.toLowerCase()]
    if (alias) colMap[i] = alias
  })

  const rows = raw.slice(dataStart).map(row =>
    Object.fromEntries(
      Object.entries(colMap).map(([i, field]) => [
        field,
        row[+i] == null ? '' : String(row[+i]).trim(),
      ])
    )
  )

  return transformRows(rows, dataStart + 1, options)
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

function parseCsv(file: File, options: ImportOptions): Promise<ParsedImportResult> {
  return new Promise(resolve => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      // Map header to alias; unknown headers pass through (ignored in transform)
      transformHeader: h => COL_ALIAS[h.trim().toLowerCase()] ?? h.trim().toLowerCase(),
      complete: res => resolve(transformRows(res.data, 2, options)),
      error: err =>
        resolve({ valid: [], errors: [{ row: 0, reason: err.message }], geocodable: 0 }),
    })
  })
}

// ─── Core transform ───────────────────────────────────────────────────────────

function transformRows(
  rows: Record<string, string>[],
  startRow: number,
  options: ImportOptions
): ParsedImportResult {
  const valid: LeadInsert[] = []
  const errors: Array<{ row: number; reason: string }> = []
  let geocodable = 0

  rows.forEach((row, idx) => {
    const rowNum = startRow + idx

    // Skip blank rows
    if (Object.values(row).every(v => v === '' || v == null)) return

    const name = row.name?.trim()
    if (!name) {
      errors.push({ row: rowNum, reason: 'Missing name' })
      return
    }

    const country = row.country?.trim() || options.defaultCountry?.trim() || ''
    if (!country) {
      errors.push({ row: rowNum, reason: 'No country — add a Country column or set Default Country above' })
      return
    }

    // Coords: Google Maps URL → regex extract; then explicit lat/lng columns
    let lat: number | null = null
    let lng: number | null = null

    if (row.google_maps_link) {
      const c = extractMapsCoords(row.google_maps_link)
      if (c) { lat = c.lat; lng = c.lng }
    }
    if (row.lat && !isNaN(parseFloat(row.lat))) lat = parseFloat(row.lat)
    if (row.lng && !isNaN(parseFloat(row.lng))) lng = parseFloat(row.lng)

    // Count rows that could be geocoded via Mapbox (have city or country, but no coords yet)
    if (!lat && !lng) geocodable++

    // Stage
    const stage: PipelineStage =
      STAGE_MAP[row.stage?.trim().toLowerCase() ?? ''] ?? 'New Lead'

    // Curriculum (pipe-separated, validated against known values)
    const curricula = row.curriculum
      ?.split('|')
      .map(c => c.trim())
      .filter(c => (CURRICULA as readonly string[]).includes(c))
    const curriculum = curricula?.length ? curricula : null

    // Build notes from extra sheet-specific columns
    const noteParts: string[] = []
    if (row.type_col) noteParts.push(`Type: ${row.type_col}`)
    if (row.category_of_lead) noteParts.push(`Category: ${row.category_of_lead}`)
    if (row.founder_name) noteParts.push(`Founder: ${row.founder_name}`)
    if (row.founder_number) noteParts.push(`Founder Phone: ${row.founder_number}`)
    if (row.founder_email) noteParts.push(`Founder Email: ${row.founder_email}`)
    if (row.founder_linkedin) noteParts.push(`Founder LinkedIn: ${row.founder_linkedin}`)
    if (row.num_teachers) noteParts.push(`No. of Teachers: ${row.num_teachers}`)

    valid.push({
      name,
      country,
      city: row.city?.trim() || null,
      lat,
      lng,
      website: row.website?.trim() || null,
      phone: row.phone?.trim() || null,
      email: row.email?.trim() || null,
      curriculum,
      source: row.source?.trim() || null,
      stage,
      notes: noteParts.length ? noteParts.join('\n') : null,
    })
  })

  return { valid, errors, geocodable }
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function extractMapsCoords(url: string): { lat: number; lng: number } | null {
  const patterns = [
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  ]
  for (const p of patterns) {
    const m = p.exec(url)
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }
  }
  return null
}
