import { formatDate } from './date.util'
import { mapNotification } from './notification.util'
import { generatePassword } from './random.util'
import { Notification } from '../../entities'

// ─── generatePassword ─────────────────────────────────────────────────────────

describe('generatePassword', () => {
  it('generates a password of the default length (6)', () => {
    const pwd = generatePassword()
    expect(pwd).toHaveLength(6)
  })

  it('generates a password of a custom length', () => {
    expect(generatePassword(8)).toHaveLength(8)
    expect(generatePassword(12)).toHaveLength(12)
  })

  it('only contains characters from the allowed set', () => {
    const allowed = new Set('ABCDEFGHJKLMNPQRSTUVWXYZ23456789')
    for (let i = 0; i < 50; i++) {
      const pwd = generatePassword()
      for (const ch of pwd) {
        expect(allowed.has(ch)).toBe(true)
      }
    }
  })

  it('generates different passwords on each call (probabilistic)', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generatePassword()))
    expect(passwords.size).toBeGreaterThan(1)
  })
})

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-03-15T12:00:00Z'))).toBe('2026-03-15')
  })

  it('returns a string value as-is', () => {
    expect(formatDate('2026-06-01')).toBe('2026-06-01')
  })

  it('handles end-of-day timestamps correctly', () => {
    expect(formatDate(new Date('2026-12-31T23:59:59.000Z'))).toBe('2026-12-31')
  })
})

// ─── mapNotification ─────────────────────────────────────────────────────────

describe('mapNotification', () => {
  const createdAt = new Date('2026-01-01')

  const notif: Notification = {
    id: 'n1',
    username: 'alice',
    type: 'shared',
    message: 'You have been shared',
    boardId: 'b1',
    boardTitle: 'My Board',
    read: false,
    createdAt,
  } as Notification

  it('maps all fields to snake_case response shape', () => {
    expect(mapNotification(notif)).toEqual({
      id: 'n1',
      username: 'alice',
      type: 'shared',
      message: 'You have been shared',
      board_id: 'b1',
      board_title: 'My Board',
      read: false,
      created_at: createdAt,
    })
  })

  it('preserves the read flag when true', () => {
    const read = { ...notif, read: true }
    expect(mapNotification(read).read).toBe(true)
  })

  it('maps null boardTitle to null', () => {
    const noTitle = { ...notif, boardTitle: null as any }
    expect(mapNotification(noTitle).board_title).toBeNull()
  })
})
