import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { TypeOrmModule } from '@nestjs/typeorm'
import { join } from 'node:path'
import { AuthModule } from './auth/auth.module'
import { BoardsModule } from './padlet/boards/boards.module'
import {
  Board,
  BoardMember,
  BoardVisit,
  Comment,
  Notification,
  PollOption,
  PollVote,
  Post,
  PostLike,
  PostReaction,
  User,
} from './entities'
import { MentiPresentation, MentiResponse, MentiSession, MentiSlide } from './menti/entities'
import { GatewayModule } from './gateway/gateway.module'
import { MentiModule } from './menti/menti.module'
import { NotificationsModule } from './padlet/notifications/notifications.module'
import { PostsModule } from './padlet/posts/posts.module'
import { UploadsModule } from './padlet/uploads/uploads.module'
import { UsersModule } from './users/users.module'

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [
        User, Board, BoardMember, BoardVisit,
        Post, PollOption, PollVote, PostLike, PostReaction, Comment, Notification,
        MentiPresentation, MentiSlide, MentiSession, MentiResponse,
      ],
      synchronize: true,
      ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    AuthModule,
    BoardsModule,
    PostsModule,
    NotificationsModule,
    GatewayModule,
    MentiModule,
    UsersModule,
    UploadsModule,
  ],
})
export class AppModule {}
