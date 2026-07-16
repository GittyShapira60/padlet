import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'post_likes', toJSON: { virtuals: true }, toObject: { virtuals: true }, versionKey: false })
export class PostLike {
  @Prop({ type: String })
  _id: string

  @Prop({ required: true })
  postId: string

  @Prop({ required: true })
  username: string
}

export type PostLikeDocument = HydratedDocument<PostLike>
export const PostLikeSchema = SchemaFactory.createForClass(PostLike)
PostLikeSchema.index({ postId: 1, username: 1 }, { unique: true })
