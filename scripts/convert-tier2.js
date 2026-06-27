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

const SKIP = ['Summary', 'Bangalore', 'delhi']

const wb = XLSX.readFile(path.join(__dirname, '..', 'Current Lead files', 'Tier 2_ International_IB_Schools_India.xlsx'))

wb.SheetNames.filter(s => !SKIP.includes(s)).forEach(sheetName => {
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' })
  const headers = raw[0]
  const dataRows = raw.slice(1).filter(r => r.some(v => v !== ''))

  // Detect format by header shape
  let schoolCol, websiteCol, curriculumCol, typeCol, nameCol, emailCol, linkedinCol, phoneCol
  if (headers[0].trim() === '') {
    // Delhi: School Name is col 0 (header is a space)
    schoolCol = 0; curriculumCol = 5; typeCol = 7; websiteCol = 8
    nameCol = 9; emailCol = 11; linkedinCol = 12; phoneCol = 13
  } else if (String(headers[7] || '').toLowerCase().includes('first')) {
    // Indore: has "first name" col at 7, full Name at 8
    schoolCol = 1; curriculumCol = 3; typeCol = 5; websiteCol = 6
    nameCol = 8; emailCol = 10; linkedinCol = 11; phoneCol = 12
  } else {
    // Standard: Nagpur, Chandigarh, Kolkata, Hyderabad, Chennai, Pune
    schoolCol = 1; curriculumCol = 3; typeCol = 5; websiteCol = 6
    nameCol = 7; emailCol = 9; linkedinCol = 10; phoneCol = 11
  }

  const city = sheetName.charAt(0).toUpperCase() + sheetName.slice(1)
  const rows = []
  let school = { name: '', website: '', curriculum: '', type: '' }

  dataRows.forEach(r => {
    const schoolName = String(r[schoolCol] || '').trim()
    if (schoolName) {
      school = {
        name: schoolName,
        website: String(r[websiteCol] || '').trim(),
        curriculum: String(r[curriculumCol] || '').trim(),
        type: String(r[typeCol] || '').trim(),
      }
    }

    const name = String(r[nameCol] || '').trim()
    const email = String(r[emailCol] || '').trim()
    const phone = String(r[phoneCol] || '').trim()
    const linkedin = String(r[linkedinCol] || '').trim()

    if (!name && !email && !phone) return // no contact data, skip

    const out = emptyRow()
    out[0] = 'School'           // Type — all Tier 2 entries are international/IB schools
    out[2] = school.name        // Name of Center
    out[3] = 'India'
    out[4] = city
    out[8] = name               // Founder Name
    out[9] = phone              // Founder Number
    out[10] = email             // Founder Email
    out[11] = linkedin          // Founder Linkedin
    out[14] = school.website    // Website
    out[15] = school.curriculum // Curriculum
    rows.push(out)
  })

  const ws = XLSX.utils.aoa_to_sheet([TMPL_H0, TMPL_H1, ...rows])
  const outWb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(outWb, ws, 'Leads')
  XLSX.writeFile(outWb, path.join(OUTPUT_DIR, city + '.xlsx'))
  console.log(`✓ ${city}.xlsx — ${rows.length} rows`)
})
