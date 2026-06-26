import { createClient } from '@/lib/supabase'
import { LeadContact, LeadContactInsert } from '@/types/lead.types'
import { ServiceResult } from '@/types/api.types'
import { TABLES } from '@/lib/constants'

export async function getContactsByLeadId(leadId: string): Promise<ServiceResult<LeadContact[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEAD_CONTACTS)
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadContact[] }
}

export async function addContact(contact: LeadContactInsert): Promise<ServiceResult<LeadContact>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from(TABLES.LEAD_CONTACTS)
    .insert(contact)
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data: data as LeadContact }
}

export async function deleteContact(contactId: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase
    .from(TABLES.LEAD_CONTACTS)
    .delete()
    .eq('id', contactId)
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}
