import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Board, BoardMember, Comment, Notification, PollOption, PollVote, Post, PostLike, PostReaction } from '../../entities'
import { GatewayModule } from '../../gateway/gateway.module'
import { BoardPostsController, PostsController } from './posts.controller'
import { PostsService } from './posts.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Post, Comment, BoardMember, Notification, PostLike, PostReaction, PollOption, PollVote, Board,
    ]),
    GatewayModule,
  ],
  providers: [PostsService],
  controllers: [BoardPostsController, PostsController],
  exports: [PostsService],
})
export class PostsModule {}
