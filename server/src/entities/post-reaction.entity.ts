import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

// One document per (postId, username, emoji) — one row per user per emoji type
@Schema({ collection: 'post_reactions', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class PostReaction {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  postId: string

  @Prop({ required: true })
  username: string

  @Prop({ required: true })
  emoji: string
}

export type PostReactionDocument = HydratedDocument<PostReaction>
export const PostReactionSchema = SchemaFactory.createForClass(PostReaction)
PostReactionSchema.index({ postId: 1, username: 1, emoji: 1 }, { unique: true })
