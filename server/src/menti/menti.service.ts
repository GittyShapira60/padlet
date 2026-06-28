import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import {
  MentiPresentation,
  MentiResponse,
  MentiSession,
  MentiSlide,
  SlideType,
} from './entities'
import { EventsGateway } from '../gateway/events.gateway'
import { CreatePresentationDto, UpdatePresentationDto } from './dto/create-presentation.dto'
import { CreateSlideDto, UpdateSlideDto } from './dto/create-slide.dto'
import { SubmitResponseDto } from './dto/submit-response.dto'
import { UpdateSessionDto } from './dto/update-session.dto'

@Injectable()
export class MentiService {
  constructor(
    @InjectRepository(MentiPresentation) private presentations: Repository<MentiPresentation>,
    @InjectRepository(MentiSlide) private slides: Repository<MentiSlide>,
    @InjectRepository(MentiSession) private sessions: Repository<MentiSession>,
    @InjectRepository(MentiResponse) private responses: Repository<MentiResponse>,
    private gateway: EventsGateway,
  ) {}

  // ─── Presentations ────────────────────────────────────────────────────────────

  async findAll(owner: string) {
    const list = await this.presentations.find({
      where: { owner },
      order: { updatedAt: 'DESC' },
    })
    const ids = list.map((p) => p.id)
    if (!ids.length) return []

    const slideCounts = await this.slides
      .createQueryBuilder('s')
      .select('s.presentationId', 'presentationId')
      .addSelect('COUNT(s.id)', 'count')
      .where('s.presentationId IN (:...ids)', { ids })
      .groupBy('s.presentationId')
      .getRawMany<{ presentationId: string; count: string }>()

    const countMap = new Map(slideCounts.map((r) => [r.presentationId, parseInt(r.count) || 0]))

    return list.map((p) => ({ ...p, slideCount: countMap.get(p.id) ?? 0 }))
  }

  async create(dto: CreatePresentationDto, owner: string) {
    const joinCode = await this.generateUniqueCode()
    const presentation = this.presentations.create({ id: uuid(), owner, joinCode, ...dto })
    return this.presentations.save(presentation)
  }

  async findOne(id: string, owner: string) {
    const presentation = await this.presentations.findOne({
      where: { id, owner },
      relations: { slides: true },
      order: { slides: { order: 'ASC' } },
    })
    if (!presentation) throw new NotFoundException()
    return presentation
  }

  async update(id: string, dto: UpdatePresentationDto, owner: string) {
    const presentation = await this.findOne(id, owner)
    Object.assign(presentation, dto)
    return this.presentations.save(presentation)
  }

  async remove(id: string, owner: string) {
    await this.findOne(id, owner)
    // Delete sessions first (responses cascade via onDelete:CASCADE on session FK)
    await this.sessions.delete({ presentationId: id })
    // Delete presentation (slides cascade via onDelete:CASCADE on presentation FK)
    await this.presentations.delete({ id })
  }

  // ─── Slides ───────────────────────────────────────────────────────────────────

  async addSlide(presentationId: string, dto: CreateSlideDto, owner: string) {
    await this.findOne(presentationId, owner)
    const existing = await this.slides.find({
      where: { presentationId },
      order: { order: 'ASC' },
    })
    const insertAt = dto.insertAtIndex !== undefined
      ? Math.min(dto.insertAtIndex, existing.length)
      : existing.length

    if (insertAt < existing.length) {
      await Promise.all(
        existing.slice(insertAt).map((s) => this.slides.update(s.id, { order: s.order + 1 })),
      )
    }

    const slide = this.slides.create({
      id: uuid(),
      presentationId,
      order: insertAt,
      type: dto.type,
      question: dto.question ?? '',
      config: dto.config ?? this.defaultConfig(dto.type),
    })
    return this.slides.save(slide)
  }

  async updateSlide(presentationId: string, slideId: string, dto: UpdateSlideDto, owner: string) {
    await this.findOne(presentationId, owner)
    const slide = await this.slides.findOne({ where: { id: slideId, presentationId } })
    if (!slide) throw new NotFoundException()
    Object.assign(slide, dto)
    return this.slides.save(slide)
  }

  async removeSlide(presentationId: string, slideId: string, owner: string) {
    await this.findOne(presentationId, owner)
    const slide = await this.slides.findOne({ where: { id: slideId, presentationId } })
    if (!slide) throw new NotFoundException()
    await this.slides.remove(slide)
    const remaining = await this.slides.find({
      where: { presentationId },
      order: { order: 'ASC' },
    })
    await Promise.all(remaining.map((s, i) => this.slides.update(s.id, { order: i })))
  }

  async reorderSlides(presentationId: string, slideIds: string[], owner: string) {
    await this.findOne(presentationId, owner)
    await Promise.all(
      slideIds.map((id, index) => this.slides.update({ id, presentationId }, { order: index })),
    )
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────────

  async startSession(presentationId: string, owner: string, selfPaced = false) {
    await this.findOne(presentationId, owner)
    await this.sessions.update(
      { presentationId, isActive: true },
      { isActive: false, endedAt: new Date() },
    )
    const session = this.sessions.create({
      id: uuid(),
      presentationId,
      currentSlideIndex: 0,
      isActive: true,
      selfPaced,
      endedAt: null,
    })
    return this.sessions.save(session)
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto, owner: string) {
    const session = await this.sessions.findOne({
      where: { id: sessionId },
      relations: { presentation: true },
    })
    if (!session) throw new NotFoundException()
    if (session.presentation.owner !== owner) throw new ForbiddenException()

    Object.assign(session, dto)
    if (dto.isActive === false) session.endedAt = new Date()

    const saved = await this.sessions.save(session)

    if (dto.currentSlideIndex !== undefined) {
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:slide:change', {
        slideIndex: dto.currentSlideIndex,
      })
    }
    if (dto.isActive === false) {
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:session:end', {})
    }
    if (dto.isVotingOpen !== undefined) {
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:voting:state', {
        isVotingOpen: dto.isVotingOpen,
      })
    }
    if (dto.resultsVisible !== undefined) {
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:visibility', {
        resultsVisible: dto.resultsVisible,
      })
    }

    return saved
  }

  async resetSlideResults(sessionId: string, slideId: string, owner: string) {
    const session = await this.sessions.findOne({
      where: { id: sessionId },
      relations: { presentation: true },
    })
    if (!session) throw new NotFoundException()
    if (session.presentation.owner !== owner) throw new ForbiddenException()

    await this.responses.delete({ sessionId, slideId })

    const slide = await this.slides.findOne({ where: { id: slideId } })
    if (slide) {
      const payload = { slideId, results: this.emptyResults(slide.type) }
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:update', payload)
      this.gateway.emitToRoom(`menti:${sessionId}:presenter`, 'menti:results:update', payload)
    }
  }

  async markAnswered(sessionId: string, responseId: string, isAnswered: boolean, owner: string) {
    const session = await this.sessions.findOne({
      where: { id: sessionId },
      relations: { presentation: true },
    })
    if (!session) throw new NotFoundException()
    if (session.presentation.owner !== owner) throw new ForbiddenException()

    const response = await this.responses.findOne({ where: { id: responseId, sessionId } })
    if (!response) throw new NotFoundException()

    response.isAnswered = isAnswered
    await this.responses.save(response)

    const slide = await this.slides.findOne({ where: { id: response.slideId } })
    if (slide) {
      const slideResponses = await this.responses.find({ where: { sessionId, slideId: response.slideId } })
      const payload = { slideId: response.slideId, results: this.aggregateResults(slide, slideResponses) }
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:update', payload)
      this.gateway.emitToRoom(`menti:${sessionId}:presenter`, 'menti:results:update', payload)
    }
  }

  async getResults(sessionId: string) {
    const session = await this.sessions.findOne({
      where: { id: sessionId },
      relations: { presentation: { slides: true } },
    })
    if (!session) throw new NotFoundException()

    const allResponses = await this.responses.find({ where: { sessionId } })
    const slides = (session.presentation.slides ?? []).sort((a, b) => a.order - b.order)

    return {
      session: {
        id: session.id,
        presentationId: session.presentationId,
        currentSlideIndex: session.currentSlideIndex,
        isActive: session.isActive,
        isVotingOpen: session.isVotingOpen,
        resultsVisible: session.resultsVisible,
        selfPaced: session.selfPaced,
      },
      slides: slides.map((slide) => ({
        slideId: slide.id,
        type: slide.type,
        question: slide.question,
        config: slide.config,
        results: this.aggregateResults(
          slide,
          allResponses.filter((r) => r.slideId === slide.id),
        ),
      })),
    }
  }

  // ─── Public ───────────────────────────────────────────────────────────────────

  async findByCode(code: string) {
    const presentation = await this.presentations.findOne({
      where: { joinCode: code },
      relations: { slides: true },
      order: { slides: { order: 'ASC' } },
    })
    if (!presentation) throw new NotFoundException('קוד לא נמצא')

    const session = await this.sessions.findOne({
      where: { presentationId: presentation.id, isActive: true },
      order: { startedAt: 'DESC' },
    })

    return { presentation, session: session ?? null }
  }

  async submitResponse(sessionId: string, dto: SubmitResponseDto, respondent: string | null) {
    const session = await this.sessions.findOne({
      where: { id: sessionId },
      relations: { presentation: true },
    })
    if (!session || !session.isActive) throw new BadRequestException('הסשן לא פעיל')
    if (!session.isVotingOpen) throw new BadRequestException('ההצבעה סגורה כרגע')

    const actualRespondent = session.presentation.anonymousMode ? null : respondent

    // Prevent duplicate votes for choice/scale/ranking slide types
    const slide = await this.slides.findOne({ where: { id: dto.slideId } })
    const noRepeatTypes: string[] = [SlideType.MULTIPLE_CHOICE, SlideType.SCALE, SlideType.RANKING]
    if (actualRespondent && slide && noRepeatTypes.includes(slide.type)) {
      const existing = await this.responses.findOne({
        where: { sessionId, slideId: dto.slideId, respondent: actualRespondent },
      })
      if (existing) throw new BadRequestException('כבר הצבעת בשאלה זו')
    }

    const response = this.responses.create({
      id: uuid(),
      sessionId,
      slideId: dto.slideId,
      respondent: actualRespondent,
      answer: dto.answer,
    })
    await this.responses.save(response)

    if (slide) {
      const slideResponses = await this.responses.find({
        where: { sessionId, slideId: dto.slideId },
      })
      const payload = { slideId: dto.slideId, results: this.aggregateResults(slide, slideResponses) }
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:update', payload)
      this.gateway.emitToRoom(`menti:${sessionId}:presenter`, 'menti:results:update', payload)
    }
  }

  // ─── Aggregation ──────────────────────────────────────────────────────────────

  private aggregateResults(slide: MentiSlide, responses: MentiResponse[]): unknown {
    if (!responses.length) return this.emptyResults(slide.type)

    switch (slide.type) {
      case SlideType.MULTIPLE_CHOICE: {
        const tally: Record<string, number> = {}
        for (const r of responses) {
          const selected = (r.answer as { selected: string[] }).selected ?? []
          for (const opt of selected) tally[opt] = (tally[opt] ?? 0) + 1
        }
        return { tally, total: responses.length }
      }
      case SlideType.WORD_CLOUD: {
        const words: Record<string, number> = {}
        for (const r of responses) {
          const ws = (r.answer as { words: string[] }).words ?? []
          for (const w of ws) {
            const key = w.toLowerCase().trim()
            if (key) words[key] = (words[key] ?? 0) + 1
          }
        }
        return { words, total: responses.length }
      }
      case SlideType.OPEN_TEXT:
        return {
          texts: responses.map((r) => (r.answer as { text: string }).text),
          total: responses.length,
        }
      case SlideType.SCALE: {
        const values = responses.map((r) => (r.answer as { value: number }).value)
        const average = values.reduce((s, v) => s + v, 0) / values.length
        const distribution: Record<number, number> = {}
        for (const v of values) distribution[v] = (distribution[v] ?? 0) + 1
        return { average: Math.round(average * 10) / 10, distribution, total: responses.length }
      }
      case SlideType.RANKING: {
        const config = slide.config as { items?: string[] }
        const items = config.items ?? []
        const scores: Record<string, number> = {}
        items.forEach((item) => { scores[item] = 0 })
        for (const r of responses) {
          const order = (r.answer as { order: string[] }).order ?? []
          order.forEach((item, i) => {
            scores[item] = (scores[item] ?? 0) + (order.length - i)
          })
        }
        const ranked = Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .map(([item, score], i) => ({ item, score, rank: i + 1 }))
        return { ranked, total: responses.length }
      }
      case SlideType.QA:
        return {
          questions: responses.map((r) => ({
            id: r.id,
            question: (r.answer as { question: string }).question,
            createdAt: r.createdAt,
            isAnswered: r.isAnswered,
          })),
          total: responses.length,
        }
      default:
        return { total: responses.length }
    }
  }

  private emptyResults(type: SlideType): unknown {
    switch (type) {
      case SlideType.MULTIPLE_CHOICE: return { tally: {}, total: 0 }
      case SlideType.WORD_CLOUD: return { words: {}, total: 0 }
      case SlideType.OPEN_TEXT: return { texts: [], total: 0 }
      case SlideType.SCALE: return { average: 0, distribution: {}, total: 0 }
      case SlideType.RANKING: return { ranked: [], total: 0 }
      case SlideType.QA: return { questions: [], total: 0 }
    }
  }

  private defaultConfig(type: SlideType): Record<string, unknown> {
    switch (type) {
      case SlideType.MULTIPLE_CHOICE: return { options: ['אפשרות א', 'אפשרות ב'], allowMultiple: false }
      case SlideType.SCALE: return { min: 1, max: 10, minLabel: 'נמוך', maxLabel: 'גבוה' }
      case SlideType.RANKING: return { items: ['פריט 1', 'פריט 2', 'פריט 3'] }
      default: return {}
    }
  }

  private async generateUniqueCode(): Promise<string> {
    let code: string
    let exists = true
    do {
      code = Math.floor(10000000 + Math.random() * 90000000).toString()
      exists = !!(await this.presentations.findOne({ where: { joinCode: code } }))
    } while (exists)
    return code
  }
}
