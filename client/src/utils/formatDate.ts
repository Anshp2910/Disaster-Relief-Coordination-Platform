export function formatDate(d: string | number | Date | null | undefined, locale?: string): string {
  if (d == null || d === '') return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString(locale || 'en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
