import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'poll_options', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class PollOption {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  postId: string

  @Prop({ required: true })
  optionText: string

  @Prop({ default: 0 })
  sortOrder: number
}

export type PollOptionDocument = HydratedDocument<PollOption>
export const PollOptionSchema = SchemaFactory.createForClass(PollOption)
PollOptionSchema.index({ postId: 1 })
