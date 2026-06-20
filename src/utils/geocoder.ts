import { LeadInsert } from '@/types/lead.types'

export async function batchGeocode(
  leads: LeadInsert[],
  onProgress: (done: number, total: number) => void
): Promise<LeadInsert[]> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return leads

  // Only geocode rows that have no coords but do have at least city or country
  const targets = leads
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => !l.lat && !l.lng && (l.city || l.country))

  const total = targets.length
  if (!total) return leads

  const result = [...leads]
  let done = 0

  // Process 5 at a time; small delay between batches to avoid rate-limiting
  for (let b = 0; b < targets.length; b += 5) {
    const batch = targets.slice(b, b + 5)
    await Promise.all(
      batch.map(async ({ l, i }) => {
        const query = [l.city, l.country].filter(Boolean).join(', ')
        try {
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=1`
          const res = await fetch(url)
          const data = await res.json()
          if (data.features?.[0]?.center) {
            const [lng, lat] = data.features[0].center as [number, number]
            result[i] = { ...result[i], lat, lng }
          }
        } catch {
          // silent — lead imports without coords, can be fixed later
        }
        done++
        onProgress(done, total)
      })
    )
    if (b + 5 < targets.length) {
      await new Promise(r => setTimeout(r, 200))
    }
  }

  return result
}
