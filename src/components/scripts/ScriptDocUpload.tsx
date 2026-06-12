'use client'

import { useRef, useState } from 'react'
import { uploadScriptDocument, removeScriptDocument } from '@/services/scriptService'

const ACCEPTED = '.pdf,.doc,.docx,.txt,.pptx,.ppt'

interface ScriptDocUploadProps {
  scriptId: string
  documentUrl: string | null
  documentName: string | null
  onUpdate: (url: string | null, name: string | null) => void
}

export default function ScriptDocUpload({
  scriptId,
  documentUrl,
  documentName,
  onUpdate,
}: ScriptDocUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB')
      return
    }
    setUploading(true)
    setError(null)
    const res = await uploadScriptDocument(scriptId, file)
    if (res.success) {
      onUpdate(res.data.url, res.data.name)
    } else {
      setError(res.error)
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleRemove() {
    setRemoving(true)
    const res = await removeScriptDocument(scriptId)
    if (res.success) onUpdate(null, null)
    else setError(res.error)
    setRemoving(false)
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Attached Document</p>

      {documentUrl && documentName ? (
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
          <svg className="w-8 h-8 text-[#2563EB] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{documentName}</p>
            <a
              href={documentUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[#2563EB] hover:underline"
            >
              Open / Download
            </a>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition-colors"
            >
              Replace
            </button>
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
            >
              {removing ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-200 text-slate-500 text-sm hover:border-[#2563EB] hover:text-[#2563EB] transition-colors w-full justify-center disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
          {uploading ? 'Uploading…' : 'Attach a document (PDF, DOC, DOCX, TXT, PPT)'}
        </button>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
