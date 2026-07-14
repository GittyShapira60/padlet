import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  Board, BoardSchema,
  BoardMember, BoardMemberSchema,
  BoardVisit, BoardVisitSchema,
  Comment, CommentSchema,
  Notification, NotificationSchema,
  PollOption, PollOptionSchema,
  PollVote, PollVoteSchema,
  Post, PostSchema,
  PostLike, PostLikeSchema,
  PostReaction, PostReactionSchema,
} from '../../entities'
import { GatewayModule } from '../../gateway/gateway.module'
import { BoardsController } from './boards.controller'
import { BoardsService } from './boards.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Board.name, schema: BoardSchema },
      { name: BoardMember.name, schema: BoardMemberSchema },
      { name: BoardVisit.name, schema: BoardVisitSchema },
      { name: Post.name, schema: PostSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: PollOption.name, schema: PollOptionSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: PostLike.name, schema: PostLikeSchema },
      { name: PostReaction.name, schema: PostReactionSchema },
      { name: PollVote.name, schema: PollVoteSchema },
    ]),
    GatewayModule,
  ],
  providers: [BoardsService],
  controllers: [BoardsController],
  exports: [BoardsService],
})
export class BoardsModule {}
