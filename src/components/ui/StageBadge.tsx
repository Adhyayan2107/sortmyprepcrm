import { PipelineStage } from '@/lib/constants'

interface StageBadgeProps {
  stage: PipelineStage
}

const STAGE_STYLES: Record<PipelineStage, { bg: string; text: string; dot: string }> = {
  'New Lead':       { bg: 'rgba(148,163,184,0.12)', text: '#64748B', dot: '#94A3B8' },
  'Contacted':      { bg: 'rgba(96,165,250,0.12)',  text: '#2563EB', dot: '#60A5FA' },
  'Responded':      { bg: 'rgba(56,189,248,0.12)',  text: '#0284C7', dot: '#38BDF8' },
  'Meeting Booked': { bg: 'rgba(251,191,36,0.15)',  text: '#B45309', dot: '#FBBF24' },
  'Meeting Done':   { bg: 'rgba(251,146,60,0.12)',  text: '#C2410C', dot: '#FB923C' },
  'Negotiating':    { bg: 'rgba(167,139,250,0.12)', text: '#7C3AED', dot: '#A78BFA' },
  'Confirmed':      { bg: 'rgba(52,211,153,0.12)',  text: '#059669', dot: '#34D399' },
  'Blocked/Dead':   { bg: 'rgba(248,113,113,0.12)', text: '#DC2626', dot: '#F87171' },
}

export default function StageBadge({ stage }: StageBadgeProps) {
  const styles = STAGE_STYLES[stage] ?? STAGE_STYLES['New Lead']

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: styles.bg, color: styles.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: styles.dot }}
      />
      {stage}
    </span>
  )
}
