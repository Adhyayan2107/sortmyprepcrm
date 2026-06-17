import { NextRequest, NextResponse } from 'next/server'
import { generateCompletion } from '@/lib/aiProvider'
import { AnalyticsSummary } from '@/services/analyticsService'

export async function POST(req: NextRequest) {
  const { summary, repName }: { summary: AnalyticsSummary; repName?: string } = await req.json()

  const { kpi, outreachFunnel, repPerformance } = summary

  const funnelText = outreachFunnel
    .map((s) => `${s.label}: ${s.count}${s.rate !== null ? ` (${s.rate}% from prev step)` : ''}`)
    .join(' → ')

  const repText = repPerformance.length > 0
    ? repPerformance
        .map((r) => `${r.name}: ${r.assigned} assigned, ${r.emailed} emailed, ${r.called} called, ${r.confirmed} confirmed (${r.convRate}% conv)`)
        .join('\n')
    : 'No rep breakdown available.'

  const scope = repName ? `for rep: ${repName}` : 'across the whole team'

  const systemPrompt = `You are a sales analytics assistant for sortmyprep, an IB/IGCSE tutoring company selling to schools, coaching centers, and private teachers in the Middle East and Asia. Analyze the CRM data and give 3–4 short, actionable insights. Each insight must be one sentence, start with a bold action phrase (e.g. **Focus cold calling** or **Email follow-up gap**), and reference specific numbers. No fluff, no headers, no lists — just 3–4 newline-separated insights.`

  const userMessage = `Analytics ${scope}:
KPIs: ${kpi.assigned} assigned leads, ${kpi.contacted} contacted, ${kpi.confirmed} confirmed, ${kpi.conversionRate}% overall conversion.
Outreach funnel: ${funnelText}
Rep breakdown:
${repText}`

  try {
    const text = await generateCompletion(systemPrompt, userMessage, 400)
    const insights = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 4)
    return NextResponse.json({ insights })
  } catch (err) {
    console.error('Analytics insights error:', err)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
