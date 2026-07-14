import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'poll_votes', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class PollVote {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  postId: string

  @Prop({ required: true })
  optionId: string

  @Prop({ required: true })
  username: string

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type PollVoteDocument = HydratedDocument<PollVote>
export const PollVoteSchema = SchemaFactory.createForClass(PollVote)
PollVoteSchema.index({ postId: 1, username: 1 }, { unique: true })
