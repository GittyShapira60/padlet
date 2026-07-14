import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import {
  Board, BoardSchema,
  BoardMember, BoardMemberSchema,
  Comment, CommentSchema,
  Notification, NotificationSchema,
  PollOption, PollOptionSchema,
  PollVote, PollVoteSchema,
  Post, PostSchema,
  PostLike, PostLikeSchema,
  PostReaction, PostReactionSchema,
} from '../../entities'
import { GatewayModule } from '../../gateway/gateway.module'
import { BoardPostsController, PostsController } from './posts.controller'
import { PostsService } from './posts.service'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Post.name, schema: PostSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: BoardMember.name, schema: BoardMemberSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: PostLike.name, schema: PostLikeSchema },
      { name: PostReaction.name, schema: PostReactionSchema },
      { name: PollOption.name, schema: PollOptionSchema },
      { name: PollVote.name, schema: PollVoteSchema },
      { name: Board.name, schema: BoardSchema },
    ]),
    GatewayModule,
  ],
  providers: [PostsService],
  controllers: [BoardPostsController, PostsController],
  exports: [PostsService],
})
export class PostsModule {}
