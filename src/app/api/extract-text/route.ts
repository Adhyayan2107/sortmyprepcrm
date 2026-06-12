import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return Response.json({ error: 'No file provided' }, { status: 400 })

  const name = file.name.toLowerCase()
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    if (name.endsWith('.pdf')) {
      // Use pdfjs-dist directly — pdf-parse wrapper needs worker config that fails in serverless
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
      pdfjs.GlobalWorkerOptions.workerSrc = ''
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer),
        disableStream: true,
        disableAutoFetch: true,
      })
      const doc = await loadingTask.promise
      let text = ''
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i)
        const content = await page.getTextContent()
        for (const item of content.items) {
          if ('str' in item) text += item.str + ' '
        }
        text += '\n'
      }
      await doc.destroy()
      return Response.json({ text: text.trim() })
    }

    if (name.endsWith('.docx') || name.endsWith('.doc')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      return Response.json({ text: result.value })
    }

    return Response.json({ error: 'Unsupported file type' }, { status: 400 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: `Failed to extract text: ${msg}` }, { status: 500 })
  }
}
