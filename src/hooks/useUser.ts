'use client'

import { useEffect, useState } from 'react'
import { AppUser } from '@/types/user.types'
import { getCurrentUser } from '@/services/userService'

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCurrentUser().then((result) => {
      if (result.success) setUser(result.data)
      setLoading(false)
    })
  }, [])

  return { user, loading }
}
