import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

export enum SlideType {
  MULTIPLE_CHOICE = 'multiple_choice',
  WORD_CLOUD = 'word_cloud',
  OPEN_TEXT = 'open_text',
  SCALE = 'scale',
  RANKING = 'ranking',
  QA = 'qa',
}

@Schema({ collection: 'menti_slides', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class MentiSlide {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  presentationId: string

  @Prop({ default: 0 })
  order: number

  @Prop({ type: String, required: true })
  type: SlideType

  @Prop({ default: '' })
  question: string

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  config: Record<string, unknown>

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type MentiSlideDocument = HydratedDocument<MentiSlide>
export const MentiSlideSchema = SchemaFactory.createForClass(MentiSlide)
MentiSlideSchema.index({ presentationId: 1 })
