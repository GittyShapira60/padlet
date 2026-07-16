import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'board_visits', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class BoardVisit {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  boardId: string

  @Prop({ required: true })
  username: string

  @Prop({ default: () => new Date() })
  visitedAt: Date

  @Prop({ default: 0 })
  durationSeconds: number
}

export type BoardVisitDocument = HydratedDocument<BoardVisit>
export const BoardVisitSchema = SchemaFactory.createForClass(BoardVisit)
BoardVisitSchema.index({ boardId: 1 })
