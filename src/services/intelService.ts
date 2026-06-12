import { SupabaseClient } from '@supabase/supabase-js'
import { generateCompletion } from '@/lib/aiProvider'
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

Be concise and specific — use only what's actually on the website, don't guess. Return as plain text with clear headings. Max 400 words.`

export async function fetchWebsiteText(url: string): Promise<string> {
  // Jina Reader renders JS-heavy pages and returns clean text
  const jinaUrl = `https://r.jina.ai/${url}`
  const res = await fetch(jinaUrl, {
    headers: {
      'Accept': 'text/plain',
      'X-Timeout': '20',
    },
    signal: AbortSignal.timeout(25000),
  })
  if (!res.ok) throw new Error(`Jina fetch failed: ${res.status}`)
  const text = await res.text()
  return text.slice(0, 6000)
}

export async function generateIntelBrief(
  name: string,
  websiteText: string
): Promise<ServiceResult<string>> {
  try {
    const text = await generateCompletion(
      INTEL_SYSTEM_PROMPT,
      `Company name: ${name}\n\nWebsite content:\n${websiteText}`
    )
    return { success: true, data: text }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'AI provider error' }
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
