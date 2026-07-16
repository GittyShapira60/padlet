import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'comments', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class Comment {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  postId: string

  @Prop({ required: true })
  content: string

  @Prop({ default: 'אנונימי' })
  author: string

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type CommentDocument = HydratedDocument<Comment>
export const CommentSchema = SchemaFactory.createForClass(Comment)
CommentSchema.index({ postId: 1 })
