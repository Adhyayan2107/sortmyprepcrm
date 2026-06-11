import { SupabaseClient } from '@supabase/supabase-js'
import claude from '@/lib/claude'
import { Lead } from '@/types/lead.types'
import { ServiceResult } from '@/types/api.types'

const INTEL_SYSTEM_PROMPT = `You are a research assistant for a sales team that sells services to IB/IGCSE coaching centers.
Given the following website content from a coaching center, extract and return a structured brief with:
1. What subjects/curricula they offer (IB, IGCSE, A-Levels, etc.)
2. Who their students are (age groups, levels)
3. How long they appear to have been operating
4. Their teaching format (online, in-person, hybrid)
5. Any social media or contact details found
6. Overall tone and positioning (premium, affordable, academic, etc.)
7. Any red flags or notes relevant to a sales call

Be concise. Return as plain text with clear headings. Max 300 words.`

export async function fetchWebsiteText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SortMyCRM/1.0)' },
    signal: AbortSignal.timeout(10000),
  })
  const html = await res.text()
  const clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.slice(0, 4000)
}

export async function generateIntelBrief(
  name: string,
  websiteText: string
): Promise<ServiceResult<string>> {
  try {
    const message = await claude.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: INTEL_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Company name: ${name}\n\nWebsite content:\n${websiteText}`,
        },
      ],
    })
    const content = message.content[0]
    if (content.type !== 'text') return { success: false, error: 'Unexpected response type' }
    return { success: true, data: content.text }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Claude API error' }
  }
}

export async function saveIntelBrief(
  supabase: SupabaseClient,
  leadId: string,
  brief: string
): Promise<ServiceResult<Lead>> {
  const { data, error } = await supabase
    .from('leads')
    .update({
      intel_brief: brief,
      intel_fetched_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: data as Lead }
}
