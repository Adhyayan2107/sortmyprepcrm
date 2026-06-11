'use client'

import { useEffect, useState, useCallback } from 'react'
import { LeadListRow, LeadMapPin } from '@/types/lead.types'
import { getAllLeadPins, getAllLeadRows } from '@/services/leadService'

export function useLeadPins() {
  const [pins, setPins] = useState<LeadMapPin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getAllLeadPins()
    if (result.success) {
      setPins(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { pins, loading, error, refetch: fetch }
}

export function useLeadRows() {
  const [rows, setRows] = useState<LeadListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const result = await getAllLeadRows()
    if (result.success) {
      setRows(result.data)
    } else {
      setError(result.error)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { rows, loading, error, refetch: fetch }
}
