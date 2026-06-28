import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BoardVisit } from '../entities'
import { EventsGateway } from './events.gateway'

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve(v)),
})

function makeSocket(id = 'socket-1') {
  return {
    id,
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as any
}

describe('EventsGateway', () => {
  let gateway: EventsGateway
  let visitsRepo: ReturnType<typeof mockRepo>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EventsGateway,
        { provide: getRepositoryToken(BoardVisit), useFactory: mockRepo },
      ],
    }).compile()

    gateway = module.get(EventsGateway)
    visitsRepo = module.get(getRepositoryToken(BoardVisit))

    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
      sockets: {
        adapter: {
          rooms: new Map(),
        },
      },
    } as any
  })

  // ─── handleJoinBoard ──────────────────────────────────────────────────────────

  describe('handleJoinBoard', () => {
    it('joins board room and stores socket state when given a string boardId', () => {
      const client = makeSocket()

      gateway.handleJoinBoard(client, 'board-1')

      expect(client.join).toHaveBeenCalledWith('board:board-1')
    })

    it('stores username and start time when provided', () => {
      const client = makeSocket()
      jest.useFakeTimers()

      gateway.handleJoinBoard(client, { boardId: 'board-1', username: 'alice' })

      jest.runAllTimers()
      jest.useRealTimers()

      expect(client.join).toHaveBeenCalledWith('board:board-1')
    })
  })

  // ─── handleLeaveBoard ─────────────────────────────────────────────────────────

  describe('handleLeaveBoard', () => {
    it('saves a visit when user has been in the board for more than 2 seconds', async () => {
      const client = makeSocket()

      gateway.handleJoinBoard(client, { boardId: 'board-1', username: 'alice' })

      const startTime = new Date(Date.now() - 5000)
      ;(gateway as any).socketStartTime.set(client.id, startTime)

      gateway.handleLeaveBoard(client, 'board-1')

      await new Promise((r) => setTimeout(r, 10))
      expect(visitsRepo.save).toHaveBeenCalled()
    })

    it('does not save a visit for very short sessions (<=2 seconds)', () => {
      const client = makeSocket()

      gateway.handleJoinBoard(client, { boardId: 'board-1', username: 'alice' })

      const startTime = new Date(Date.now() - 1000)
      ;(gateway as any).socketStartTime.set(client.id, startTime)

      gateway.handleLeaveBoard(client, 'board-1')

      expect(visitsRepo.save).not.toHaveBeenCalled()
    })

    it('clears socket state after leaving', () => {
      const client = makeSocket()
      gateway.handleJoinBoard(client, { boardId: 'board-1', username: 'alice' })

      gateway.handleLeaveBoard(client, 'board-1')

      expect((gateway as any).socketBoardMap.has(client.id)).toBe(false)
      expect((gateway as any).socketUserMap.has(client.id)).toBe(false)
      expect((gateway as any).socketStartTime.has(client.id)).toBe(false)
    })
  })

  // ─── handleDisconnect ─────────────────────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('saves a visit on disconnect when session was long enough', async () => {
      const client = makeSocket()
      gateway.handleJoinBoard(client, { boardId: 'board-1', username: 'alice' })

      ;(gateway as any).socketStartTime.set(client.id, new Date(Date.now() - 10000))

      gateway.handleDisconnect(client)

      await new Promise((r) => setTimeout(r, 10))
      expect(visitsRepo.save).toHaveBeenCalled()
    })

    it('clears socket state on disconnect', () => {
      const client = makeSocket()
      gateway.handleJoinBoard(client, { boardId: 'board-1', username: 'alice' })
      gateway.handleDisconnect(client)

      expect((gateway as any).socketBoardMap.has(client.id)).toBe(false)
    })
  })

  // ─── handleUserJoin ───────────────────────────────────────────────────────────

  describe('handleUserJoin', () => {
    it('joins user-specific room', () => {
      const client = makeSocket()
      gateway.handleUserJoin(client, 'alice')
      expect(client.join).toHaveBeenCalledWith('user:alice')
    })
  })

  // ─── handlePostMove ───────────────────────────────────────────────────────────

  describe('handlePostMove', () => {
    it('broadcasts post:moved to other clients in the board room', () => {
      const client = makeSocket()

      gateway.handlePostMove(client, { postId: 'p1', x: 10, y: 20, boardId: 'board-1' })

      expect(client.to).toHaveBeenCalledWith('board:board-1')
      expect(client.emit).toHaveBeenCalledWith('post:moved', { postId: 'p1', x: 10, y: 20 })
    })
  })

  // ─── emitToBoard / emitToUser ─────────────────────────────────────────────────

  describe('emitToBoard', () => {
    it('emits an event to all clients in the board room', () => {
      gateway.emitToBoard('board-1', 'test:event', { data: 1 })
      expect(gateway.server.to).toHaveBeenCalledWith('board:board-1')
    })
  })

  describe('emitToUser', () => {
    it('emits an event to the user-specific room', () => {
      gateway.emitToUser('alice', 'test:event', { data: 1 })
      expect(gateway.server.to).toHaveBeenCalledWith('user:alice')
    })
  })
})
