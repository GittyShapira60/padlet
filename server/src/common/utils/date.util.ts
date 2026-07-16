export function formatDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString().split('T')[0]
  return String(value)
}
