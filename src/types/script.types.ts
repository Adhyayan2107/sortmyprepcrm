import { CONTACT_TYPES } from '@/lib/constants'

export type ContactType = (typeof CONTACT_TYPES)[number]

export interface Script {
  id: string
  contact_type: ContactType
  title: string
  content: string | null
  usage_count: number
  created_by: string | null
  created_at: string
  archived: boolean
  avg_rating?: number
  rating_count?: number
}

export interface ScriptRating {
  id: string
  script_id: string
  rated_by: string | null
  rating: number
  note: string | null
  created_at: string
}

export interface ScriptInsert {
  contact_type: ContactType
  title: string
  content?: string
}

export interface ScriptUpdate {
  title?: string
  content?: string
  archived?: boolean
}
