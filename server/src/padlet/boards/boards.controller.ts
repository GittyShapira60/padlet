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
import { BoardRole } from '../../common/enums'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { User } from '../../entities'
import { BoardsService } from './boards.service'
import { CreateBoardDto } from './dto/create-board.dto'
import { DuplicateBoardDto } from './dto/duplicate-board.dto'
import { UpdateBoardDto } from './dto/update-board.dto'

@Controller('api/boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private boards: BoardsService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.boards.findAll(user.username)
  }

  @Post()
  create(@Body() dto: CreateBoardDto, @CurrentUser() user: User) {
    return this.boards.create(dto, user.username)
  }

  @Get('stats')
  getStats(@CurrentUser() user: User) {
    return this.boards.getStats(user.username)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.boards.findOne(id, user.username)
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBoardDto, @CurrentUser() user: User) {
    return this.boards.update(id, dto, user.username)
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.boards.remove(id, user.username)
  }

  @Post(':id/duplicate')
  duplicate(
    @Param('id') id: string,
    @Body() body: DuplicateBoardDto,
    @CurrentUser() user: User,
  ) {
    return this.boards.duplicate(
      id, user.username, body.title,
      body.posts_option ?? 'all',
      body.password_option ?? 'none',
      body.members_option ?? 'none',
      body.custom_password,
    )
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @CurrentUser() user: User) {
    return this.boards.resetPassword(id, user.username)
  }

  @Get(':id/board-stats')
  getBoardStats(@Param('id') id: string, @CurrentUser() user: User) {
    return this.boards.getBoardStats(id, user.username)
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser() user: User) {
    return this.boards.getMembers(id, user.username)
  }

  @Post(':id/members')
  addMember(
    @Param('id') boardId: string,
    @Body() body: { username: string; role: BoardRole },
    @CurrentUser() user: User,
  ) {
    return this.boards.addMember(boardId, body.username, body.role, user.username)
  }

  @Delete(':id/members/:username')
  @HttpCode(204)
  removeMember(
    @Param('id') boardId: string,
    @Param('username') targetUsername: string,
    @CurrentUser() user: User,
  ) {
    return this.boards.removeMember(boardId, targetUsername, user.username)
  }
}
