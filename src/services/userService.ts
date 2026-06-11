import { createClient } from '@/lib/supabase'
import { AppUser } from '@/types/user.types'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export async function getCurrentUser(): Promise<ServiceResult<AppUser>> {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as AppUser }
}

export async function ensureUserProfile(
  id: string,
  name: string
): Promise<ServiceResult<AppUser>> {
  const supabase = createClient()

  const { data: existing } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', id)
    .single()

  if (existing) {
    return { success: true, data: existing as AppUser }
  }

  const { data, error } = await supabase
    .from(TABLES.USERS)
    .insert({ id, name, role: 'rep' })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data: data as AppUser }
}

export async function signOut(): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}
