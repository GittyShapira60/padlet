import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { getModelToken } from '@nestjs/mongoose'
import { Test } from '@nestjs/testing'
import { BoardRole, PostType } from '../../common/enums'
import { Board, BoardMember, Comment, Notification, PollOption, PollVote, Post, PostLike, PostReaction } from '../../entities'
import { EventsGateway } from '../../gateway/events.gateway'
import { PostsService } from './posts.service'

function mockFindResult(result: unknown[] = []) {
  const p = Promise.resolve(result) as any
  p.sort = jest.fn().mockResolvedValue(result)
  return p
}

function withSave<T extends object>(obj: T): T & { save: jest.Mock } {
  const withSaveObj = obj as any
  withSaveObj.save = jest.fn().mockImplementation(function (this: any) {
    return Promise.resolve(this)
  })
  return withSaveObj
}

const mockModel = () => ({
  find: jest.fn().mockImplementation(() => mockFindResult([])),
  findOne: jest.fn(),
  create: jest.fn().mockImplementation((v: any) => Promise.resolve({ ...v, id: v._id })),
  insertMany: jest.fn(),
  deleteOne: jest.fn(),
  deleteMany: jest.fn(),
})

const mockGateway = () => ({
  emitToBoard: jest.fn(),
  emitToUser: jest.fn(),
})

function makePost(overrides: Partial<Post> = {}): any {
  return withSave({
    id: 'p1', boardId: 'b1', type: PostType.TEXT, content: 'Hello', author: 'alice',
    color: '#fff', x: 0, y: 0, width: 200, likes: 0,
    imageUrl: '', linkUrl: '', linkTitle: '', linkDescription: '', linkImage: '',
    editedBy: '', shape: 'rect', updatedAt: new Date(), createdAt: new Date(),
    ...overrides,
  })
}

function makeMember(overrides: Partial<BoardMember> = {}): BoardMember {
  return { id: 'm1', boardId: 'b1', username: 'alice', role: BoardRole.WRITER, ...overrides } as BoardMember
}

describe('PostsService', () => {
  let service: PostsService
  let postsRepo: ReturnType<typeof mockModel>
  let commentsRepo: ReturnType<typeof mockModel>
  let membersRepo: ReturnType<typeof mockModel>
  let notificationsRepo: ReturnType<typeof mockModel>
  let likesRepo: ReturnType<typeof mockModel>
  let reactionsRepo: ReturnType<typeof mockModel>
  let pollOptionsRepo: ReturnType<typeof mockModel>
  let pollVotesRepo: ReturnType<typeof mockModel>
  let boardsRepo: ReturnType<typeof mockModel>
  let gateway: ReturnType<typeof mockGateway>

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getModelToken(Post.name), useFactory: mockModel },
        { provide: getModelToken(Comment.name), useFactory: mockModel },
        { provide: getModelToken(BoardMember.name), useFactory: mockModel },
        { provide: getModelToken(Notification.name), useFactory: mockModel },
        { provide: getModelToken(PostLike.name), useFactory: mockModel },
        { provide: getModelToken(PostReaction.name), useFactory: mockModel },
        { provide: getModelToken(PollOption.name), useFactory: mockModel },
        { provide: getModelToken(PollVote.name), useFactory: mockModel },
        { provide: getModelToken(Board.name), useFactory: mockModel },
        { provide: EventsGateway, useFactory: mockGateway },
      ],
    }).compile()

    service = module.get(PostsService)
    postsRepo = module.get(getModelToken(Post.name))
    commentsRepo = module.get(getModelToken(Comment.name))
    membersRepo = module.get(getModelToken(BoardMember.name))
    notificationsRepo = module.get(getModelToken(Notification.name))
    likesRepo = module.get(getModelToken(PostLike.name))
    reactionsRepo = module.get(getModelToken(PostReaction.name))
    pollOptionsRepo = module.get(getModelToken(PollOption.name))
    pollVotesRepo = module.get(getModelToken(PollVote.name))
    boardsRepo = module.get(getModelToken(Board.name))
    gateway = module.get(EventsGateway)
  })

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns mapped posts for a board member', async () => {
      membersRepo.findOne.mockResolvedValue(makeMember())
      postsRepo.find.mockReturnValue(mockFindResult([makePost()]))

      const result = await service.findAll('b1', 'alice')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
      expect(result[0].liked_by_me).toBe(false)
    })

    it('throws ForbiddenException when user is not a member and board is private', async () => {
      membersRepo.findOne.mockResolvedValue(null)
      boardsRepo.findOne.mockResolvedValue({ id: 'b1', isPublic: false })

      await expect(service.findAll('b1', 'stranger')).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a post and emits post:created event', async () => {
      membersRepo.findOne.mockResolvedValue(makeMember())
      postsRepo.create.mockResolvedValue(makePost())

      const dto = { type: 'text', content: 'Hello' }
      await service.create('b1', dto as any, 'alice')

      expect(postsRepo.create).toHaveBeenCalled()
      expect(gateway.emitToBoard).toHaveBeenCalledWith('b1', 'post:created', expect.any(Object))
    })

    it('throws ForbiddenException when viewer tries to create a post', async () => {
      membersRepo.findOne.mockResolvedValue(makeMember({ role: BoardRole.VIEWER }))

      await expect(service.create('b1', {} as any, 'alice')).rejects.toThrow(ForbiddenException)
    })

    it('creates poll options when poll_options are provided', async () => {
      membersRepo.findOne.mockResolvedValue(makeMember())
      postsRepo.create.mockResolvedValue(makePost({ type: PostType.POLL }))
      pollOptionsRepo.insertMany.mockResolvedValue([
        { id: 'o1', optionText: 'Option A', sortOrder: 0 },
        { id: 'o2', optionText: 'Option B', sortOrder: 1 },
      ])

      const dto = { type: 'poll', content: 'Vote!', poll_options: ['Option A', 'Option B'] }
      const result = await service.create('b1', dto as any, 'alice')

      expect(pollOptionsRepo.insertMany).toHaveBeenCalled()
      expect(result.poll_options).toHaveLength(2)
    })
  })

  // ─── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('updates a post and emits post:updated event', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember())

      await service.update('p1', { content: 'Updated' } as any, 'alice')

      expect(gateway.emitToBoard).toHaveBeenCalledWith('b1', 'post:updated', expect.any(Object))
    })

    it('sets editedBy when content changes', async () => {
      const post = makePost()
      postsRepo.findOne.mockResolvedValue(post)
      membersRepo.findOne.mockResolvedValue(makeMember())

      await service.update('p1', { content: 'Changed' } as any, 'alice')

      expect(post.editedBy).toBe('alice')
    })

    it('throws ForbiddenException for commenter', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember({ role: BoardRole.COMMENTER }))

      await expect(service.update('p1', {} as any, 'alice')).rejects.toThrow(ForbiddenException)
    })

    it('throws NotFoundException when post does not exist', async () => {
      postsRepo.findOne.mockResolvedValue(null)
      await expect(service.update('p1', {} as any, 'alice')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('removes a post, cascades dependent documents, and emits post:deleted event', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember())
      postsRepo.deleteOne.mockResolvedValue({})

      await service.remove('p1', 'alice')

      expect(commentsRepo.deleteMany).toHaveBeenCalledWith({ postId: { $in: ['p1'] } })
      expect(likesRepo.deleteMany).toHaveBeenCalledWith({ postId: { $in: ['p1'] } })
      expect(reactionsRepo.deleteMany).toHaveBeenCalledWith({ postId: { $in: ['p1'] } })
      expect(pollVotesRepo.deleteMany).toHaveBeenCalledWith({ postId: { $in: ['p1'] } })
      expect(pollOptionsRepo.deleteMany).toHaveBeenCalledWith({ postId: { $in: ['p1'] } })
      expect(postsRepo.deleteOne).toHaveBeenCalledWith({ _id: 'p1' })
      expect(gateway.emitToBoard).toHaveBeenCalledWith('b1', 'post:deleted', 'p1')
    })

    it('throws ForbiddenException for viewer', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember({ role: BoardRole.VIEWER }))

      await expect(service.remove('p1', 'alice')).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── getComments ──────────────────────────────────────────────────────────────

  describe('getComments', () => {
    it('returns mapped comments', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember())
      commentsRepo.find.mockReturnValue(mockFindResult([
        { id: 'c1', postId: 'p1', content: 'Nice!', author: 'bob', createdAt: new Date() },
      ]))

      const result = await service.getComments('p1', 'alice')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('c1')
      expect(result[0].post_id).toBe('p1')
    })

    it('throws NotFoundException when post does not exist', async () => {
      postsRepo.findOne.mockResolvedValue(null)
      await expect(service.getComments('p1', 'alice')).rejects.toThrow(NotFoundException)
    })
  })

  // ─── addComment ───────────────────────────────────────────────────────────────

  describe('addComment', () => {
    it('adds a comment and emits comment:created event', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember({ username: 'bob' }))
      commentsRepo.create.mockResolvedValue({ id: 'c1', postId: 'p1', content: 'Nice', author: 'bob', createdAt: new Date() })

      await service.addComment('p1', 'Nice', 'bob')

      expect(gateway.emitToBoard).toHaveBeenCalledWith('b1', 'comment:created', expect.any(Object))
    })

    it('sends notification to post author when commenter is different', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ author: 'alice' }))
      membersRepo.findOne.mockResolvedValue(makeMember({ username: 'bob' }))
      const savedComment = { id: 'c1', postId: 'p1', content: 'Nice', author: 'bob', createdAt: new Date() }
      commentsRepo.create.mockResolvedValue(savedComment)
      const notif = { id: 'n1', username: 'alice', type: 'comment', message: '', boardId: 'b1', boardTitle: '', read: false, createdAt: new Date() }
      notificationsRepo.create.mockResolvedValue(notif)

      await service.addComment('p1', 'Nice', 'bob')

      expect(gateway.emitToUser).toHaveBeenCalledWith('alice', 'notification:new', expect.any(Object))
    })

    it('does not notify when commenter is the post author', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ author: 'alice' }))
      membersRepo.findOne.mockResolvedValue(makeMember({ username: 'alice' }))
      commentsRepo.create.mockResolvedValue({ id: 'c1', postId: 'p1', content: 'Self', author: 'alice', createdAt: new Date() })

      await service.addComment('p1', 'Self', 'alice')

      expect(notificationsRepo.create).not.toHaveBeenCalled()
    })

    it('throws ForbiddenException for viewers', async () => {
      postsRepo.findOne.mockResolvedValue(makePost())
      membersRepo.findOne.mockResolvedValue(makeMember({ role: BoardRole.VIEWER }))

      await expect(service.addComment('p1', 'Hi', 'alice')).rejects.toThrow(ForbiddenException)
    })
  })

  // ─── toggleLike ───────────────────────────────────────────────────────────────

  describe('toggleLike', () => {
    it('adds a like when not already liked', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ likes: 0 }))
      membersRepo.findOne.mockResolvedValue(makeMember())
      likesRepo.findOne.mockResolvedValue(null)
      likesRepo.create.mockResolvedValue({ postId: 'p1', username: 'alice' })
      likesRepo.find.mockReturnValue(mockFindResult([{ postId: 'p1', username: 'alice' }])) // after-toggle fetch

      const result = await service.toggleLike('p1', 'alice')

      expect(likesRepo.create).toHaveBeenCalled()
      expect(result.liked_by_me).toBe(true)
      expect(result.likes).toBe(1)
    })

    it('removes a like when already liked', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ likes: 1 }))
      membersRepo.findOne.mockResolvedValue(makeMember())
      const existingLike = { postId: 'p1', username: 'alice' }
      likesRepo.findOne.mockResolvedValue(existingLike)
      likesRepo.deleteOne.mockResolvedValue({})
      likesRepo.find.mockReturnValue(mockFindResult([])) // after-toggle fetch — like was removed

      const result = await service.toggleLike('p1', 'alice')

      expect(likesRepo.deleteOne).toHaveBeenCalledWith({ postId: 'p1', username: 'alice' })
      expect(result.liked_by_me).toBe(false)
      expect(result.likes).toBe(0)
    })

    it('does not go below 0 likes', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ likes: 0 }))
      membersRepo.findOne.mockResolvedValue(makeMember())
      likesRepo.findOne.mockResolvedValue({ postId: 'p1', username: 'alice' })
      likesRepo.deleteOne.mockResolvedValue({})
      likesRepo.find.mockReturnValue(mockFindResult([])) // after-toggle fetch

      const result = await service.toggleLike('p1', 'alice')

      expect(result.likes).toBe(0)
    })
  })

  // ─── vote ─────────────────────────────────────────────────────────────────────

  describe('vote', () => {
    beforeEach(() => {
      pollOptionsRepo.find.mockReturnValue(mockFindResult([
        { id: 'o1', optionText: 'Yes', sortOrder: 0 },
        { id: 'o2', optionText: 'No', sortOrder: 1 },
      ]))
      pollVotesRepo.find.mockReturnValue(mockFindResult([]))
    })

    it('creates a new vote when user has not voted yet', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ type: PostType.POLL }))
      membersRepo.findOne.mockResolvedValue(makeMember())
      pollVotesRepo.findOne.mockResolvedValue(null)
      pollVotesRepo.create.mockResolvedValue({})

      await service.vote('p1', 'o1', 'alice')

      expect(pollVotesRepo.create).toHaveBeenCalled()
      expect(gateway.emitToBoard).toHaveBeenCalledWith('b1', 'post:updated', expect.any(Object))
    })

    it('updates an existing vote', async () => {
      postsRepo.findOne.mockResolvedValue(makePost({ type: PostType.POLL }))
      membersRepo.findOne.mockResolvedValue(makeMember())
      const existing = withSave({ id: 'v1', postId: 'p1', optionId: 'o1', username: 'alice' })
      pollVotesRepo.findOne.mockResolvedValue(existing)

      await service.vote('p1', 'o2', 'alice')

      expect(existing.save).toHaveBeenCalled()
      expect(existing.optionId).toBe('o2')
    })
  })
})
