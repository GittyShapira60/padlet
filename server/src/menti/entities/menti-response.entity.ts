import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

@Schema({ collection: 'menti_responses', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class MentiResponse {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  sessionId: string

  @Prop({ required: true })
  slideId: string

  @Prop({ type: String, default: null })
  respondent: string | null

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  answer: Record<string, unknown>

  @Prop({ default: false })
  isAnswered: boolean

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type MentiResponseDocument = HydratedDocument<MentiResponse>
export const MentiResponseSchema = SchemaFactory.createForClass(MentiResponse)
MentiResponseSchema.index({ sessionId: 1 })
MentiResponseSchema.index({ slideId: 1 })
