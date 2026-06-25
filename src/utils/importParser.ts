import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { LeadInsert } from '@/types/lead.types'
import { CURRICULA, LeadType } from '@/lib/constants'
import { PipelineStage } from '@/lib/constants'

// Maps lowercase column header → internal field name
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

  // lead type (new explicit column)
  'lead type': 'type_col',

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

  // sheet-specific columns merged into notes
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

const LEAD_TYPE_MAP: Record<string, LeadType> = {
  school: 'School',
  schools: 'School',
  'tuition center': 'Tuition Center',
  'tuition centre': 'Tuition Center',
  'coaching center': 'Tuition Center',
  'coaching centre': 'Tuition Center',
  tuition: 'Tuition Center',
  coaching: 'Tuition Center',
  'personal teacher': 'Private Teacher',
  'private teacher': 'Private Teacher',
  teacher: 'Private Teacher',
  tutors: 'Private Teacher',
  tutor: 'Private Teacher',
  aggregator: 'Aggregators',
  aggregators: 'Aggregators',
  directory: 'Aggregators',
  directories: 'Aggregators',
  platform: 'Aggregators',
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
  geocodable: number
}

export interface ImportOptions {
  defaultCountry?: string
  defaultLeadType?: LeadType | null
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

  const mainHeaders = raw[0].map(v => (v == null ? '' : String(v).trim()))

  // Detect sub-header row: if row 1 has empty primary columns (0-4), skip it
  let subHeaders: string[] = []
  let dataStart = 1
  if (raw.length > 1) {
    const row1Primary = raw[1].slice(0, 5).filter(v => v != null && String(v).trim() !== '')
    if (row1Primary.length === 0) {
      subHeaders = raw[1].map(v => (v == null ? '' : String(v).trim()))
      dataStart = 2
    }
  }

  // Build column-index → internal-field map from COL_ALIAS
  const colMap: Record<number, string> = {}
  mainHeaders.forEach((h, i) => {
    const alias = COL_ALIAS[h.toLowerCase()]
    if (alias) colMap[i] = alias
  })

  // Detect outreach column groups for counting
  const outreach = detectOutreachGroups(mainHeaders, subHeaders)

  const rows = raw.slice(dataStart).map(row => {
    // Map recognized fields
    const obj = Object.fromEntries(
      Object.entries(colMap).map(([i, field]) => [
        field,
        row[+i] == null ? '' : String(row[+i]).trim(),
      ])
    ) as Record<string, string>

    // Count outreach activity from filled cells (skip Comments columns)
    obj._message_count = String(
      outreach.messageIndices.filter(i => row[i] != null && String(row[i]).trim() !== '').length
    )
    obj._call_count = String(
      outreach.callIndices.filter(i => row[i] != null && String(row[i]).trim() !== '').length
    )
    obj._email_count = String(
      outreach.emailIndices.filter(i => row[i] != null && String(row[i]).trim() !== '').length
    )

    return obj
  })

  return transformRows(rows, dataStart + 1, options)
}

// Detect which column indices belong to each outreach group.
// Groups are identified by main-header keywords; Comments sub-columns are excluded.
function detectOutreachGroups(mainHeaders: string[], subHeaders: string[]) {
  const main = mainHeaders.map(h => h.toLowerCase())
  const sub = subHeaders.map(h => h.toLowerCase())

  let msgStart = -1
  let callStart = -1
  let emailStart = -1

  main.forEach((h, i) => {
    if (h.includes('whatsapp') || h === 'messages') msgStart = i
    else if (h === 'phone call' || h === 'calls' || h === 'phone calls') callStart = i
    else if (h.includes('email')) emailStart = i
  })

  // Boundaries: next non-empty main header after each group start
  const boundaries = main
    .map((h, i) => (h !== '' ? i : -1))
    .filter(i => i >= 0)
    .concat(main.length)

  function nextBoundary(start: number): number {
    return boundaries.find(b => b > start) ?? main.length
  }

  function countableIndices(start: number): number[] {
    if (start < 0) return []
    const end = nextBoundary(start)
    const indices: number[] = []
    for (let i = start; i < end; i++) {
      if (!sub[i]?.includes('comment')) indices.push(i)
    }
    return indices
  }

  return {
    messageIndices: countableIndices(msgStart),
    callIndices: countableIndices(callStart),
    emailIndices: countableIndices(emailStart),
  }
}

// ─── CSV ─────────────────────────────────────────────────────────────────────

function parseCsv(file: File, options: ImportOptions): Promise<ParsedImportResult> {
  return new Promise(resolve => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
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
  let missingCountry = 0

  rows.forEach((row, idx) => {
    const rowNum = startRow + idx

    // Skip blank rows — ignore internal _prefixed fields added by xlsx parser
    const dataValues = Object.entries(row)
      .filter(([k]) => !k.startsWith('_'))
      .map(([, v]) => v)
    if (dataValues.every(v => v === '' || v == null)) return

    const name = row.name?.trim()
    if (!name) return // truly no name and non-empty row is an empty/filler row — skip silently

    const country = row.country?.trim() || options.defaultCountry?.trim() || ''
    if (!country) {
      missingCountry++
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

    if (!lat && !lng) geocodable++

    // Stage
    const stage: PipelineStage =
      STAGE_MAP[row.stage?.trim().toLowerCase() ?? ''] ?? 'New Lead'

    // Curriculum (pipe-separated, validated)
    const curricula = row.curriculum
      ?.split('|')
      .map(c => c.trim())
      .filter(c => (CURRICULA as readonly string[]).includes(c))
    const curriculum = curricula?.length ? curricula : null

    // Outreach counts (from xlsx group detection, 0 for CSV)
    const call_count = parseInt(row._call_count ?? '0') || 0
    const message_count = parseInt(row._message_count ?? '0') || 0
    const email_count = parseInt(row._email_count ?? '0') || 0

    // Resolve lead_type: explicit column first, then fall back to import-page default
    const rawType = (row.type_col || row.category_of_lead || '').toLowerCase().trim()
    const lead_type: LeadType | null = LEAD_TYPE_MAP[rawType] ?? options.defaultLeadType ?? null

    // Build structured notes from sheet-specific columns
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
      lead_type,
      notes: noteParts.length ? noteParts.join('\n') : null,
      call_count,
      message_count,
      email_count,
    })
  })

  if (missingCountry > 0) {
    errors.unshift({ row: -1, reason: `Country not added — set a Default Country above (${missingCountry} rows skipped)` })
  }

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
