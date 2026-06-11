import { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { fetchWebsiteText, generateIntelBrief, saveIntelBrief } from '@/services/intelService'

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.leadId || !body?.website || !body?.name) {
    return Response.json({ success: false, error: 'leadId, website, and name are required' }, { status: 400 })
  }

  const { leadId, website, name } = body as { leadId: string; website: string; name: string }

  let websiteText: string
  try {
    websiteText = await fetchWebsiteText(website)
  } catch {
    return Response.json({ success: false, error: 'Could not fetch website content' }, { status: 422 })
  }

  const briefResult = await generateIntelBrief(name, websiteText)
  if (!briefResult.success) {
    return Response.json({ success: false, error: briefResult.error }, { status: 500 })
  }

  const saveResult = await saveIntelBrief(supabase, leadId, briefResult.data)
  if (!saveResult.success) {
    return Response.json({ success: false, error: saveResult.error }, { status: 500 })
  }

  return Response.json({ success: true, data: saveResult.data })
}
