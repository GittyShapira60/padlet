import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { User } from '../../entities'
import { CreatePostDto } from './dto/create-post.dto'
import { PostsService } from './posts.service'

/** Routes for creating + listing posts within a board */
@Controller('api/boards/:boardId/posts')
@UseGuards(JwtAuthGuard)
export class BoardPostsController {
  constructor(private posts: PostsService) {}

  @Get()
  findAll(@Param('boardId') boardId: string, @CurrentUser() user: User) {
    return this.posts.findAll(boardId, user.username)
  }

  @Post()
  create(
    @Param('boardId') boardId: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: User,
  ) {
    return this.posts.create(boardId, dto, user.username)
  }
}

/** Routes for individual post operations (no boardId needed — looked up internally) */
@Controller('api/posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private posts: PostsService) {}

  @Put(':postId')
  update(
    @Param('postId') postId: string,
    @Body() dto: import('./dto/update-post.dto').UpdatePostDto,
    @CurrentUser() user: User,
  ) {
    return this.posts.update(postId, dto, user.username)
  }

  @Delete(':postId')
  @HttpCode(204)
  remove(@Param('postId') postId: string, @CurrentUser() user: User) {
    return this.posts.remove(postId, user.username)
  }

  @Get(':postId/comments')
  getComments(@Param('postId') postId: string, @CurrentUser() user: User) {
    return this.posts.getComments(postId, user.username)
  }

  @Post(':postId/comments')
  addComment(
    @Param('postId') postId: string,
    @Body() body: { content: string },
    @CurrentUser() user: User,
  ) {
    return this.posts.addComment(postId, body.content, user.username)
  }

  @Post(':postId/like')
  like(@Param('postId') postId: string, @CurrentUser() user: User) {
    return this.posts.toggleLike(postId, user.username)
  }

  @Post(':postId/react')
  react(
    @Param('postId') postId: string,
    @Body() body: { emoji: string },
    @CurrentUser() user: User,
  ) {
    return this.posts.react(postId, user.username, body.emoji)
  }

  @Post(':postId/vote')
  vote(
    @Param('postId') postId: string,
    @Body() body: { option_id: string },
    @CurrentUser() user: User,
  ) {
    return this.posts.vote(postId, body.option_id, user.username)
  }
}
