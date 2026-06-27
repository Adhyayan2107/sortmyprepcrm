const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const OUTPUT_DIR = path.join(__dirname, '..', 'Converted Leads')
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR)

const templateWb = XLSX.readFile(path.join(__dirname, '..', 'SortMyPrep CRM - Lead Import Template.xlsx'))
const templateWs = templateWb.Sheets[templateWb.SheetNames[0]]
const tmplRaw = XLSX.utils.sheet_to_json(templateWs, { header: 1, defval: '' })
const TMPL_H0 = tmplRaw[0]
const TMPL_H1 = tmplRaw[1]
const TMPL_LEN = Math.max(TMPL_H0.length, TMPL_H1.length)

function emptyRow() { return new Array(TMPL_LEN).fill('') }

function copyBlock(src, si, out, ti, len) {
  for (let i = 0; i < len; i++) out[ti + i] = src[si + i] || ''
}

function writeFile(name, rows) {
  const ws = XLSX.utils.aoa_to_sheet([TMPL_H0, TMPL_H1, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Leads')
  XLSX.writeFile(wb, path.join(OUTPUT_DIR, name + '.xlsx'))
  console.log(`✓ ${name}.xlsx — ${rows.length} rows`)
}

function readDataRows(filePath, sheetName) {
  const wb = XLSX.readFile(filePath)
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  return raw.slice(2).filter(r => r.some(v => v !== ''))
}

function mapLeadType(raw) {
  const t = String(raw || '').toLowerCase().trim()
  if (!t) return ''
  if (['tuition centre', 'tuition center', 'tuition centers', 'tutoring centre', 'tutoring center',
       'coaching center', 'coaching centre'].includes(t)) return 'Tuition Center'
  if (['individual teacher', 'individual teachers', 'private teacher', 'personal teacher',
       'tutors', 'tutor'].includes(t)) return 'Private Teacher'
  if (['school', 'schools', 'day school', 'day + boarding', 'boarding school',
       'day & boarding school', 'girls day school', 'residential / boarding',
       'day + week boarding'].includes(t)) return 'School'
  return raw
}

// Dubai — no Type col, all are training/tuition institutes
{
  const rows = readDataRows('Current Lead files/Leads - Dubai (1).xlsx', 'Sheet1').map(s => {
    const o = emptyRow()
    o[0] = 'Tuition Center'
    o[1] = s[0]; o[2] = s[1]
    o[3] = 'United Arab Emirates'; o[4] = 'Dubai'
    o[6] = s[2]; o[7] = s[3]; o[8] = s[4]; o[9] = s[5]
    o[10] = s[6]; o[11] = s[7]; o[12] = s[8]; o[13] = s[9]
    copyBlock(s, 10, o, 17, 8) // Whatsapp + subs
    copyBlock(s, 18, o, 25, 6) // Phone + subs
    o[31] = s[24]               // Email
    return o
  })
  writeFile('Dubai', rows)
}

// HongKong — has Type col
{
  const rows = readDataRows('Current Lead files/Leads - HongKong (1).xlsx', 'Sheet1').map(s => {
    const o = emptyRow()
    o[0] = mapLeadType(s[0]); o[1] = s[1]; o[2] = s[2]
    o[3] = 'Hong Kong'; o[4] = 'Hong Kong'
    o[6] = s[3]; o[7] = s[4]; o[8] = s[5]; o[9] = s[6]
    o[10] = s[7]; o[11] = s[8]; o[12] = s[9]; o[13] = s[10]
    copyBlock(s, 11, o, 17, 8)
    copyBlock(s, 19, o, 25, 6)
    o[31] = s[25]
    return o
  })
  writeFile('HongKong', rows)
}

// Qatar — has Type col ("Tutoring Centre") + 2 stray blank cols in source
{
  const rows = readDataRows('Current Lead files/Qatar (3).xlsx', 'Sheet1').map(s => {
    const o = emptyRow()
    o[0] = mapLeadType(s[0]); o[1] = s[1]; o[2] = s[2]
    o[3] = 'Qatar'
    o[6] = s[3]; o[7] = s[4]
    // s[5] blank, s[12] blank — skip both
    o[8] = s[6]; o[9] = s[7]; o[10] = s[8]; o[11] = s[9]
    o[12] = s[10]; o[13] = s[11]
    copyBlock(s, 13, o, 17, 8)
    copyBlock(s, 21, o, 25, 6)
    o[31] = s[27]
    return o
  })
  writeFile('Qatar', rows)
}

// Delhi — merged from two sources:
//   1. Leads - India.xlsx / Delhi: tuition centers + individual teachers
//   2. Tier 2 file / delhi: international/IB schools
{
  // Source 1: Leads India (tuition centers + individual teachers)
  const indiaRows = readDataRows('Current Lead files/Leads - India.xlsx', 'Delhi').map(s => {
    const o = emptyRow()
    o[0] = mapLeadType(s[0])  // "Tuition Centers" → "Tuition Center", "Individual Teachers" → "Private Teacher"
    o[1] = s[1]; o[2] = s[2]
    o[3] = 'India'; o[4] = 'Delhi'
    o[6] = s[4]  // Centre/Admin Number
    o[7] = s[7]  // Centre/Admin Email
    o[8] = s[8]; o[9] = s[9]; o[10] = s[10]; o[11] = s[11]
    o[12] = s[5] // Number of Teachers
    o[13] = s[6] // Category of Lead
    o[14] = s[3] // Center Website
    copyBlock(s, 12, o, 17, 8)
    copyBlock(s, 20, o, 25, 6)
    o[31] = s[26]
    return o
  })

  // Source 2: Tier 2 file delhi sheet (international IB schools)
  const tier2Wb = XLSX.readFile(path.join(__dirname, '..', 'Current Lead files', 'Tier 2_ International_IB_Schools_India.xlsx'))
  const tier2Raw = XLSX.utils.sheet_to_json(tier2Wb.Sheets['delhi'], { header: 1, defval: '' })
  const tier2DataRows = tier2Raw.slice(1).filter(r => r.some(v => v !== ''))

  // schoolCol=0, curriculumCol=5, websiteCol=8, nameCol=9, emailCol=11, linkedinCol=12, phoneCol=13
  let school = { name: '', website: '', curriculum: '' }
  const t2Rows = []
  tier2DataRows.forEach(r => {
    const schoolName = String(r[0] || '').trim()
    if (schoolName) {
      school = {
        name: schoolName,
        website: String(r[8] || '').trim(),
        curriculum: String(r[5] || '').trim(),
      }
    }
    const name = String(r[9] || '').trim()
    const email = String(r[11] || '').trim()
    const phone = String(r[13] || '').trim()
    const linkedin = String(r[12] || '').trim()
    if (!name && !email && !phone) return
    const out = emptyRow()
    out[0] = 'School'
    out[2] = school.name
    out[3] = 'India'; out[4] = 'Delhi'
    out[8] = name; out[9] = phone; out[10] = email; out[11] = linkedin
    out[14] = school.website
    out[15] = school.curriculum
    t2Rows.push(out)
  })

  writeFile('Delhi', [...indiaRows, ...t2Rows])
}
