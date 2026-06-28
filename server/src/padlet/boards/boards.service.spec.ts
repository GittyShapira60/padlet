import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BoardRole } from '../../common/enums'
import { Board, BoardMember, BoardVisit, Notification, Post } from '../../entities'
import { EventsGateway } from '../../gateway/events.gateway'
import { BoardsService } from './boards.service'

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve(v)),
  delete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
})

const mockGateway = () => ({
  emitToBoard: jest.fn(),
  emitToUser: jest.fn(),
})

function makeBoard(overrides: Partial<Board> = {}): Board {
  return { id: 'b1', title: 'Test Board', owner: 'alice', isPublic: false, password: '', members: [], ...overrides } as Board
}

function makeMember(overrides: Partial<BoardMember> = {}): BoardMember {
  return { id: 'm1', boardId: 'b1', username: 'alice', role: BoardRole.OWNER, ...overrides } as BoardMember
}

describe('BoardsService', () => {
  let service: BoardsService
  let boards: ReturnType<typeof mockRepo>
  let members: ReturnType<typeof mockRepo>
  let posts: ReturnType<typeof mockRepo>
  let notifications: ReturnType<typeof mockRepo>
  let boardVisits: ReturnType<typeof mockRepo>
  let gateway: ReturnType<typeof mockGateway>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: getRepositoryToken(Board), useFactory: mockRepo },
        { provide: getRepositoryToken(BoardMember), useFactory: mockRepo },
        { provide: getRepositoryToken(BoardVisit), useFactory: mockRepo },
        { provide: getRepositoryToken(Post), useFactory: mockRepo },
        { provide: getRepositoryToken(Notification), useFactory: mockRepo },
        { provide: EventsGateway, useFactory: mockGateway },
      ],
    }).compile()

    service = module.get(BoardsService)
    boards = module.get(getRepositoryToken(Board))
    members = module.get(getRepositoryToken(BoardMember))
    posts = module.get(getRepositoryToken(Post))
    notifications = module.get(getRepositoryToken(Notification))
    boardVisits = module.get(getRepositoryToken(BoardVisit))
    gateway = module.get(EventsGateway)
  })


  describe('findAll', () => {
    it('returns empty array when user has no memberships', async () => {
      members.find.mockResolvedValue([])
      expect(await service.findAll('alice')).toEqual([])
    })

    it('returns boards with my_role and post_count', async () => {
      const membership = makeMember()
      members.find.mockResolvedValue([membership])

      const qb = {
        whereInIds: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeBoard()]),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ boardId: 'b1', count: '3' }]),
      }
      boards.createQueryBuilder.mockReturnValue(qb)
      posts.createQueryBuilder.mockReturnValue(qb)

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
      const board = makeBoard({ members: [makeMember()] })
      boards.findOne.mockResolvedValue(board)

      const result = await service.findOne('b1', 'alice')

      expect(result.my_role).toBe(BoardRole.OWNER)
    })

    it('returns board as VIEWER for public boards when user is not a member', async () => {
      const board = makeBoard({ isPublic: true, members: [] })
      boards.findOne.mockResolvedValue(board)
      members.findOne.mockResolvedValue(null)

      const result = await service.findOne('b1', 'stranger')

      expect(result.my_role).toBe(BoardRole.VIEWER)
    })

    it('throws ForbiddenException for private board when user is not a member', async () => {
      const board = makeBoard({ isPublic: false, members: [] })
      boards.findOne.mockResolvedValue(board)
      members.findOne.mockResolvedValue(null)

      await expect(service.findOne('b1', 'stranger')).rejects.toThrow(ForbiddenException)
    })
  })


  describe('create', () => {
    it('creates a board and an owner membership', async () => {
      const dto = { title: 'My Board', isPublic: false }
      boards.save.mockResolvedValue({ id: 'b1', ...dto, owner: 'alice' })
      members.save.mockResolvedValue({})

      await service.create(dto as any, 'alice')

      expect(boards.save).toHaveBeenCalled()
      expect(members.save).toHaveBeenCalledWith(
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
      boards.save.mockResolvedValue({ ...board, title: 'Updated' })

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

      expect(boards.delete).toHaveBeenCalledWith('b1')
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
      notifications.save.mockResolvedValue(notif)
      notifications.create.mockReturnValue(notif)

      const result = await service.resetPassword('b1', 'alice')

      expect(typeof result.password).toBe('string')
      expect(result.password).toHaveLength(6)
      expect(boards.save).toHaveBeenCalled()
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
      const board = makeBoard({ members: [makeMember()] })
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
      notifications.save.mockResolvedValue(notif)
      notifications.create.mockReturnValue(notif)

      await service.addMember('b1', 'bob', BoardRole.WRITER, 'alice')

      expect(members.save).toHaveBeenCalled()
      expect(gateway.emitToUser).toHaveBeenCalledWith('bob', 'notification:new', expect.any(Object))
    })

    it('updates role when member already exists', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValueOnce(makeMember({ username: 'bob', role: BoardRole.VIEWER })) 
      members.save.mockResolvedValue({})

      await service.addMember('b1', 'bob', BoardRole.WRITER, 'alice')

      expect(members.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: BoardRole.WRITER }),
      )
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
      members.delete = jest.fn().mockResolvedValue({})

      await service.removeMember('b1', 'bob', 'alice')

      expect(members.delete).toHaveBeenCalledWith({ boardId: 'b1', username: 'bob' })
    })

    it('allows a member to remove themselves', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember({ username: 'bob', role: BoardRole.WRITER }))
      members.delete = jest.fn().mockResolvedValue({})

      await service.removeMember('b1', 'bob', 'bob')

      expect(members.delete).toHaveBeenCalledWith({ boardId: 'b1', username: 'bob' })
    })

    it('throws ForbiddenException when non-owner tries to remove another member', async () => {
      boards.findOne.mockResolvedValue(makeBoard())
      members.findOne.mockResolvedValue(makeMember({ username: 'carol', role: BoardRole.WRITER }))

      await expect(service.removeMember('b1', 'bob', 'carol')).rejects.toThrow(ForbiddenException)
    })
  })
})
