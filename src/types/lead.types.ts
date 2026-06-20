import { PipelineStage } from './pipeline.types'

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
  assigned_to: string | null
  notes: string | null
  intel_brief: string | null
  intel_fetched_at: string | null
  intel_annotation: string | null
  call_count: number
  message_count: number
  email_count: number
  created_at: string
  last_activity: string
}

export interface LeadMapPin {
  id: string
  name: string
  lat: number
  lng: number
  stage: PipelineStage
  country: string
  city: string | null
}

export interface LeadListRow {
  id: string
  name: string
  country: string
  city: string | null
  stage: PipelineStage
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
  notes?: string | null
  call_count?: number
  message_count?: number
  email_count?: number
}

export interface CSVRow {
  name: string
  country: string
  city?: string
  lat?: string
  lng?: string
  website?: string
  phone?: string
  email?: string
  curriculum?: string
  source?: string
}
