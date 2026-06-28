const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(length = 6): string {
  return Array.from(
    { length },
    () => PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)],
  ).join('')
}
