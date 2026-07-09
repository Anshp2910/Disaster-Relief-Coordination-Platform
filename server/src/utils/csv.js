export function escCsv(str) {
  if (typeof str !== 'string') str = String(str)
  const cleaned = str.replace(/"/g, '""')
  const prefix = /^[=+\-@|]/.test(cleaned) ? "'" : ''
  return `"${prefix}${cleaned}"`
}
