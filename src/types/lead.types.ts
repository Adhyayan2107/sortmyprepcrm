import { PipelineStage } from '@/lib/constants'
import { LeadType } from '@/lib/constants'

export interface Lead {
  id: string
  name: string
  country: string
  city: string | null
  lat: number | null
  lng: number | null
  website: string | null
  phone: string | null
  email: string | null
  curriculum: string[] | null
  source: string | null
  stage: PipelineStage
  lead_type: LeadType | null
  assigned_to: string | null
  notes: string | null
  intel_brief: string | null
  intel_fetched_at: string | null
  intel_annotation: string | null
  call_count: number
  message_count: number
  email_count: number
  next_callback: string | null
  next_action: string | null
  created_at: string
  last_activity: string
}

export interface LeadContact {
  id: string
  lead_id: string
  name: string | null
  designation: string | null
  phone: string | null
  email: string | null
  linkedin: string | null
  created_at: string
}

export type LeadContactInsert = Omit<LeadContact, 'id' | 'created_at'>

export interface LeadMapPin {
  id: string
  name: string
  lat: number
  lng: number
  stage: PipelineStage
  lead_type: LeadType | null
  country: string
  city: string | null
  assigned_to: string | null
}

export interface LeadListRow {
  id: string
  name: string
  country: string
  city: string | null
  stage: PipelineStage
  lead_type: LeadType | null
  curriculum: string[] | null
  source: string | null
  created_at: string
  assigned_to: string | null
}

export interface LeadInsert {
  name: string
  country: string
  city?: string | null
  lat?: number | null
  lng?: number | null
  website?: string | null
  phone?: string | null
  email?: string | null
  curriculum?: string[] | null
  source?: string | null
  stage: PipelineStage
  lead_type?: LeadType | null
  notes?: string | null
  call_count?: number
  message_count?: number
  email_count?: number
  // Stripped before DB insert — used only to carry contacts through the import pipeline
  _contacts?: Array<{
    name: string | null
    designation: string | null
    phone: string | null
    email: string | null
    linkedin: string | null
  }>
}

