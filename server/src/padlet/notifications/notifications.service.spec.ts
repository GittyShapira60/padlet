import { Test } from '@nestjs/testing'
import { getModelToken } from '@nestjs/mongoose'
import { Notification } from '../../entities'
import { NotificationsService } from './notifications.service'

function makeFindQuery(result: unknown[]) {
  return {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  }
}

const mockModel = () => ({
  find: jest.fn(),
  updateMany: jest.fn(),
  deleteOne: jest.fn(),
})

function makeNotif(overrides: Partial<Notification> = {}): Notification {
  return {
    _id: 'n1',
    username: 'alice',
    type: 'shared',
    message: 'You have been shared',
    boardId: 'b1',
    boardTitle: 'My Board',
    read: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  } as unknown as Notification
}

describe('NotificationsService', () => {
  let service: NotificationsService
  let repo: ReturnType<typeof mockModel>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getModelToken(Notification.name), useFactory: mockModel },
      ],
    }).compile()

    service = module.get(NotificationsService)
    repo = module.get(getModelToken(Notification.name))
  })

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns mapped notifications for a user', async () => {
      const notif = makeNotif()
      repo.find.mockReturnValue(makeFindQuery([{ ...notif, id: notif._id }]))

      const result = await service.findAll('alice')

      expect(repo.find).toHaveBeenCalledWith({ username: 'alice' })
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
      repo.find.mockReturnValue(makeFindQuery([]))
      const result = await service.findAll('alice')
      expect(result).toEqual([])
    })
  })

  // ─── markAllRead ──────────────────────────────────────────────────────────────

  describe('markAllRead', () => {
    it('marks all notifications as read for user', async () => {
      repo.updateMany.mockResolvedValue({})

      const result = await service.markAllRead('alice')

      expect(repo.updateMany).toHaveBeenCalledWith({ username: 'alice' }, { $set: { read: true } })
      expect(result).toEqual({ ok: true })
    })
  })

  // ─── delete ───────────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('deletes a notification by id and username', async () => {
      repo.deleteOne.mockResolvedValue({})

      await service.delete('n1', 'alice')

      expect(repo.deleteOne).toHaveBeenCalledWith({ _id: 'n1', username: 'alice' })
    })
  })
})
