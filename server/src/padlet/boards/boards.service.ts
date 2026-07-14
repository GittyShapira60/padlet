import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { v4 as uuid } from 'uuid'
import { BoardRole } from '../../common/enums'
import { formatDate } from '../../common/utils/date.util'
import { mapNotification } from '../../common/utils/notification.util'
import { generatePassword } from '../../common/utils/random.util'
import {
  Board, BoardDocument,
  BoardMember, BoardMemberDocument,
  BoardVisit,
  Comment,
  Notification, NotificationDocument,
  PollOption, PollOptionDocument,
  PollVote,
  Post, PostDocument,
  PostLike,
  PostReaction,
} from '../../entities'
import { EventsGateway } from '../../gateway/events.gateway'
import { CreateBoardDto } from './dto/create-board.dto'
import { UpdateBoardDto } from './dto/update-board.dto'

@Injectable()
export class BoardsService {
  constructor(
    @InjectModel(Board.name) private boards: Model<BoardDocument>,
    @InjectModel(BoardMember.name) private members: Model<BoardMemberDocument>,
    @InjectModel(BoardVisit.name) private boardVisits: Model<BoardVisit>,
    @InjectModel(Post.name) private posts: Model<PostDocument>,
    @InjectModel(Notification.name) private notifications: Model<NotificationDocument>,
    @InjectModel(PollOption.name) private pollOptions: Model<PollOptionDocument>,
    @InjectModel(Comment.name) private comments: Model<Comment>,
    @InjectModel(PostLike.name) private postLikes: Model<PostLike>,
    @InjectModel(PostReaction.name) private postReactions: Model<PostReaction>,
    @InjectModel(PollVote.name) private pollVotes: Model<PollVote>,
    private gateway: EventsGateway,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async assertOwner(boardId: string, username: string, board?: BoardDocument): Promise<void> {
    const b = board ?? await this.boards.findOne({ _id: boardId })
    if (!b) throw new NotFoundException()
    const isOwner =
      b.owner === username ||
      (await this.members.findOne({ boardId, username }))?.role === BoardRole.OWNER
    if (!isOwner) throw new ForbiddenException('Only owner can perform this action')
  }

  private async saveNotification(
    username: string,
    type: string,
    message: string,
    boardId: string,
    boardTitle: string,
  ): Promise<NotificationDocument> {
    return this.notifications.create({ _id: uuid(), username, type, message, boardId, boardTitle })
  }

  private emitNotification(notif: NotificationDocument): void {
    this.gateway.emitToUser(notif.username, 'notification:new', mapNotification(notif))
  }

  private async saveAndEmitNotification(
    username: string,
    type: string,
    message: string,
    boardId: string,
    boardTitle: string,
  ): Promise<void> {
    const notif = await this.saveNotification(username, type, message, boardId, boardTitle)
    this.emitNotification(notif)
  }

  // ─── Board CRUD ───────────────────────────────────────────────────────────────

  async findAll(username: string) {
    const myMemberships = await this.members.find({ username })
    const boardIds = myMemberships.map((m) => m.boardId)
    if (!boardIds.length) return []

    const [boardsList, rawCounts, allMembers] = await Promise.all([
      this.boards.find({ _id: { $in: boardIds } }).sort({ updatedAt: -1 }),
      this.posts.aggregate([
        { $match: { boardId: { $in: boardIds } } },
        { $group: { _id: '$boardId', count: { $sum: 1 } } },
      ]),
      this.members.find({ boardId: { $in: boardIds } }),
    ])

    const countMap = new Map(rawCounts.map((r) => [r._id, r.count || 0]))
    const membersByBoard = new Map<string, BoardMember[]>()
    for (const m of allMembers) {
      if (!membersByBoard.has(m.boardId)) membersByBoard.set(m.boardId, [])
      membersByBoard.get(m.boardId)!.push(m)
    }

    return boardsList.map((b) => ({
      ...b.toObject(),
      members: membersByBoard.get(b.id) ?? [],
      my_role: myMemberships.find((m) => m.boardId === b.id)?.role ?? 'viewer',
      post_count: countMap.get(b.id) ?? 0,
    }))
  }

  async findOne(id: string, username: string) {
    const board = await this.boards.findOne({ _id: id })
    if (!board) throw new NotFoundException('Board not found')

    const boardMembers = await this.members.find({ boardId: id })
    const member = boardMembers.find((m) => m.username === username)

    if (!member && board.owner !== username) {
      if (board.isPublic) return { ...board.toObject(), my_role: BoardRole.VIEWER, members: boardMembers }
      throw new ForbiddenException('Access denied')
    }

    return { ...board.toObject(), members: boardMembers, my_role: member?.role ?? BoardRole.OWNER }
  }

  async create(dto: CreateBoardDto, username: string) {
    const board = await this.boards.create({ _id: uuid(), ...dto, owner: username })
    await this.members.create({ _id: uuid(), boardId: board.id, username, role: BoardRole.OWNER })
    return board
  }

  async update(id: string, dto: UpdateBoardDto, username: string) {
    const board = await this.boards.findOne({ _id: id })
    if (!board) throw new NotFoundException('Board not found')

    if (board.owner !== username) {
      const member = await this.members.findOne({ boardId: id, username })
      if (!member) throw new ForbiddenException()
      if (member.role === BoardRole.VIEWER || member.role === BoardRole.COMMENTER) {
        throw new ForbiddenException('No edit permission')
      }
    }

    Object.assign(board, dto)
    const saved = await board.save()

    this.gateway.emitToBoard(id, 'board:updated', {
      id: saved.id,
      title: saved.title,
      description: saved.description,
      background: saved.background,
      layout: saved.layout,
      password: saved.password,
      owner: saved.owner,
      isPublic: saved.isPublic,
      timelineDirection: saved.timelineDirection,
    })

    return saved
  }

  async remove(id: string, username: string) {
    const board = await this.boards.findOne({ _id: id })
    if (!board) throw new NotFoundException()

    const isOwner =
      board.owner === username ||
      (await this.members.findOne({ boardId: id, username }))?.role === BoardRole.OWNER
    if (!isOwner) throw new ForbiddenException('Only owner can delete')

    const postIds = (await this.posts.find({ boardId: id })).map((p) => p.id)
    await Promise.all([
      this.comments.deleteMany({ postId: { $in: postIds } }),
      this.postLikes.deleteMany({ postId: { $in: postIds } }),
      this.postReactions.deleteMany({ postId: { $in: postIds } }),
      this.pollVotes.deleteMany({ postId: { $in: postIds } }),
      this.pollOptions.deleteMany({ postId: { $in: postIds } }),
    ])
    await this.posts.deleteMany({ boardId: id })
    await this.members.deleteMany({ boardId: id })
    await this.boards.deleteOne({ _id: id })
  }

  // ─── Duplicate ────────────────────────────────────────────────────────────────

  async duplicate(
    id: string,
    username: string,
    newTitle?: string,
    postsOption: 'none' | 'mine' | 'all' = 'all',
    passwordOption: 'keep' | 'new' | 'none' = 'none',
    membersOption: 'keep' | 'none' = 'none',
    customPassword?: string,
  ) {
    const board = await this.boards.findOne({ _id: id })
    if (!board) throw new NotFoundException()
    await this.assertOwner(id, username, board)

    const newPassword = this.resolvePassword(passwordOption, board.password, customPassword)
    const newBoard = await this.createDuplicateBoard(board, username, newTitle, newPassword)

    if (membersOption === 'keep') {
      await this.copyMembers(id, username, newBoard)
    }

    const copiedCount = await this.copyPosts(id, newBoard.id, username, postsOption)

    return { ...newBoard.toObject(), my_role: BoardRole.OWNER, post_count: copiedCount }
  }

  private resolvePassword(
    option: 'keep' | 'new' | 'none',
    existing: string,
    custom?: string,
  ): string {
    if (option === 'keep') return existing
    if (option === 'new') return custom?.trim() || generatePassword()
    return ''
  }

  private async createDuplicateBoard(
    source: BoardDocument,
    username: string,
    newTitle: string | undefined,
    password: string,
  ): Promise<BoardDocument> {
    const newBoard = await this.boards.create({
      _id: uuid(),
      title: newTitle?.trim() || `עותק של ${source.title}`,
      description: source.description,
      background: source.background,
      layout: source.layout,
      password,
      owner: username,
    })
    await this.members.create({ _id: uuid(), boardId: newBoard.id, username, role: BoardRole.OWNER })
    return newBoard
  }

  private async copyMembers(sourceBoardId: string, username: string, newBoard: BoardDocument): Promise<void> {
    const allMembers = await this.members.find({ boardId: sourceBoardId })
    const membersToAdd = allMembers.filter((m) => m.username !== username && m.role !== BoardRole.OWNER)
    if (!membersToAdd.length) return

    await this.members.insertMany(
      membersToAdd.map((m) => ({ _id: uuid(), boardId: newBoard.id, username: m.username, role: m.role })),
    )

    await Promise.all(
      membersToAdd.map((m) =>
        this.saveAndEmitNotification(
          m.username,
          'shared',
          `${username} שיתף אותך בלוח "${newBoard.title}" (שוכפל מ-"${newBoard.title}")`,
          newBoard.id,
          newBoard.title,
        ),
      ),
    )
  }

  private async copyPosts(
    sourceBoardId: string,
    destBoardId: string,
    username: string,
    option: 'none' | 'mine' | 'all',
  ): Promise<number> {
    if (option === 'none') return 0

    let posts = await this.posts.find({ boardId: sourceBoardId })
    if (option === 'mine') posts = posts.filter((p) => p.author === username)
    if (!posts.length) return 0

    const idMap = new Map(posts.map((p) => [p.id, uuid()]))
    await this.posts.insertMany(
      posts.map((p) => ({ ...p.toObject(), _id: idMap.get(p.id)!, boardId: destBoardId })),
    )

    const pollPostIds = posts.filter((p) => p.type === 'poll').map((p) => p.id)
    if (pollPostIds.length) {
      const options = await this.pollOptions.find({ postId: { $in: pollPostIds } })
      if (options.length) {
        await this.pollOptions.insertMany(
          options.map((o) => ({ ...o.toObject(), _id: uuid(), postId: idMap.get(o.postId)! })),
        )
      }
    }

    return posts.length
  }

  // ─── Password reset ───────────────────────────────────────────────────────────

  async resetPassword(id: string, username: string) {
    const board = await this.boards.findOne({ _id: id })
    if (!board) throw new NotFoundException()
    if (board.owner !== username) throw new ForbiddenException('Only owner can reset password')

    const newPassword = generatePassword()
    board.password = newPassword
    await board.save()

    const allMembers = await this.members.find({ boardId: id })
    const nonOwners = allMembers.filter((m) => m.username !== username)

    await Promise.all([
      ...nonOwners.map((m) =>
        this.saveAndEmitNotification(
          m.username,
          'password_reset',
          `סיסמת הלוח "${board.title}" אופסה - פנה אל הבעלים לקבלת הסיסמה החדשה`,
          id,
          board.title,
        ),
      ),
      this.saveAndEmitNotification(
        username,
        'password_reset_reminder',
        `הסיסמה ללוח "${board.title}" אופסה לאוטומטית. מומלץ לשנות אותה לסיסמה אישית בהגדרות הלוח.`,
        id,
        board.title,
      ),
    ])

    return { password: newPassword }
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────

  async getStats(username: string) {
    const allMemberships = await this.members.find({ username })
    const allBoardIds = allMemberships.map((m) => m.boardId)

    if (!allBoardIds.length) return this.emptyStats()

    const allBoards = await this.boards.find({ _id: { $in: allBoardIds } })
    const myBoards = allBoards.filter((b) => b.owner === username)
    const sharedCount = allBoards.length - myBoards.length

    const layoutCounts: Record<string, number> = {}
    for (const b of myBoards) layoutCounts[b.layout] = (layoutCounts[b.layout] || 0) + 1

    if (!myBoards.length) {
      return { ...this.emptyStats(), shared_boards: sharedCount, layout_counts: layoutCounts }
    }

    const myBoardIds = myBoards.map((b) => b.id)
    const twoWeeksAgo = this.twoWeeksAgo()

    const [postTypeRaw, postsPerBoardRaw, postsPerDayRaw, visitsPerBoardRaw, visitsPerDayRaw] =
      await Promise.all([
        this.posts.aggregate([
          { $match: { boardId: { $in: myBoardIds } } },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        this.posts.aggregate([
          { $match: { boardId: { $in: myBoardIds } } },
          { $group: { _id: '$boardId', count: { $sum: 1 } } },
        ]),
        this.posts.aggregate([
          { $match: { boardId: { $in: myBoardIds }, createdAt: { $gte: twoWeeksAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        this.boardVisits.aggregate([
          { $match: { boardId: { $in: myBoardIds } } },
          {
            $group: {
              _id: '$boardId',
              visit_count: { $sum: 1 },
              unique_visitors: { $addToSet: '$username' },
              avg_duration: { $avg: '$durationSeconds' },
            },
          },
          { $project: { visit_count: 1, avg_duration: 1, unique_visitors: { $size: '$unique_visitors' } } },
        ]),
        this.boardVisits.aggregate([
          { $match: { boardId: { $in: myBoardIds }, visitedAt: { $gte: twoWeeksAgo } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt', timezone: 'UTC' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ])

    const postTypeCounts: Record<string, number> = {}
    let totalPosts = 0
    for (const r of postTypeRaw) {
      const cnt = r.count || 0
      postTypeCounts[r._id] = cnt
      totalPosts += cnt
    }

    const boardPostMap = new Map(postsPerBoardRaw.map((r) => [r._id, r.count || 0]))
    const visitMap = new Map(
      visitsPerBoardRaw.map((r) => [
        r._id,
        {
          visit_count: r.visit_count || 0,
          unique_visitors: r.unique_visitors || 0,
          avg_duration: Math.round(r.avg_duration || 0),
        },
      ]),
    )

    const topBoards = myBoards
      .map((b) => ({ id: b.id, title: b.title, post_count: boardPostMap.get(b.id) ?? 0 }))
      .sort((a, b) => b.post_count - a.post_count)
      .slice(0, 5)

    const topBoardsByVisits = myBoards
      .map((b) => ({
        id: b.id,
        title: b.title,
        post_count: boardPostMap.get(b.id) ?? 0,
        visit_count: visitMap.get(b.id)?.visit_count ?? 0,
        unique_visitors: visitMap.get(b.id)?.unique_visitors ?? 0,
        avg_duration: visitMap.get(b.id)?.avg_duration ?? 0,
      }))
      .sort((a, b) => b.visit_count - a.visit_count)
      .slice(0, 5)

    return {
      total_boards: myBoards.length,
      total_posts: totalPosts,
      shared_boards: sharedCount,
      layout_counts: layoutCounts,
      post_type_counts: postTypeCounts,
      posts_per_day: postsPerDayRaw.map((r) => ({ date: formatDate(r._id), count: r.count || 0 })),
      top_boards: topBoards,
      top_boards_by_visits: topBoardsByVisits,
      visits_per_day: visitsPerDayRaw.map((r) => ({ date: formatDate(r._id), count: r.count || 0 })),
    }
  }

  async getBoardStats(boardId: string, username: string) {
    await this.findOne(boardId, username)
    const twoWeeksAgo = this.twoWeeksAgo()

    const [visitsPerDayRaw, allTimeRaw, visitorsRaw] = await Promise.all([
      this.boardVisits.aggregate([
        { $match: { boardId, visitedAt: { $gte: twoWeeksAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt', timezone: 'UTC' } },
            count: { $sum: 1 },
            unique_visitors: { $addToSet: '$username' },
            avg_duration: { $avg: '$durationSeconds' },
          },
        },
        { $project: { count: 1, avg_duration: 1, unique_visitors: { $size: '$unique_visitors' } } },
        { $sort: { _id: 1 } },
      ]),
      this.boardVisits.aggregate([
        { $match: { boardId } },
        {
          $group: {
            _id: null,
            total_visits: { $sum: 1 },
            unique_visitors: { $addToSet: '$username' },
            avg_duration: { $avg: '$durationSeconds' },
          },
        },
        { $project: { total_visits: 1, avg_duration: 1, unique_visitors: { $size: '$unique_visitors' } } },
      ]),
      this.boardVisits.aggregate([
        { $match: { boardId } },
        {
          $group: {
            _id: '$username',
            visit_count: { $sum: 1 },
            last_visit: { $max: '$visitedAt' },
            avg_duration: { $avg: '$durationSeconds' },
          },
        },
        { $sort: { last_visit: -1 } },
      ]),
    ])

    const allTime = allTimeRaw[0]

    return {
      visits_per_day: visitsPerDayRaw.map((r) => ({
        date: formatDate(r._id),
        count: r.count || 0,
        unique_visitors: r.unique_visitors || 0,
        avg_duration: Math.round(r.avg_duration || 0),
      })),
      total_visits: allTime?.total_visits || 0,
      unique_visitors: allTime?.unique_visitors || 0,
      avg_duration: Math.round(allTime?.avg_duration || 0),
      visitors: visitorsRaw.map((r) => ({
        username: r._id,
        visit_count: r.visit_count || 0,
        last_visit: r.last_visit instanceof Date ? r.last_visit.toISOString() : String(r.last_visit),
        avg_duration: Math.round(r.avg_duration || 0),
      })),
    }
  }

  // ─── Members ──────────────────────────────────────────────────────────────────

  async getMembers(boardId: string, username: string) {
    await this.findOne(boardId, username)
    return this.members.find({ boardId })
  }

  async addMember(boardId: string, targetUsername: string, role: BoardRole, requestingUsername: string) {
    const board = await this.boards.findOne({ _id: boardId })
    if (!board) throw new NotFoundException()
    await this.assertOwner(boardId, requestingUsername, board)

    const existing = await this.members.findOne({ boardId, username: targetUsername })
    if (existing) {
      existing.role = role
      await existing.save()
      this.gateway.emitToUser(targetUsername, 'role:updated', { boardId, role })
      return existing
    }

    const member = await this.members.create({ _id: uuid(), boardId, username: targetUsername, role })

    if (targetUsername !== requestingUsername) {
      await this.saveAndEmitNotification(
        targetUsername,
        'shared',
        `${requestingUsername} שיתף אותך ב-${board.title}`,
        boardId,
        board.title,
      )
    }

    return member
  }

  async removeMember(boardId: string, targetUsername: string, requestingUsername: string) {
    const board = await this.boards.findOne({ _id: boardId })
    if (!board) throw new NotFoundException()

    const isOwner =
      board.owner === requestingUsername ||
      (await this.members.findOne({ boardId, username: requestingUsername }))?.role === BoardRole.OWNER

    if (targetUsername !== requestingUsername && !isOwner) throw new ForbiddenException()
    await this.members.deleteOne({ boardId, username: targetUsername })

    // Notify the removed user (not when someone leaves voluntarily)
    if (targetUsername !== requestingUsername) {
      const notif = await this.notifications.create({
        _id: uuid(),
        username: targetUsername,
        type: 'removed',
        message: `הוסרת מלוח "${board.title}" על ידי ${requestingUsername}`,
        boardId,
        boardTitle: board.title,
      })
      this.gateway.emitToUser(targetUsername, 'notification:new', {
        id: notif.id, username: notif.username, type: notif.type, message: notif.message,
        board_id: notif.boardId, board_title: notif.boardTitle, read: notif.read, created_at: notif.createdAt,
      })
    }
  }

  // ─── Private query helpers ────────────────────────────────────────────────────

  private twoWeeksAgo(): Date {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d
  }

  private emptyStats() {
    return {
      total_boards: 0,
      total_posts: 0,
      shared_boards: 0,
      layout_counts: {} as Record<string, number>,
      post_type_counts: {} as Record<string, number>,
      posts_per_day: [] as { date: string; count: number }[],
      top_boards: [] as { id: string; title: string; post_count: number }[],
      top_boards_by_visits: [] as object[],
      visits_per_day: [] as { date: string; count: number }[],
    }
  }
}
