import { PipelineStage } from '@/types/pipeline.types'
import { getStageBgClass } from '@/utils/stageColors'

interface StageBadgeProps {
  stage: PipelineStage
}

export default function StageBadge({ stage }: StageBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${getStageBgClass(stage)}`}>
      {stage}
    </span>
  )
}
