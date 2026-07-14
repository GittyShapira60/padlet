import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'
import { PostType } from '../common/enums'

@Schema({ collection: 'posts', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class Post {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  boardId: string

  @Prop({ type: String, default: PostType.TEXT })
  type: PostType

  @Prop({ default: '' })
  content: string

  @Prop({ default: 'אנונימי' })
  author: string

  @Prop({ default: '#fef08a' })
  color: string

  @Prop({ default: 100 })
  x: number

  @Prop({ default: 100 })
  y: number

  @Prop({ default: 220 })
  width: number

  @Prop({ default: 0 })
  likes: number

  @Prop({ default: '' })
  imageUrl: string

  @Prop({ default: '' })
  linkUrl: string

  @Prop({ default: '' })
  linkTitle: string

  @Prop({ default: '' })
  linkDescription: string

  @Prop({ default: '' })
  linkImage: string

  @Prop({ default: '' })
  editedBy: string

  @Prop({ default: 'rect' })
  shape: string

  @Prop({ default: () => new Date() })
  updatedAt: Date

  @Prop({ default: () => new Date() })
  createdAt: Date
}

export type PostDocument = HydratedDocument<Post>
export const PostSchema = SchemaFactory.createForClass(Post)
PostSchema.index({ boardId: 1 })
