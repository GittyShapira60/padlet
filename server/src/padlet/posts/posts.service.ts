import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import { BoardRole } from '../../common/enums'
import { mapNotification } from '../../common/utils/notification.util'
import { Board, BoardMember, Comment, Notification, PollOption, PollVote, Post, PostLike, PostReaction } from '../../entities'
import { EventsGateway } from '../../gateway/events.gateway'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'

type MappedPollOption = { id: string; option_text: string; votes: number; voted_by_me: boolean }
type ReactionSummary = { emoji: string; count: number; reacted_by_me: boolean }

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private posts: Repository<Post>,
    @InjectRepository(Comment) private comments: Repository<Comment>,
    @InjectRepository(BoardMember) private members: Repository<BoardMember>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
    @InjectRepository(PostLike) private likes: Repository<PostLike>,
    @InjectRepository(PostReaction) private reactions: Repository<PostReaction>,
    @InjectRepository(PollOption) private pollOptions: Repository<PollOption>,
    @InjectRepository(PollVote) private pollVotes: Repository<PollVote>,
    @InjectRepository(Board) private boardsRepo: Repository<Board>,
    private gateway: EventsGateway,
  ) {}

  // ─── Mappers ──────────────────────────────────────────────────────────────────

  private mapComment(comment: Comment) {
    return {
      id: comment.id,
      post_id: comment.postId,
      content: comment.content,
      author: comment.author,
      created_at: comment.createdAt,
    }
  }

  private mapPost(
    post: Post,
    extra: {
      comments?: Comment[]
      liked_by_me?: boolean
      liked_by?: string[]
      poll_options?: MappedPollOption[]
      reactions?: ReactionSummary[]
    } = {},
  ) {
    return {
      id: post.id,
      board_id: post.boardId,
      type: post.type,
      content: post.content,
      author: post.author,
      color: post.color,
      x: post.x,
      y: post.y,
      width: post.width,
      likes: post.likes,
      image_url: post.imageUrl,
      link_url: post.linkUrl,
      link_title: post.linkTitle,
      link_description: post.linkDescription,
      link_image: post.linkImage,
      edited_by: post.editedBy,
      shape: post.shape || 'rect',
      updated_at: post.updatedAt,
      created_at: post.createdAt,
      comments: (extra.comments ?? []).map((c) => this.mapComment(c)),
      liked_by_me: extra.liked_by_me ?? false,
      liked_by: extra.liked_by ?? [],
      poll_options: extra.poll_options,
      reactions: extra.reactions ?? [],
    }
  }

  private buildReactionSummary(allReactions: PostReaction[], forUsername: string): ReactionSummary[] {
    const grouped: Record<string, { count: number; reacted_by_me: boolean }> = {}
    for (const r of allReactions) {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, reacted_by_me: false }
      grouped[r.emoji].count++
      if (r.username === forUsername) grouped[r.emoji].reacted_by_me = true
    }
    return Object.entries(grouped).map(([emoji, data]) => ({ emoji, ...data }))
  }

  // ─── Access helpers ───────────────────────────────────────────────────────────

  private async getMembership(boardId: string, username: string): Promise<BoardMember> {
    const m = await this.members.findOne({ where: { boardId, username } })
    if (m) return m

    const board = await this.boardsRepo.findOne({ where: { id: boardId } })
    if (board?.isPublic) {
      return this.members.create({ id: '', boardId, username, role: BoardRole.VIEWER })
    }

    throw new ForbiddenException('Access denied')
  }

  private async getPostOrFail(postId: string): Promise<Post> {
    const post = await this.posts.findOne({ where: { id: postId } })
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  private async getPostWithMembership(postId: string, username: string) {
    const post = await this.getPostOrFail(postId)
    const membership = await this.getMembership(post.boardId, username)
    return { post, membership }
  }

  private assertWritePermission(role: BoardRole): void {
    if (role === BoardRole.VIEWER || role === BoardRole.COMMENTER) {
      throw new ForbiddenException('No write permission')
    }
  }

  // ─── Posts CRUD ───────────────────────────────────────────────────────────────

  async findAll(boardId: string, username: string) {
    await this.getMembership(boardId, username)
    const posts = await this.posts.find({
      where: { boardId },
      order: { createdAt: 'ASC' },
      relations: ['comments'],
    })

    const postIds = posts.map(p => p.id)
    const allLikes = postIds.length
      ? await this.likes.find({ where: { postId: In(postIds) } })
      : []

    const likesByPost = new Map<string, string[]>()
    for (const l of allLikes) {
      if (!likesByPost.has(l.postId)) likesByPost.set(l.postId, [])
      likesByPost.get(l.postId)!.push(l.username)
    }

    // Load all reactions for these posts
    const allReactions = postIds.length
      ? await this.reactions.find({ where: { postId: In(postIds) } })
      : []
    const reactionsByPost = new Map<string, PostReaction[]>()
    for (const r of allReactions) {
      if (!reactionsByPost.has(r.postId)) reactionsByPost.set(r.postId, [])
      reactionsByPost.get(r.postId)!.push(r)
    }

    return Promise.all(
      posts.map(async (p) => {
        const pollOptions = p.type === 'poll' ? await this.getPollOptionsForPost(p.id, username) : undefined
        const likers = likesByPost.get(p.id) ?? []
        const postReactions = reactionsByPost.get(p.id) ?? []
        return this.mapPost(p, {
          comments: p.comments ?? [],
          liked_by_me: likers.includes(username),
          liked_by: likers,
          poll_options: pollOptions,
          reactions: this.buildReactionSummary(postReactions, username),
        })
      }),
    )
  }

  async react(postId: string, username: string, emoji: string) {
    const post = await this.getPostOrFail(postId)
    await this.getMembership(post.boardId, username)

    // Each (postId, username, emoji) is independent — toggle the specific emoji
    const existing = await this.reactions.findOne({ where: { postId, username, emoji } })
    if (existing) {
      await this.reactions.delete({ postId, username, emoji })
    } else {
      await this.reactions.save(this.reactions.create({ postId, username, emoji }))
    }

    const allReactions = await this.reactions.find({ where: { postId } })
    const summary = this.buildReactionSummary(allReactions, username)
    this.gateway.emitToBoard(post.boardId, 'post:reactions', { postId, reactions: summary })
    return { postId, reactions: summary }
  }

  async create(boardId: string, dto: CreatePostDto, username: string) {
    const m = await this.getMembership(boardId, username)
    this.assertWritePermission(m.role)

    const { poll_options: pollOpts, image_url, link_url, link_title, link_description, link_image, shape, ...rest } = dto
    const post = this.posts.create({
      id: uuid(),
      boardId,
      author: username,
      imageUrl: image_url ?? '',
      linkUrl: link_url ?? '',
      linkTitle: link_title ?? '',
      linkDescription: link_description ?? '',
      linkImage: link_image ?? '',
      shape: shape ?? 'rect',
      ...rest,
    })
    await this.posts.save(post)

    const savedPollOptions = pollOpts?.length ? await this.createPollOptions(post.id, pollOpts) : undefined

    const mapped = this.mapPost(post, { comments: [], liked_by_me: false, poll_options: savedPollOptions })
    this.gateway.emitToBoard(boardId, 'post:created', mapped)
    return mapped
  }

  async update(postId: string, dto: UpdatePostDto, username: string) {
    const { post, membership: m } = await this.getPostWithMembership(postId, username)
    this.assertWritePermission(m.role)

    const isContentChange = dto.content !== undefined || dto.color !== undefined
    Object.assign(post, dto)
    if (isContentChange) post.editedBy = username

    const saved = await this.posts.save(post)
    const comments = await this.comments.find({ where: { postId: saved.id }, order: { createdAt: 'ASC' } })
    const mapped = this.mapPost(saved, { comments })
    this.gateway.emitToBoard(post.boardId, 'post:updated', mapped)
    return mapped
  }

  async remove(postId: string, username: string) {
    const { post, membership: m } = await this.getPostWithMembership(postId, username)
    this.assertWritePermission(m.role)
    await this.posts.remove(post)
    this.gateway.emitToBoard(post.boardId, 'post:deleted', postId)
  }

  // ─── Comments ─────────────────────────────────────────────────────────────────

  async getComments(postId: string, username: string) {
    const post = await this.getPostOrFail(postId)
    await this.getMembership(post.boardId, username)
    const list = await this.comments.find({ where: { postId }, order: { createdAt: 'ASC' } })
    return list.map((c) => this.mapComment(c))
  }

  async addComment(postId: string, content: string, username: string) {
    const post = await this.getPostOrFail(postId)
    const m = await this.getMembership(post.boardId, username)
    if (m.role === BoardRole.VIEWER) throw new ForbiddenException('No comment permission')

    const comment = this.comments.create({ id: uuid(), postId, content, author: username })
    const saved = await this.comments.save(comment)
    const mapped = this.mapComment(saved)
    this.gateway.emitToBoard(post.boardId, 'comment:created', { postId, comment: mapped })

    if (post.author !== username) {
      const notif = await this.notifications.save(
        this.notifications.create({
          id: uuid(),
          username: post.author,
          type: 'comment',
          message: `${username} הגיב על הפוסט שלך`,
          boardId: post.boardId,
        }),
      )
      this.gateway.emitToUser(post.author, 'notification:new', mapNotification(notif))
    }

    return mapped
  }

  // ─── Likes ────────────────────────────────────────────────────────────────────

  async toggleLike(postId: string, username: string) {
    const post = await this.getPostOrFail(postId)
    await this.getMembership(post.boardId, username)

    const existing = await this.likes.findOne({ where: { postId, username } })
    if (existing) {
      await this.likes.remove(existing)
      post.likes = Math.max(0, post.likes - 1)
    } else {
      await this.likes.save(this.likes.create({ postId, username }))
      post.likes = post.likes + 1
    }

    const saved = await this.posts.save(post)
    const allLikes = await this.likes.find({ where: { postId } })
    const likers = allLikes.map(l => l.username)
    this.gateway.emitToBoard(post.boardId, 'post:likes', { postId, likes: saved.likes, liked_by: likers })
    return this.mapPost(saved, { liked_by_me: !existing, liked_by: likers })
  }

  // ─── Polls ────────────────────────────────────────────────────────────────────

  async vote(postId: string, optionId: string, username: string) {
    const post = await this.getPostOrFail(postId)
    await this.getMembership(post.boardId, username)

    const existing = await this.pollVotes.findOne({ where: { postId, username } })
    if (existing) {
      existing.optionId = optionId
      await this.pollVotes.save(existing)
    } else {
      await this.pollVotes.save(this.pollVotes.create({ id: uuid(), postId, optionId, username }))
    }

    const [pollOptions, comments] = await Promise.all([
      this.getPollOptionsForPost(postId, username),
      this.comments.find({ where: { postId }, order: { createdAt: 'ASC' } }),
    ])
    const mapped = this.mapPost(post, { poll_options: pollOptions, comments })
    this.gateway.emitToBoard(post.boardId, 'post:updated', mapped)
    return mapped
  }

  private async createPollOptions(postId: string, texts: string[]): Promise<MappedPollOption[]> {
    const created = await this.pollOptions.save(
      texts.map((text, i) =>
        this.pollOptions.create({ id: uuid(), postId, optionText: text, sortOrder: i }),
      ),
    )
    return created.map((o) => ({ id: o.id, option_text: o.optionText, votes: 0, voted_by_me: false }))
  }

  private async getPollOptionsForPost(postId: string, username: string): Promise<MappedPollOption[]> {
    const [options, votes] = await Promise.all([
      this.pollOptions.find({ where: { postId }, order: { sortOrder: 'ASC' } }),
      this.pollVotes.find({ where: { postId } }),
    ])
    const myVote = votes.find((v) => v.username === username)

    return options.map((o) => ({
      id: o.id,
      option_text: o.optionText,
      votes: votes.filter((v) => v.optionId === o.id).length,
      voted_by_me: myVote?.optionId === o.id,
    }))
  }
}
