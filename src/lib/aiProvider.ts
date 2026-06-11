import Groq from 'groq-sdk'
import Anthropic from '@anthropic-ai/sdk'

// Switch provider by setting AI_PROVIDER=groq (default) or AI_PROVIDER=anthropic in .env.local
function getProvider(): 'groq' | 'anthropic' {
  return process.env.AI_PROVIDER === 'anthropic' ? 'anthropic' : 'groq'
}

export async function generateCompletion(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 600
): Promise<string> {
  const provider = getProvider()

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })
    const block = msg.content[0]
    if (block.type !== 'text') throw new Error('Unexpected Claude response type')
    return block.text
  }

  // groq (default)
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  })
  return completion.choices[0]?.message?.content ?? ''
}
