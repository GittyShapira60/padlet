import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Notification } from '../../entities'
import { NotificationsService } from './notifications.service'

const mockRepo = () => ({
  find: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
})

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 'n1',
    username: 'alice',
    type: 'shared',
    message: 'You have been shared',
    boardId: 'b1',
    boardTitle: 'My Board',
    read: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as Notification
}

describe('NotificationsService', () => {
  let service: NotificationsService
  let repo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useFactory: mockRepo },
      ],
    }).compile()

    service = module.get(NotificationsService)
    repo = module.get(getRepositoryToken(Notification))
  })

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns mapped notifications for a user', async () => {
      repo.find.mockResolvedValue([makeNotif()])

      const result = await service.findAll('alice')

      expect(repo.find).toHaveBeenCalledWith({
        where: { username: 'alice' },
        order: { createdAt: 'DESC' },
        take: 50,
      })
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'n1',
        username: 'alice',
        type: 'shared',
        message: 'You have been shared',
        board_id: 'b1',
        board_title: 'My Board',
        read: false,
        created_at: new Date('2026-01-01'),
      })
    })

    it('returns empty array when user has no notifications', async () => {
      repo.find.mockResolvedValue([])
      const result = await service.findAll('alice')
      expect(result).toEqual([])
    })
  })

  // ─── markAllRead ──────────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marks all notifications as read for user', async () => {
      repo.update.mockResolvedValue({})

      const result = await service.markAllRead('alice')

      expect(repo.update).toHaveBeenCalledWith({ username: 'alice' }, { read: true })
      expect(result).toEqual({ ok: true })
    })
  })

  // ─── delete ───────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes a notification by id and username', async () => {
      repo.delete.mockResolvedValue({})

      await service.delete('n1', 'alice')

      expect(repo.delete).toHaveBeenCalledWith({ id: 'n1', username: 'alice' })
    })
  })
})
