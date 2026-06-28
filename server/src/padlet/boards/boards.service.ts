import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import { BoardRole } from '../../common/enums'
import { formatDate } from '../../common/utils/date.util'
import { mapNotification } from '../../common/utils/notification.util'
import { generatePassword } from '../../common/utils/random.util'
import { Board, BoardMember, BoardVisit, Notification, PollOption, Post } from '../../entities'
import { EventsGateway } from '../../gateway/events.gateway'
import { CreateBoardDto } from './dto/create-board.dto'
import { UpdateBoardDto } from './dto/update-board.dto'

@Injectable()
export class BoardsService {
  constructor(
    @InjectRepository(Board) private boards: Repository<Board>,
    @InjectRepository(BoardMember) private members: Repository<BoardMember>,
    @InjectRepository(BoardVisit) private boardVisits: Repository<BoardVisit>,
    @InjectRepository(Post) private posts: Repository<Post>,
    @InjectRepository(Notification) private notifications: Repository<Notification>,
    @InjectRepository(PollOption) private pollOptions: Repository<PollOption>,
    private gateway: EventsGateway,
  ) {}

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async assertOwner(boardId: string, username: string, board?: Board): Promise<void> {
    const b = board ?? await this.boards.findOne({ where: { id: boardId } })
    if (!b) throw new NotFoundException()
    const isOwner =
      b.owner === username ||
      (await this.members.findOne({ where: { boardId, username } }))?.role === BoardRole.OWNER
    if (!isOwner) throw new ForbiddenException('Only owner can perform this action')
  }

  private async saveNotification(
    username: string,
    type: string,
    message: string,
    boardId: string,
    boardTitle: string,
  ): Promise<Notification> {
    return this.notifications.save(
      this.notifications.create({ id: uuid(), username, type, message, boardId, boardTitle }),
    )
  }

  private emitNotification(notif: Notification): void {
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
    const myMemberships = await this.members.find({ where: { username } })
    const boardIds = myMemberships.map((m) => m.boardId)
    if (!boardIds.length) return []

    const [boards, rawCounts] = await Promise.all([
      this.boards
        .createQueryBuilder('b')
        .whereInIds(boardIds)
        .leftJoinAndSelect('b.members', 'members')
        .orderBy('b.updatedAt', 'DESC')
        .getMany(),
      this.posts
        .createQueryBuilder('p')
        .select('p.boardId', 'boardId')
        .addSelect('COUNT(p.id)', 'count')
        .where('p.boardId IN (:...boardIds)', { boardIds })
        .groupBy('p.boardId')
        .getRawMany(),
    ])

    const countMap = new Map(rawCounts.map((r) => [r.boardId, parseInt(r.count) || 0]))

    return boards.map((b) => ({
      ...b,
      members: b.members ?? [],
      my_role: myMemberships.find((m) => m.boardId === b.id)?.role ?? 'viewer',
      post_count: countMap.get(b.id) ?? 0,
    }))
  }

  async findOne(id: string, username: string) {
    const board = await this.boards.findOne({ where: { id }, relations: ['members'] })
    if (!board) throw new NotFoundException('Board not found')

    let member = board.members.find((m) => m.username === username)
    if (!member) {
      member = (await this.members.findOne({ where: { boardId: id, username } })) ?? undefined
    }

    if (!member && board.owner !== username) {
      if (board.isPublic) return { ...board, my_role: BoardRole.VIEWER, members: board.members ?? [] }
      throw new ForbiddenException('Access denied')
    }

    return { ...board, members: board.members ?? [], my_role: member?.role ?? BoardRole.OWNER }
  }

  async create(dto: CreateBoardDto, username: string) {
    const board = this.boards.create({ id: uuid(), ...dto, owner: username })
    await this.boards.save(board)
    await this.members.save(
      this.members.create({ id: uuid(), boardId: board.id, username, role: BoardRole.OWNER }),
    )
    return board
  }

  async update(id: string, dto: UpdateBoardDto, username: string) {
    const board = await this.boards.findOne({ where: { id } })
    if (!board) throw new NotFoundException('Board not found')

    if (board.owner !== username) {
      const member = await this.members.findOne({ where: { boardId: id, username } })
      if (!member) throw new ForbiddenException()
      if (member.role === BoardRole.VIEWER || member.role === BoardRole.COMMENTER) {
        throw new ForbiddenException('No edit permission')
      }
    }

    Object.assign(board, dto)
    const saved = await this.boards.save(board)

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
    const board = await this.boards.findOne({ where: { id } })
    if (!board) throw new NotFoundException()

    const isOwner =
      board.owner === username ||
      (await this.members.findOne({ where: { boardId: id, username } }))?.role === BoardRole.OWNER
    if (!isOwner) throw new ForbiddenException('Only owner can delete')

    await this.boards.delete(id)
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
    const board = await this.boards.findOne({ where: { id } })
    if (!board) throw new NotFoundException()
    await this.assertOwner(id, username, board)

    const newPassword = this.resolvePassword(passwordOption, board.password, customPassword)
    const newBoard = await this.createDuplicateBoard(board, username, newTitle, newPassword)

    if (membersOption === 'keep') {
      await this.copyMembers(id, username, newBoard)
    }

    const copiedCount = await this.copyPosts(id, newBoard.id, username, postsOption)

    return { ...newBoard, my_role: BoardRole.OWNER, post_count: copiedCount }
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
    source: Board,
    username: string,
    newTitle: string | undefined,
    password: string,
  ): Promise<Board> {
    const newBoard = this.boards.create({
      id: uuid(),
      title: newTitle?.trim() || `עותק של ${source.title}`,
      description: source.description,
      background: source.background,
      layout: source.layout,
      password,
      owner: username,
    })
    await this.boards.save(newBoard)
    await this.members.save(
      this.members.create({ id: uuid(), boardId: newBoard.id, username, role: BoardRole.OWNER }),
    )
    return newBoard
  }

  private async copyMembers(sourceBoardId: string, username: string, newBoard: Board): Promise<void> {
    const allMembers = await this.members.find({ where: { boardId: sourceBoardId } })
    const membersToAdd = allMembers.filter((m) => m.username !== username && m.role !== BoardRole.OWNER)
    if (!membersToAdd.length) return

    await this.members.save(
      membersToAdd.map((m) =>
        this.members.create({ id: uuid(), boardId: newBoard.id, username: m.username, role: m.role }),
      ),
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

    let posts = await this.posts.find({ where: { boardId: sourceBoardId } })
    if (option === 'mine') posts = posts.filter((p) => p.author === username)
    if (!posts.length) return 0

    const idMap = new Map(posts.map((p) => [p.id, uuid()]))
    await this.posts.save(posts.map((p) => this.posts.create({ ...p, id: idMap.get(p.id)!, boardId: destBoardId })))

    const pollPostIds = posts.filter((p) => p.type === 'poll').map((p) => p.id)
    if (pollPostIds.length) {
      const options = await this.pollOptions.find({ where: { postId: In(pollPostIds) } })
      if (options.length) {
        await this.pollOptions.save(
          options.map((o) => this.pollOptions.create({ ...o, id: uuid(), postId: idMap.get(o.postId)! })),
        )
      }
    }

    return posts.length
  }

  // ─── Password reset ───────────────────────────────────────────────────────────

  async resetPassword(id: string, username: string) {
    const board = await this.boards.findOne({ where: { id } })
    if (!board) throw new NotFoundException()
    if (board.owner !== username) throw new ForbiddenException('Only owner can reset password')

    const newPassword = generatePassword()
    board.password = newPassword
    await this.boards.save(board)

    const allMembers = await this.members.find({ where: { boardId: id } })
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
    const allMemberships = await this.members.find({ where: { username } })
    const allBoardIds = allMemberships.map((m) => m.boardId)

    if (!allBoardIds.length) return this.emptyStats()

    const allBoards = await this.boards.createQueryBuilder('b').whereInIds(allBoardIds).getMany()
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
        this.posts
          .createQueryBuilder('p')
          .select('p.type', 'type')
          .addSelect('COUNT(p.id)', 'count')
          .where('p.boardId IN (:...myBoardIds)', { myBoardIds })
          .groupBy('p.type')
          .getRawMany(),
        this.posts
          .createQueryBuilder('p')
          .select('p.boardId', 'boardId')
          .addSelect('COUNT(p.id)', 'count')
          .where('p.boardId IN (:...myBoardIds)', { myBoardIds })
          .groupBy('p.boardId')
          .getRawMany(),
        this.posts
          .createQueryBuilder('p')
          .select('DATE(p.created_at)', 'date')
          .addSelect('COUNT(p.id)', 'count')
          .where('p.boardId IN (:...myBoardIds)', { myBoardIds })
          .andWhere('p.created_at >= :twoWeeksAgo', { twoWeeksAgo })
          .groupBy('DATE(p.created_at)')
          .orderBy('DATE(p.created_at)', 'ASC')
          .getRawMany(),
        this.boardVisits
          .createQueryBuilder('v')
          .select('v.boardId', 'boardId')
          .addSelect('COUNT(v.id)', 'visit_count')
          .addSelect('COUNT(DISTINCT v.username)', 'unique_visitors')
          .addSelect('AVG(v.durationSeconds)', 'avg_duration')
          .where('v.boardId IN (:...myBoardIds)', { myBoardIds })
          .groupBy('v.boardId')
          .getRawMany(),
        this.boardVisits
          .createQueryBuilder('v')
          .select('DATE(v.visitedAt)', 'date')
          .addSelect('COUNT(v.id)', 'count')
          .where('v.boardId IN (:...myBoardIds)', { myBoardIds })
          .andWhere('v.visitedAt >= :twoWeeksAgo', { twoWeeksAgo })
          .groupBy('DATE(v.visitedAt)')
          .orderBy('DATE(v.visitedAt)', 'ASC')
          .getRawMany(),
      ])

    const postTypeCounts: Record<string, number> = {}
    let totalPosts = 0
    for (const r of postTypeRaw) {
      const cnt = parseInt(r.count) || 0
      postTypeCounts[r.type] = cnt
      totalPosts += cnt
    }

    const boardPostMap = new Map(postsPerBoardRaw.map((r) => [r.boardId, parseInt(r.count) || 0]))
    const visitMap = new Map(
      visitsPerBoardRaw.map((r) => [
        r.boardId,
        {
          visit_count: parseInt(r.visit_count) || 0,
          unique_visitors: parseInt(r.unique_visitors) || 0,
          avg_duration: Math.round(parseFloat(r.avg_duration) || 0),
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
      posts_per_day: postsPerDayRaw.map((r) => ({ date: formatDate(r.date), count: parseInt(r.count) || 0 })),
      top_boards: topBoards,
      top_boards_by_visits: topBoardsByVisits,
      visits_per_day: visitsPerDayRaw.map((r) => ({ date: formatDate(r.date), count: parseInt(r.count) || 0 })),
    }
  }

  async getBoardStats(boardId: string, username: string) {
    await this.findOne(boardId, username)
    const twoWeeksAgo = this.twoWeeksAgo()

    const [visitsPerDayRaw, allTimeRaw, visitorsRaw] = await Promise.all([
      this.boardVisits
        .createQueryBuilder('v')
        .select('DATE(v.visitedAt)', 'date')
        .addSelect('COUNT(v.id)', 'count')
        .addSelect('COUNT(DISTINCT v.username)', 'unique_visitors')
        .addSelect('AVG(v.durationSeconds)', 'avg_duration')
        .where('v.boardId = :boardId', { boardId })
        .andWhere('v.visitedAt >= :twoWeeksAgo', { twoWeeksAgo })
        .groupBy('DATE(v.visitedAt)')
        .orderBy('DATE(v.visitedAt)', 'ASC')
        .getRawMany(),
      this.boardVisits
        .createQueryBuilder('v')
        .select('COUNT(v.id)', 'total_visits')
        .addSelect('COUNT(DISTINCT v.username)', 'unique_visitors')
        .addSelect('AVG(v.durationSeconds)', 'avg_duration')
        .where('v.boardId = :boardId', { boardId })
        .getRawOne(),
      this.boardVisits
        .createQueryBuilder('v')
        .select('v.username', 'username')
        .addSelect('COUNT(v.id)', 'visit_count')
        .addSelect('MAX(v.visitedAt)', 'last_visit')
        .addSelect('AVG(v.durationSeconds)', 'avg_duration')
        .where('v.boardId = :boardId', { boardId })
        .groupBy('v.username')
        .orderBy('last_visit', 'DESC')
        .getRawMany(),
    ])

    return {
      visits_per_day: visitsPerDayRaw.map((r) => ({
        date: formatDate(r.date),
        count: parseInt(r.count) || 0,
        unique_visitors: parseInt(r.unique_visitors) || 0,
        avg_duration: Math.round(parseFloat(r.avg_duration) || 0),
      })),
      total_visits: parseInt(allTimeRaw?.total_visits) || 0,
      unique_visitors: parseInt(allTimeRaw?.unique_visitors) || 0,
      avg_duration: Math.round(parseFloat(allTimeRaw?.avg_duration) || 0),
      visitors: visitorsRaw.map((r) => ({
        username: r.username,
        visit_count: parseInt(r.visit_count) || 0,
        last_visit: r.last_visit instanceof Date ? r.last_visit.toISOString() : String(r.last_visit),
        avg_duration: Math.round(parseFloat(r.avg_duration) || 0),
      })),
    }
  }

  // ─── Members ──────────────────────────────────────────────────────────────────

  async getMembers(boardId: string, username: string) {
    await this.findOne(boardId, username)
    return this.members.find({ where: { boardId } })
  }

  async addMember(boardId: string, targetUsername: string, role: BoardRole, requestingUsername: string) {
    const board = await this.boards.findOne({ where: { id: boardId } })
    if (!board) throw new NotFoundException()
    await this.assertOwner(boardId, requestingUsername, board)

    const existing = await this.members.findOne({ where: { boardId, username: targetUsername } })
    if (existing) {
      existing.role = role
      await this.members.save(existing)
      this.gateway.emitToUser(targetUsername, 'role:updated', { boardId, role })
      return existing
    }

    const member = this.members.create({ id: uuid(), boardId, username: targetUsername, role })
    await this.members.save(member)

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
    const board = await this.boards.findOne({ where: { id: boardId } })
    if (!board) throw new NotFoundException()

    const isOwner =
      board.owner === requestingUsername ||
      (await this.members.findOne({ where: { boardId, username: requestingUsername } }))?.role === BoardRole.OWNER

    if (targetUsername !== requestingUsername && !isOwner) throw new ForbiddenException()
    await this.members.delete({ boardId, username: targetUsername })

    // Notify the removed user (not when someone leaves voluntarily)
    if (targetUsername !== requestingUsername) {
      const notif = await this.notifications.save(
        this.notifications.create({
          id: uuid(),
          username: targetUsername,
          type: 'removed',
          message: `הוסרת מלוח "${board.title}" על ידי ${requestingUsername}`,
          boardId,
          boardTitle: board.title,
        }),
      )
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
