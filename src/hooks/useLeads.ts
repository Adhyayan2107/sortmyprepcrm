'use client'

import { useEffect, useState, useCallback } from 'react'
import { LeadListRow, LeadMapPin } from '@/types/lead.types'
import { getAllLeadPins, getAllLeadRows } from '@/services/leadService'
import { createClient } from '@/lib/supabase'

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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('leads-pins-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { fetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

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

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('leads-rows-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => { fetch() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetch])

  // Re-fetch when the tab regains visibility (e.g. returning from call page)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetch() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetch])

  return { rows, loading, error, refetch: fetch }
}
