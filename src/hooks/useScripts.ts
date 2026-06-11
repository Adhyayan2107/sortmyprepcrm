'use client'

import { useEffect, useState, useCallback } from 'react'
import { Script } from '@/types/script.types'
import { ContactType } from '@/types/script.types'
import { getScriptsByContactType } from '@/services/scriptService'

export function useScripts(contactType: ContactType) {
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getScriptsByContactType(contactType)
    if (result.success) {
      setScripts(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [contactType])

  useEffect(() => { fetch() }, [fetch])

  return { scripts, loading, error, refetch: fetch }
}
