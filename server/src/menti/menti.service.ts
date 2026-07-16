import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { v4 as uuid } from 'uuid'
import {
  MentiPresentation,
  MentiPresentationDocument,
  MentiResponse,
  MentiResponseDocument,
  MentiSession,
  MentiSessionDocument,
  MentiSlide,
  MentiSlideDocument,
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
    @InjectModel(MentiPresentation.name) private presentations: Model<MentiPresentationDocument>,
    @InjectModel(MentiSlide.name) private slides: Model<MentiSlideDocument>,
    @InjectModel(MentiSession.name) private sessions: Model<MentiSessionDocument>,
    @InjectModel(MentiResponse.name) private responses: Model<MentiResponseDocument>,
    private gateway: EventsGateway,
  ) {}

  // ─── Presentations ────────────────────────────────────────────────────────────

  async findAll(owner: string) {
    const list = await this.presentations.find({ owner }).sort({ updatedAt: -1 })
    const ids = list.map((p) => p.id)
    if (!ids.length) return []

    const slideCounts = await this.slides.aggregate([
      { $match: { presentationId: { $in: ids } } },
      { $group: { _id: '$presentationId', count: { $sum: 1 } } },
    ])

    const countMap = new Map(slideCounts.map((r) => [r._id, r.count || 0]))

    return list.map((p) => ({ ...p.toObject(), slideCount: countMap.get(p.id) ?? 0 }))
  }

  async create(dto: CreatePresentationDto, owner: string) {
    const joinCode = await this.generateUniqueCode()
    return this.presentations.create({ _id: uuid(), owner, joinCode, ...dto })
  }

  async findOne(id: string, owner: string) {
    const presentation = await this.presentations.findOne({ _id: id, owner })
    if (!presentation) throw new NotFoundException()
    const slides = await this.slides.find({ presentationId: id }).sort({ order: 1 })
    return { ...presentation.toObject(), slides }
  }

  async update(id: string, dto: UpdatePresentationDto, owner: string) {
    const presentation = await this.presentations.findOne({ _id: id, owner })
    if (!presentation) throw new NotFoundException()
    Object.assign(presentation, dto)
    return presentation.save()
  }

  async remove(id: string, owner: string) {
    await this.findOne(id, owner)

    const [sessions, slides] = await Promise.all([
      this.sessions.find({ presentationId: id }),
      this.slides.find({ presentationId: id }),
    ])
    const sessionIds = sessions.map((s) => s.id)
    const slideIds = slides.map((s) => s.id)

    await this.responses.deleteMany({
      $or: [{ sessionId: { $in: sessionIds } }, { slideId: { $in: slideIds } }],
    })
    await this.sessions.deleteMany({ presentationId: id })
    await this.slides.deleteMany({ presentationId: id })
    await this.presentations.deleteOne({ _id: id })
  }

  // ─── Slides ───────────────────────────────────────────────────────────────────

  async addSlide(presentationId: string, dto: CreateSlideDto, owner: string) {
    await this.findOne(presentationId, owner)
    const existing = await this.slides.find({ presentationId }).sort({ order: 1 })
    const insertAt = dto.insertAtIndex !== undefined
      ? Math.min(dto.insertAtIndex, existing.length)
      : existing.length

    if (insertAt < existing.length) {
      await Promise.all(
        existing.slice(insertAt).map((s) => this.slides.updateOne({ _id: s.id }, { $set: { order: s.order + 1 } })),
      )
    }

    return this.slides.create({
      _id: uuid(),
      presentationId,
      order: insertAt,
      type: dto.type,
      question: dto.question ?? '',
      config: dto.config ?? this.defaultConfig(dto.type),
    })
  }

  async updateSlide(presentationId: string, slideId: string, dto: UpdateSlideDto, owner: string) {
    await this.findOne(presentationId, owner)
    const slide = await this.slides.findOne({ _id: slideId, presentationId })
    if (!slide) throw new NotFoundException()
    Object.assign(slide, dto)
    return slide.save()
  }

  async removeSlide(presentationId: string, slideId: string, owner: string) {
    await this.findOne(presentationId, owner)
    const slide = await this.slides.findOne({ _id: slideId, presentationId })
    if (!slide) throw new NotFoundException()
    await this.responses.deleteMany({ slideId })
    await this.slides.deleteOne({ _id: slideId })
    const remaining = await this.slides.find({ presentationId }).sort({ order: 1 })
    await Promise.all(remaining.map((s, i) => this.slides.updateOne({ _id: s.id }, { $set: { order: i } })))
  }

  async reorderSlides(presentationId: string, slideIds: string[], owner: string) {
    await this.findOne(presentationId, owner)
    await Promise.all(
      slideIds.map((id, index) => this.slides.updateOne({ _id: id, presentationId }, { $set: { order: index } })),
    )
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────────

  async startSession(presentationId: string, owner: string, selfPaced = false) {
    await this.findOne(presentationId, owner)
    await this.sessions.updateMany(
      { presentationId, isActive: true },
      { $set: { isActive: false, endedAt: new Date() } },
    )
    return this.sessions.create({
      _id: uuid(),
      presentationId,
      currentSlideIndex: 0,
      isActive: true,
      selfPaced,
      endedAt: null,
    })
  }

  async updateSession(sessionId: string, dto: UpdateSessionDto, owner: string) {
    const session = await this.sessions.findOne({ _id: sessionId })
    if (!session) throw new NotFoundException()
    const presentation = await this.presentations.findOne({ _id: session.presentationId })
    if (!presentation || presentation.owner !== owner) throw new ForbiddenException()

    Object.assign(session, dto)
    if (dto.isActive === false) session.endedAt = new Date()

    const saved = await session.save()

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
    const session = await this.sessions.findOne({ _id: sessionId })
    if (!session) throw new NotFoundException()
    const presentation = await this.presentations.findOne({ _id: session.presentationId })
    if (!presentation || presentation.owner !== owner) throw new ForbiddenException()

    await this.responses.deleteMany({ sessionId, slideId })

    const slide = await this.slides.findOne({ _id: slideId })
    if (slide) {
      const payload = { slideId, results: this.emptyResults(slide.type) }
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:update', payload)
      this.gateway.emitToRoom(`menti:${sessionId}:presenter`, 'menti:results:update', payload)
    }
  }

  async markAnswered(sessionId: string, responseId: string, isAnswered: boolean, owner: string) {
    const session = await this.sessions.findOne({ _id: sessionId })
    if (!session) throw new NotFoundException()
    const presentation = await this.presentations.findOne({ _id: session.presentationId })
    if (!presentation || presentation.owner !== owner) throw new ForbiddenException()

    const response = await this.responses.findOne({ _id: responseId, sessionId })
    if (!response) throw new NotFoundException()

    response.isAnswered = isAnswered
    await response.save()

    const slide = await this.slides.findOne({ _id: response.slideId })
    if (slide) {
      const slideResponses = await this.responses.find({ sessionId, slideId: response.slideId })
      const payload = { slideId: response.slideId, results: this.aggregateResults(slide, slideResponses) }
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:update', payload)
      this.gateway.emitToRoom(`menti:${sessionId}:presenter`, 'menti:results:update', payload)
    }
  }

  async getResults(sessionId: string) {
    const session = await this.sessions.findOne({ _id: sessionId })
    if (!session) throw new NotFoundException()

    const presentation = await this.presentations.findOne({ _id: session.presentationId })
    const allResponses = await this.responses.find({ sessionId })
    const slides = presentation
      ? (await this.slides.find({ presentationId: presentation.id })).sort((a, b) => a.order - b.order)
      : []

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
    const presentation = await this.presentations.findOne({ joinCode: code })
    if (!presentation) throw new NotFoundException('קוד לא נמצא')

    const slides = await this.slides.find({ presentationId: presentation.id }).sort({ order: 1 })

    const session = await this.sessions
      .findOne({ presentationId: presentation.id, isActive: true })
      .sort({ startedAt: -1 })

    return { presentation: { ...presentation.toObject(), slides }, session: session ?? null }
  }

  async submitResponse(sessionId: string, dto: SubmitResponseDto, respondent: string | null) {
    const session = await this.sessions.findOne({ _id: sessionId })
    if (!session || !session.isActive) throw new BadRequestException('הסשן לא פעיל')
    if (!session.isVotingOpen) throw new BadRequestException('ההצבעה סגורה כרגע')

    const presentation = await this.presentations.findOne({ _id: session.presentationId })
    const actualRespondent = presentation?.anonymousMode ? null : respondent

    // Prevent duplicate votes for choice/scale/ranking slide types
    const slide = await this.slides.findOne({ _id: dto.slideId })
    const noRepeatTypes: string[] = [SlideType.MULTIPLE_CHOICE, SlideType.SCALE, SlideType.RANKING]
    if (actualRespondent && slide && noRepeatTypes.includes(slide.type)) {
      const existing = await this.responses.findOne({
        sessionId, slideId: dto.slideId, respondent: actualRespondent,
      })
      if (existing) throw new BadRequestException('כבר הצבעת בשאלה זו')
    }

    await this.responses.create({
      _id: uuid(),
      sessionId,
      slideId: dto.slideId,
      respondent: actualRespondent,
      answer: dto.answer,
    })

    if (slide) {
      const slideResponses = await this.responses.find({ sessionId, slideId: dto.slideId })
      const payload = { slideId: dto.slideId, results: this.aggregateResults(slide, slideResponses) }
      this.gateway.emitToRoom(`menti:${sessionId}`, 'menti:results:update', payload)
      this.gateway.emitToRoom(`menti:${sessionId}:presenter`, 'menti:results:update', payload)
    }
  }

  // ─── Aggregation ──────────────────────────────────────────────────────────────

  private aggregateResults(slide: MentiSlideDocument, responses: MentiResponseDocument[]): unknown {
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
      exists = !!(await this.presentations.findOne({ joinCode: code }))
    } while (exists)
    return code
  }
}
