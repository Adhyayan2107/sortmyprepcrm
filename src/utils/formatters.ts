export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurriculum(curriculum: string[] | null): string {
  if (!curriculum || curriculum.length === 0) return '—'
  return curriculum.join(', ')
}
