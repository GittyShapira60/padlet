import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'menti_sessions', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class MentiSession {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  presentationId: string

  @Prop({ default: 0 })
  currentSlideIndex: number

  @Prop({ default: true })
  isActive: boolean

  @Prop({ default: true })
  isVotingOpen: boolean

  @Prop({ default: true })
  resultsVisible: boolean

  @Prop({ default: false })
  selfPaced: boolean

  @Prop({ default: () => new Date() })
  startedAt: Date

  @Prop({ type: Date, default: null })
  endedAt: Date | null
}

export type MentiSessionDocument = HydratedDocument<MentiSession>
export const MentiSessionSchema = SchemaFactory.createForClass(MentiSession)
MentiSessionSchema.index({ presentationId: 1 })
