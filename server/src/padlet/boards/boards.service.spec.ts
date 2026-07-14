import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { BoardRole } from '../../common/enums'
import { Board, BoardMember, BoardVisit, Comment, Notification, PollOption, PollVote, Post, PostLike, PostReaction } from '../../entities'
import { EventsGateway } from '../../gateway/events.gateway'
import { BoardsService } from './boards.service'

function mockFindResult(result: unknown[] = []) {
  const p = Promise.resolve(result) as any
  p.sort = jest.fn().mockResolvedValue(result)
  return p
}

const mockModel = () => ({
  find: jest.fn().mockImplementation(() => mockFindResult([])),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((v: any) => Promise.resolve({ ...v, id: v._id })),
  insertMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
  aggregate: jest.fn().mockResolvedValue([]),
})

const mockGateway = () => ({
  emitToBoard: jest.fn(),
  emitToUser: jest.fn(),
})

function makeBoard(overrides: Record<string, unknown> = {}): any {
  const data = { id: 'b1', title: 'Test Board', owner: 'alice', isPublic: false, password: '', layout: 'wall', ...overrides }
  return {
    ...data,
    toObject: jest.fn().mockReturnValue({ ...data }),
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this)
    }),
  }
}

function makeMember(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'm1', boardId: 'b1', username: 'alice', role: BoardRole.OWNER, ...overrides,
    save: jest.fn().mockImplementation(function (this: any) {
      return Promise.resolve(this)
    }),
  }
}

describe('BoardsService', () => {
  let service: BoardsService
  let boards: ReturnType<typeof mockModel>
  let members: ReturnType<typeof mockModel>
  let posts: ReturnType<typeof mockModel>
  let notifications: ReturnType<typeof mockModel>
  let gateway: ReturnType<typeof mockGateway>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: getModelToken(Board.name), useFactory: mockModel },
        { provide: getModelToken(BoardMember.name), useFactory: mockModel },
        { provide: getModelToken(BoardVisit.name), useFactory: mockModel },
        { provide: getModelToken(Post.name), useFactory: mockModel },
        { provide: getModelToken(Notification.name), useFactory: mockModel },
        { provide: getModelToken(PollOption.name), useFactory: mockModel },
        { provide: getModelToken(Comment.name), useFactory: mockModel },
        { provide: getModelToken(PostLike.name), useFactory: mockModel },
        { provide: getModelToken(PostReaction.name), useFactory: mockModel },
        { provide: getModelToken(PollVote.name), useFactory: mockModel },
        { provide: EventsGateway, useFactory: mockGateway },
      ],
    }).compile()

    service = module.get(BoardsService)
    boards = module.get(getModelToken(Board.name))
    members = module.get(getModelToken(BoardMember.name))
    posts = module.get(getModelToken(Post.name))
    notifications = module.get(getModelToken(Notification.name))
    gateway = module.get(EventsGateway)
  })


  describe('findAll', () => {
    it('returns empty array when user has no memberships', async () => {
      members.find.mockResolvedValue([])
      expect(await service.findAll('alice')).toEqual([])
    })

    it('returns boards with my_role and post_count', async () => {
      const membership = makeMember()
      members.find.mockResolvedValueOnce([membership]).mockResolvedValueOnce([membership])
      boards.find.mockReturnValue(mockFindResult([makeBoard()]))
      posts.aggregate.mockResolvedValue([{ _id: 'b1', count: 3 }])

      const result = await service.findAll('alice')

      expect(result).toHaveLength(1)
      expect(result[0].my_role).toBe(BoardRole.OWNER)
      expect(result[0].post_count).toBe(3)
    })
  })


  describe('findOne', () => {
    it('throws NotFoundException when board does not exist', async () => {
      boards.findOne.mockResolvedValue(null)
      await expect(service.findOne('b1', 'alice')).rejects.toThrow(NotFoundException)
    })

    it('returns board with my_role for a member', async () => {
      const board = makeBoard()
      boards.findOne.mockResolvedValue(board)
      members.find.mockResolvedValue([makeMember()])

      const result = await service.findOne('b1', 'alice')

      expect(result.my_role).toBe(BoardRole.OWNER)
    })

    it('returns board as VIEWER for public boards when user is not a member', async () => {
      const board = makeBoard({ isPublic: true })
      boards.findOne.mockResolvedValue(board)
      members.find.mockResolvedValue([])

      const result = await service.findOne('b1', 'stranger')

      expect(result.my_role).toBe(BoardRole.VIEWER)
    })

    it('throws ForbiddenException for private board when user is not a member', async () => {
      const board = makeBoard({ isPublic: false })
      boards.findOne.mockResolvedValue(board)
      members.find.mockResolvedValue([])

      await expect(service.findOne('b1', 'stranger')).rejects.toThrow(ForbiddenException)
    })
  })


  describe('create', () => {
    it('creates a board and an owner membership', async () => {
      const dto = { title: 'My Board', isPublic: false }
      boards.create.mockResolvedValue({ id: 'b1', ...dto, owner: 'alice' })
      members.create.mockResolvedValue({})

      await service.create(dto as any, 'alice')

      expect(boards.create).toHaveBeenCalled()
      expect(members.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: BoardRole.OWNER, username: 'alice' }),
      )
    })
  })


  describe('update', () => {
    it('throws NotFoundException when board does not exist', async () => {
      boards.findOne.mockResolvedValue(null)
      await expect(service.update('b1', {} as any, 'alice')).rejects.toThrow(NotFoundException)
    })

    it('updates board and emits event when owner', async () => {
      const board = makeBoard()
      boards.findOne.mockResolvedValue(board)

      await service.update('b1', { title: 'Updated' } as any, 'alice')

      expect(gateway.emitToBoard).toHaveBeenCalledWith('b1', 'board:updated', expect.any(Object))
    })

    it('throws ForbiddenException when viewer tries to update', async () => {
      const board = makeBoard({ owner: 'alice' })
      boards.findOne.mockResolvedValue(board)
      members.findOne.mockResolvedValue(makeMember({ username: 'bob', role: BoardRole.VIEWER }))

      await expect(service.update('b1', {} as any, 'bob')).rejects.toThrow(ForbiddenException)
    })
  })


  describe('remove', () => {
    it('deletes the board when user is owner', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(null)

      await service.remove('b1', 'alice')

      expect(boards.deleteOne).toHaveBeenCalledWith({ _id: 'b1' })
    })

    it('throws ForbiddenException when non-owner tries to delete', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember({ username: 'bob', role: BoardRole.WRITER }))

      await expect(service.remove('b1', 'bob')).rejects.toThrow(ForbiddenException)
    })

    it('throws NotFoundException when board does not exist', async () => {
      boards.findOne.mockResolvedValue(null)
      await expect(service.remove('b1', 'alice')).rejects.toThrow(NotFoundException)
    })
  })


  describe('resetPassword', () => {
    it('generates a new password and notifies members', async () => {
      const board = makeBoard()
      boards.findOne.mockResolvedValue(board)
      members.find.mockResolvedValue([
        makeMember(),
        makeMember({ id: 'm2', username: 'bob', role: BoardRole.WRITER }),
      ])
      const notif = { id: 'n1', username: 'bob', type: 'password_reset', message: '', boardId: 'b1', boardTitle: 'Test Board', read: false, createdAt: new Date() }
      notifications.create.mockResolvedValue(notif)

      const result = await service.resetPassword('b1', 'alice')

      expect(typeof result.password).toBe('string')
      expect(result.password).toHaveLength(6)
      expect(board.save).toHaveBeenCalled()
    })

    it('throws NotFoundException when board does not exist', async () => {
      boards.findOne.mockResolvedValue(null)
      await expect(service.resetPassword('b1', 'alice')).rejects.toThrow(NotFoundException)
    })

    it('throws ForbiddenException when non-owner tries to reset', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      await expect(service.resetPassword('b1', 'bob')).rejects.toThrow(ForbiddenException)
    })
  })


  describe('getMembers', () => {
    it('returns members of a board', async () => {
      const board = makeBoard()
      boards.findOne.mockResolvedValue(board)
      members.find.mockResolvedValue([makeMember()])

      const result = await service.getMembers('b1', 'alice')

      expect(result).toHaveLength(1)
    })
  })


  describe('addMember', () => {
    it('adds a new member and sends a notification', async () => {
      const board = makeBoard()
      boards.findOne.mockResolvedValue(board)
      members.findOne.mockResolvedValueOnce(null)
      const notif = { id: 'n1', username: 'bob', type: 'shared', message: '', boardId: 'b1', boardTitle: 'Test Board', read: false, createdAt: new Date() }
      notifications.create.mockResolvedValue(notif)

      await service.addMember('b1', 'bob', BoardRole.WRITER, 'alice')

      expect(members.create).toHaveBeenCalled()
      expect(gateway.emitToUser).toHaveBeenCalledWith('bob', 'notification:new', expect.any(Object))
    })

    it('updates role when member already exists', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      const existingMember = makeMember({ username: 'bob', role: BoardRole.VIEWER })
      members.findOne.mockResolvedValueOnce(existingMember)

      await service.addMember('b1', 'bob', BoardRole.WRITER, 'alice')

      expect(existingMember.save).toHaveBeenCalled()
      expect(existingMember.role).toBe(BoardRole.WRITER)
    })

    it('throws ForbiddenException when non-owner tries to add member', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember({ username: 'bob', role: BoardRole.WRITER }))

      await expect(service.addMember('b1', 'carol', BoardRole.VIEWER, 'bob')).rejects.toThrow(
        ForbiddenException,
      )
    })
  })


  describe('removeMember', () => {
    it('allows owner to remove a member', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember())
      members.deleteOne.mockResolvedValue({})

      await service.removeMember('b1', 'bob', 'alice')

      expect(members.deleteOne).toHaveBeenCalledWith({ boardId: 'b1', username: 'bob' })
    })

    it('allows a member to remove themselves', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember({ username: 'bob', role: BoardRole.WRITER }))
      members.deleteOne.mockResolvedValue({})

      await service.removeMember('b1', 'bob', 'bob')

      expect(members.deleteOne).toHaveBeenCalledWith({ boardId: 'b1', username: 'bob' })
    })

    it('throws ForbiddenException when non-owner tries to remove another member', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember({ username: 'carol', role: BoardRole.WRITER }))

      await expect(service.removeMember('b1', 'bob', 'carol')).rejects.toThrow(ForbiddenException)
    })
  })
})
