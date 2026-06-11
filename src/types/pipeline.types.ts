import { PIPELINE_STAGES } from '@/lib/constants'

export type PipelineStage = (typeof PIPELINE_STAGES)[number]
