import { createClient } from '@/lib/supabase'
import { ScriptQuestion } from '@/types/script.types'
import { ServiceResult } from '@/types/api.types'

export async function getQuestionsByScript(scriptId: string): Promise<ServiceResult<ScriptQuestion[]>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('script_questions')
    .select('*')
    .eq('script_id', scriptId)
    .order('sort_order', { ascending: true })
  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export async function addQuestion(scriptId: string, question: string, answer: string): Promise<ServiceResult<ScriptQuestion>> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('script_questions')
    .select('*')
    .eq('script_id', scriptId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (existing?.sort_order ?? 0) + 1
  const { data, error } = await supabase
    .from('script_questions')
    .insert({ script_id: scriptId, question, answer: answer || null, sort_order: nextOrder })
    .select()
    .single()
  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

export async function deleteQuestion(id: string): Promise<ServiceResult<null>> {
  const supabase = createClient()
  const { error } = await supabase.from('script_questions').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  return { success: true, data: null }
}

export async function reorderQuestions(items: { id: string; sort_order: number }[]): Promise<ServiceResult<null>> {
  const supabase = createClient()
  await Promise.all(
    items.map((item) => supabase.from('script_questions').update({ sort_order: item.sort_order }).eq('id', item.id))
  )
  return { success: true, data: null }
}
