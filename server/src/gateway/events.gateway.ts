import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Server, Socket } from 'socket.io'
import { v4 as uuid } from 'uuid'
import { BoardVisit } from '../entities'

const MIN_VISIT_SECONDS = 2

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(
    @InjectRepository(BoardVisit) private visits: Repository<BoardVisit>,
  ) {}

  private socketBoardMap = new Map<string, string>()
  private socketUserMap = new Map<string, string>()
  private socketStartTime = new Map<string, Date>()

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`)
    const boardId = this.socketBoardMap.get(client.id)
    const username = this.socketUserMap.get(client.id)
    const startTime = this.socketStartTime.get(client.id)

    if (boardId && username && startTime) {
      this.saveVisit(boardId, username, startTime)
    }

    if (boardId) {
      this.clearSocketState(client.id)
      this.emitRoomInfo(boardId)
    }
  }

  @SubscribeMessage('board:join')
  handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string | { boardId: string; username?: string },
  ) {
    const boardId = typeof data === 'string' ? data : data.boardId
    const username = typeof data === 'object' ? data.username : undefined
    void client.join(`board:${boardId}`)
    this.socketBoardMap.set(client.id, boardId)
    if (username) {
      this.socketUserMap.set(client.id, username)
      this.socketStartTime.set(client.id, new Date())
    }
    setTimeout(() => this.emitRoomInfo(boardId), 50)
  }

  @SubscribeMessage('board:leave')
  handleLeaveBoard(@ConnectedSocket() client: Socket, @MessageBody() boardId: string) {
    const username = this.socketUserMap.get(client.id)
    const startTime = this.socketStartTime.get(client.id)
    if (username && startTime) {
      this.saveVisit(boardId, username, startTime)
    }
    void client.leave(`board:${boardId}`)
    this.clearSocketState(client.id)
    this.emitRoomInfo(boardId)
  }

  @SubscribeMessage('user:join')
  handleUserJoin(@ConnectedSocket() client: Socket, @MessageBody() username: string) {
    void client.join(`user:${username}`)
  }

  @SubscribeMessage('post:move')
  handlePostMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { postId: string; x: number; y: number; boardId: string },
  ) {
    client.to(`board:${data.boardId}`).emit('post:moved', {
      postId: data.postId,
      x: data.x,
      y: data.y,
    })
  }

  emitToBoard(boardId: string, event: string, data: unknown) {
    this.server.to(`board:${boardId}`).emit(event, data)
  }

  emitToUser(username: string, event: string, data: unknown) {
    this.server.to(`user:${username}`).emit(event, data)
  }

  emitToRoom(room: string, event: string, data: unknown) {
    this.server.to(room).emit(event, data)
  }

  @SubscribeMessage('menti:session:join')
  handleMentiJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; role: 'presenter' | 'audience' },
  ) {
    const room =
      data.role === 'presenter' ? `menti:${data.sessionId}:presenter` : `menti:${data.sessionId}`
    void client.join(room)
  }

  @SubscribeMessage('menti:session:leave')
  handleMentiLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; role: 'presenter' | 'audience' },
  ) {
    const room =
      data.role === 'presenter' ? `menti:${data.sessionId}:presenter` : `menti:${data.sessionId}`
    void client.leave(room)
  }

  private saveVisit(boardId: string, username: string, startTime: Date): void {
    const durationSeconds = Math.round((Date.now() - startTime.getTime()) / 1000)
    if (durationSeconds > MIN_VISIT_SECONDS) {
      this.visits
        .save(this.visits.create({ id: uuid(), boardId, username, durationSeconds }))
        .catch(() => {})
    }
  }

  private clearSocketState(socketId: string): void {
    this.socketBoardMap.delete(socketId)
    this.socketUserMap.delete(socketId)
    this.socketStartTime.delete(socketId)
  }

  private emitRoomInfo(boardId: string): void {
    const room = this.server.sockets.adapter.rooms.get(`board:${boardId}`)
    const count = room?.size ?? 0
    this.server.to(`board:${boardId}`).emit('room:count', count)

    const users: string[] = []
    room?.forEach((socketId) => {
      const username = this.socketUserMap.get(socketId)
      if (username) users.push(username)
    })
    this.server.to(`board:${boardId}`).emit('room:users', users)
  }
}
