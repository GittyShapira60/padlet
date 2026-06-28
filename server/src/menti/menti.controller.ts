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
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { User } from '../entities'
import { CreatePresentationDto, UpdatePresentationDto } from './dto/create-presentation.dto'
import { CreateSlideDto, UpdateSlideDto } from './dto/create-slide.dto'
import { SubmitResponseDto } from './dto/submit-response.dto'
import { UpdateSessionDto } from './dto/update-session.dto'
import { MentiService } from './menti.service'

@Controller('api/menti')
export class MentiController {
  constructor(private menti: MentiService) {}

  // ─── Public endpoints (no auth) ───────────────────────────────────────────────

  @Get('join/:code')
  findByCode(@Param('code') code: string) {
    return this.menti.findByCode(code)
  }

  @Get('sessions/:sessionId/results')
  getResults(@Param('sessionId') sessionId: string) {
    return this.menti.getResults(sessionId)
  }

  @Post('sessions/:sessionId/respond')
  @HttpCode(204)
  respond(@Param('sessionId') sessionId: string, @Body() dto: SubmitResponseDto) {
    return this.menti.submitResponse(sessionId, dto, dto.respondent ?? null)
  }

  // ─── Authenticated endpoints ──────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@CurrentUser() user: User) {
    return this.menti.findAll(user.username)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreatePresentationDto, @CurrentUser() user: User) {
    return this.menti.create(dto, user.username)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.menti.findOne(id, user.username)
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() dto: UpdatePresentationDto, @CurrentUser() user: User) {
    return this.menti.update(id, dto, user.username)
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.menti.remove(id, user.username)
  }

  @Post(':id/slides')
  @UseGuards(JwtAuthGuard)
  addSlide(@Param('id') id: string, @Body() dto: CreateSlideDto, @CurrentUser() user: User) {
    return this.menti.addSlide(id, dto, user.username)
  }

  @Put(':id/slides/:slideId')
  @UseGuards(JwtAuthGuard)
  updateSlide(
    @Param('id') id: string,
    @Param('slideId') slideId: string,
    @Body() dto: UpdateSlideDto,
    @CurrentUser() user: User,
  ) {
    return this.menti.updateSlide(id, slideId, dto, user.username)
  }

  @Delete(':id/slides/:slideId')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  removeSlide(
    @Param('id') id: string,
    @Param('slideId') slideId: string,
    @CurrentUser() user: User,
  ) {
    return this.menti.removeSlide(id, slideId, user.username)
  }

  @Put(':id/reorder')
  @UseGuards(JwtAuthGuard)
  reorderSlides(
    @Param('id') id: string,
    @Body() body: { slideIds: string[] },
    @CurrentUser() user: User,
  ) {
    return this.menti.reorderSlides(id, body.slideIds, user.username)
  }

  @Post(':id/sessions')
  @UseGuards(JwtAuthGuard)
  startSession(
    @Param('id') id: string,
    @Body() body: { selfPaced?: boolean },
    @CurrentUser() user: User,
  ) {
    return this.menti.startSession(id, user.username, body.selfPaced ?? false)
  }

  @Put('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  updateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.menti.updateSession(sessionId, dto, user.username)
  }

  @Delete('sessions/:sessionId/slides/:slideId/results')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard)
  resetSlideResults(
    @Param('sessionId') sessionId: string,
    @Param('slideId') slideId: string,
    @CurrentUser() user: User,
  ) {
    return this.menti.resetSlideResults(sessionId, slideId, user.username)
  }

  @Put('sessions/:sessionId/responses/:responseId/answered')
  @UseGuards(JwtAuthGuard)
  markAnswered(
    @Param('sessionId') sessionId: string,
    @Param('responseId') responseId: string,
    @Body() body: { isAnswered: boolean },
    @CurrentUser() user: User,
  ) {
    return this.menti.markAnswered(sessionId, responseId, body.isAnswered, user.username)
  }
}
