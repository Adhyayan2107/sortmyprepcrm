// Run with: node scripts/update-template.js
const XLSX = require('xlsx')
const path = require('path')

const TEMPLATE_PATH = path.join(__dirname, '../public/SortMyPrep CRM - Lead Import Template.xlsx')

const wb = XLSX.readFile(TEMPLATE_PATH)

// ── Leads sheet ──────────────────────────────────────────────────────────────

const ws = wb.Sheets['Leads']
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

// Insert "Lead Type" at column index 1 (after "Type", before "Status of Lead")
const INSERT_AT = 1

function insertAt(arr, idx, val) {
  const copy = [...arr]
  copy.splice(idx, 0, val)
  return copy
}

// Row 0 — main headers
rows[0] = insertAt(rows[0], INSERT_AT, 'Lead Type')

// Row 1 — sub-headers / hints
rows[1] = insertAt(rows[1], INSERT_AT, 'School / Tuition Center / Personal Teacher')

// Row 2 — example row
rows[2] = insertAt(rows[2], INSERT_AT, 'Tuition Center')

// Rebuild sheet from modified rows
const newWs = XLSX.utils.aoa_to_sheet(rows)

// Fix merge ranges — each merge that was at col ≥ INSERT_AT shifts right by 1
const oldMerges = ws['!merges'] ?? []
newWs['!merges'] = oldMerges.map((m) => ({
  s: { r: m.s.r, c: m.s.c >= INSERT_AT ? m.s.c + 1 : m.s.c },
  e: { r: m.e.r, c: m.e.c >= INSERT_AT ? m.e.c + 1 : m.e.c },
}))

// Set column widths (new Lead Type column gets 22 chars width)
// Original sheet had no !cols so we set sensible widths for all columns
const LEAD_TYPE_WIDTH = 22
newWs['!cols'] = [
  { wch: 22 },  // Type
  { wch: LEAD_TYPE_WIDTH }, // Lead Type (new)
  { wch: 16 },  // Status of Lead
  { wch: 28 },  // Name of Center
  { wch: 14 },  // Country
  { wch: 14 },  // City
  { wch: 36 },  // Google Maps Link
  { wch: 20 },  // Centre / Admin Number
  { wch: 26 },  // Centre / Admin Email
  { wch: 16 },  // Founder Name
  { wch: 18 },  // Founder Number
  { wch: 26 },  // Founder Email
  { wch: 30 },  // Founder LinkedIn
  { wch: 14 },  // Number of Teachers
  { wch: 20 },  // Category of Lead
  { wch: 30 },  // Website
  { wch: 30 },  // Curriculum
  { wch: 12 },  // Source
]

wb.Sheets['Leads'] = newWs

// ── Instructions sheet ───────────────────────────────────────────────────────

const instr = wb.Sheets['Instructions']
const instrRows = XLSX.utils.sheet_to_json(instr, { header: 1, defval: null })

// Find the line that starts OPTIONAL CRM COLUMNS and add Lead Type doc after it
const optIdx = instrRows.findIndex((r) => r[0] && String(r[0]).includes('OPTIONAL CRM COLUMNS'))
if (optIdx !== -1) {
  instrRows.splice(optIdx + 1, 0,
    ['  Lead Type        — One of: School | Tuition Center | Personal Teacher']
  )
}

// Add a STAGE VALUES note for Lead Type near the bottom
const stageIdx = instrRows.findIndex((r) => r[0] && String(r[0]).includes('STAGE VALUES'))
if (stageIdx !== -1) {
  instrRows.splice(stageIdx, 0,
    ['LEAD TYPE VALUES'],
    ['  School | Tuition Center | Personal Teacher'],
    ['']
  )
}

const newInstr = XLSX.utils.aoa_to_sheet(instrRows)
newInstr['!cols'] = [{ wch: 90 }]
wb.Sheets['Instructions'] = newInstr

// ── Save ─────────────────────────────────────────────────────────────────────

XLSX.writeFile(wb, TEMPLATE_PATH)
console.log('Template updated →', TEMPLATE_PATH)
console.log('New Leads headers:', rows[0].slice(0, 6).join(' | '))
